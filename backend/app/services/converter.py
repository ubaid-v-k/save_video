import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Callable, Optional, List
from app.config import settings
from app.utils.filenames import sanitize_filename, get_unique_filepath
from app.utils.ffmpeg import probe_media, run_ffmpeg_process
from app.services.thumbnail_generator import generate_video_thumbnail
from app.db.repositories import (
    update_job_status,
    save_media,
)

AUDIO_FORMATS = {"mp3", "wav", "aac", "flac", "ogg", "m4a"}
VIDEO_FORMATS = {"mp4", "webm", "mkv", "mov", "avi"}

def convert_media_job(
    job_id: str,
    input_path: str,
    output_format: str,
    custom_filename: Optional[str] = None,
    video_codec: Optional[str] = None, # "h264", "vp9", "copy"
    audio_codec: Optional[str] = None, # "aac", "mp3", "opus", "copy"
    resolution: Optional[str] = None,  # "1080", "720", "480", "original"
    audio_bitrate: Optional[str] = None, # "128k", "192k", "320k"
    crf: int = 23,
    progress_callback: Optional[Callable[[float], None]] = None,
    register_proc: Optional[Callable[[subprocess.Popen], None]] = None,
    is_cancelled: Optional[Callable[[], bool]] = None,
) -> None:
    """Converts media files between compatible formats and codecs."""
    src = Path(input_path).resolve()
    if not src.exists():
        raise FileNotFoundError(f"Source file not found: {input_path}")

    probe = probe_media(src)
    total_duration = probe.get("duration", 0.0)
    has_video = probe["has_video"]
    has_audio = probe["has_audio"]

    out_ext = output_format.lower().lstrip(".")
    is_target_audio = out_ext in AUDIO_FORMATS

    if not has_video and not has_audio:
        raise ValueError("File contains neither valid video nor audio streams.")

    if not has_audio and is_target_audio:
        raise ValueError("Cannot convert video without audio stream into an audio format.")

    update_job_status(job_id, status="processing", progress=0.0)

    # Determine output filename
    base_name = custom_filename or src.stem
    target_name = f"{base_name}.{out_ext}"
    out_path = get_unique_filepath(settings.MEDIA_DIR, target_name)

    ffmpeg_args = ["-i", str(src)]

    if is_target_audio:
        # Audio-only output
        ffmpeg_args.append("-vn")
        b_val = (audio_bitrate or "192k")
        if not b_val.endswith("k"):
            b_val = f"{b_val}k"

        if out_ext == "mp3":
            ffmpeg_args.extend(["-c:a", "libmp3lame", "-b:a", b_val])
        elif out_ext == "wav":
            ffmpeg_args.extend(["-c:a", "pcm_s16le"])
        elif out_ext == "aac":
            ffmpeg_args.extend(["-c:a", "aac", "-b:a", b_val])
        elif out_ext == "flac":
            ffmpeg_args.extend(["-c:a", "flac"])
        elif out_ext == "ogg":
            ffmpeg_args.extend(["-c:a", "libvorbis", "-q:a", "5"])
        else:
            ffmpeg_args.extend(["-c:a", "aac", "-b:a", b_val])
    else:
        # Video output
        vf_filters: List[str] = []
        if resolution and resolution not in ("original", "auto", ""):
            try:
                target_h = int(resolution.rstrip("p"))
                vf_filters.append(f"scale=-2:{target_h}")
            except ValueError:
                pass

        if vf_filters:
            ffmpeg_args.extend(["-vf", ",".join(vf_filters)])

        # Video codec
        v_cd = (video_codec or "").lower()
        if out_ext == "webm" or v_cd == "vp9":
            ffmpeg_args.extend(["-c:v", "libvpx-vp9", "-crf", str(crf + 8), "-b:v", "0"])
        elif v_cd == "copy":
            ffmpeg_args.extend(["-c:v", "copy"])
        else: # default h264
            ffmpeg_args.extend(["-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p"])

        # Audio codec
        a_cd = (audio_codec or "").lower()
        if not has_audio:
            pass
        elif a_cd == "copy":
            ffmpeg_args.extend(["-c:a", "copy"])
        elif out_ext == "webm":
            ffmpeg_args.extend(["-c:a", "libopus", "-b:a", "128k"])
        else:
            b_val = (audio_bitrate or "192k")
            if not b_val.endswith("k"):
                b_val = f"{b_val}k"
            ffmpeg_args.extend(["-c:a", "aac", "-b:a", b_val])

        if out_ext == "mp4":
            ffmpeg_args.extend(["-movflags", "+faststart"])

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
        raise RuntimeError(f"Format conversion failed: {err_msg}")

    # Probe resulting media
    out_probe = probe_media(out_path)
    mtype = "audio" if is_target_audio else ("video" if out_probe["has_video"] else "audio")
    vinfo = out_probe.get("video") or {}
    ainfo = out_probe.get("audio") or {}

    thumb = None
    if mtype == "video":
        thumb = generate_video_thumbnail(out_path, duration=out_probe.get("duration", 0.0))

    # Save to media library
    save_media(
        filename=out_path.name,
        filepath=str(out_path.resolve()),
        file_size=out_path.stat().st_size,
        duration=out_probe.get("duration", 0.0),
        format_name=out_ext,
        media_type=mtype,
        width=vinfo.get("width"),
        height=vinfo.get("height"),
        video_codec=vinfo.get("codec_name"),
        audio_codec=ainfo.get("codec_name"),
        thumbnail_path=thumb,
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
