import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Callable, Optional
from app.config import settings
from app.utils.filenames import sanitize_filename, get_unique_filepath
from app.utils.ffmpeg import probe_media, run_ffmpeg_process
from app.db.repositories import (
    update_job_status,
    save_media,
)

def extract_audio_job(
    job_id: str,
    input_path: str,
    output_format: str = "mp3",
    bitrate: str = "192k",
    copy_codec_if_compatible: bool = False,
    progress_callback: Optional[Callable[[float], None]] = None,
    register_proc: Optional[Callable[[subprocess.Popen], None]] = None,
    is_cancelled: Optional[Callable[[], bool]] = None,
) -> None:
    """Extracts or converts audio from media file with FFmpeg."""
    src = Path(input_path).resolve()
    if not src.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    probe = probe_media(src)
    if not probe["has_audio"]:
        raise ValueError("Source media does not contain any audio stream.")

    total_duration = probe.get("duration", 0.0)
    update_job_status(job_id, status="processing", progress=0.0)

    # Determine output extension and codec
    fmt = output_format.lower().lstrip(".")
    if fmt not in ("mp3", "wav", "aac", "flac", "ogg", "m4a"):
        fmt = "mp3"

    # Build unique output path
    base_stem = src.stem
    target_filename = f"{base_stem}.{fmt}"
    out_path = get_unique_filepath(settings.MEDIA_DIR, target_filename)

    # Build FFmpeg command
    ffmpeg_args = ["-i", str(src), "-vn"]

    # Stream copy check
    src_audio = probe.get("audio") or {}
    src_codec = src_audio.get("codec_name", "").lower()

    if copy_codec_if_compatible and (
        (fmt == "mp3" and src_codec == "mp3") or
        (fmt == "aac" and src_codec == "aac") or
        (fmt == "flac" and src_codec == "flac") or
        (fmt == "ogg" and src_codec in ("vorbis", "opus"))
    ):
        ffmpeg_args.extend(["-c:a", "copy"])
    else:
        # Encode with specific codec and bitrate
        if fmt == "mp3":
            b_val = bitrate if bitrate.endswith("k") else f"{bitrate}k"
            ffmpeg_args.extend(["-c:a", "libmp3lame", "-b:a", b_val])
        elif fmt == "wav":
            ffmpeg_args.extend(["-c:a", "pcm_s16le"])
        elif fmt == "aac":
            b_val = bitrate if bitrate.endswith("k") else f"{bitrate}k"
            ffmpeg_args.extend(["-c:a", "aac", "-b:a", b_val])
        elif fmt == "flac":
            ffmpeg_args.extend(["-c:a", "flac"])
        elif fmt == "ogg":
            ffmpeg_args.extend(["-c:a", "libvorbis", "-q:a", "5"])

    ffmpeg_args.append(str(out_path))

    success, err_msg = run_ffmpeg_process(
        args=ffmpeg_args,
        total_duration=total_duration,
        progress_callback=progress_callback,
        register_proc=register_proc,
    )

    if is_cancelled and is_cancelled():
        if out_path.exists():
            out_path.unlink(missing_ok=True)
        update_job_status(job_id, status="cancelled", error="Cancelled by user")
        return

    if not success or not out_path.exists() or out_path.stat().st_size == 0:
        if out_path.exists():
            out_path.unlink(missing_ok=True)
        raise RuntimeError(f"Audio extraction failed: {err_msg}")

    # Probe resulting audio
    out_probe = probe_media(out_path)
    audio_info = out_probe.get("audio") or {}

    # Register into media library
    save_media(
        filename=out_path.name,
        filepath=str(out_path.resolve()),
        file_size=out_path.stat().st_size,
        duration=out_probe.get("duration", 0.0),
        format_name=fmt,
        media_type="audio",
        audio_codec=audio_info.get("codec_name"),
        source_job_id=job_id,
    )

    update_job_status(
        job_id=job_id,
        status="completed",
        progress=100.0,
        output_filename=out_path.name,
        output_path=str(out_path.resolve()),
        output_size=out_path.stat().st_size,
    )
