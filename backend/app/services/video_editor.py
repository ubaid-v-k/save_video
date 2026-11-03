import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Callable, Optional, List
from app.config import settings
from app.utils.filenames import sanitize_filename, get_unique_filepath, parse_timestamp
from app.utils.ffmpeg import probe_media, run_ffmpeg_process
from app.services.thumbnail_generator import generate_video_thumbnail
from app.db.repositories import (
    update_job_status,
    save_media,
)

def trim_and_edit_video_job(
    job_id: str,
    input_path: str,
    start_time: str | float,
    end_time: str | float,
    output_format: str = "mp4",
    mute_audio: bool = False,
    resolution: Optional[str] = None, # e.g. "1080", "720", "480", "original"
    rotation: Optional[int] = None,   # 90, 180, 270
    aspect_ratio: Optional[str] = None, # "16:9", "9:16", "1:1", "4:3"
    framerate: Optional[int] = None,  # 24, 30, 60
    crf: int = 22,
    progress_callback: Optional[Callable[[float], None]] = None,
    register_proc: Optional[Callable[[subprocess.Popen], None]] = None,
    is_cancelled: Optional[Callable[[], bool]] = None,
) -> None:
    """Trims and edits video with accurate timestamps, filters, and audio controls."""
    src = Path(input_path).resolve()
    if not src.exists():
        raise FileNotFoundError(f"Source video not found: {input_path}")

    probe = probe_media(src)
    if not probe["has_video"]:
        raise ValueError("Source media does not contain a valid video stream.")

    total_media_duration = probe.get("duration", 0.0)

    # Validate timestamps
    valid_s, s_sec, err_s = parse_timestamp(start_time)
    if not valid_s:
        raise ValueError(f"Invalid start timestamp: {err_s}")

    valid_e, e_sec, err_e = parse_timestamp(end_time)
    if not valid_e:
        raise ValueError(f"Invalid end timestamp: {err_e}")

    if s_sec >= e_sec:
        raise ValueError(f"Start time ({s_sec}s) must be less than end time ({e_sec}s)")

    if total_media_duration > 0 and s_sec >= total_media_duration:
        raise ValueError(f"Start time exceeds total media duration ({total_media_duration:.1f}s)")

    if total_media_duration > 0 and e_sec > total_media_duration:
        e_sec = total_media_duration

    segment_duration = e_sec - s_sec
    update_job_status(job_id, status="processing", progress=0.0)

    # Output file
    ext = output_format.lower().lstrip(".")
    if ext not in ("mp4", "webm", "mkv", "mov"):
        ext = "mp4"

    target_name = f"{src.stem}_trimmed.{ext}"
    out_path = get_unique_filepath(settings.MEDIA_DIR, target_name)

    # Build video filter chain
    vf_filters: List[str] = []

    # Rotation filter
    if rotation == 90:
        vf_filters.append("transpose=1")
    elif rotation == 180:
        vf_filters.append("transpose=2,transpose=2")
    elif rotation == 270:
        vf_filters.append("transpose=2")

    # Aspect ratio / Crop filter
    if aspect_ratio == "1:1":
        vf_filters.append("crop=min(iw\\,ih):min(iw\\,ih)")
    elif aspect_ratio == "16:9":
        vf_filters.append("crop='if(gt(a,16/9),ih*16/9,iw)':'if(gt(a,16/9),ih,iw*9/16)'")
    elif aspect_ratio == "9:16":
        vf_filters.append("crop='if(gt(a,9/16),ih*9/16,iw)':'if(gt(a,9/16),ih,iw*16/9)'")
    elif aspect_ratio == "4:3":
        vf_filters.append("crop='if(gt(a,4/3),ih*4/3,iw)':'if(gt(a,4/3),ih,iw*3/4)'")

    # Resolution scaling
    if resolution and resolution not in ("original", "auto", ""):
        try:
            target_h = int(resolution.rstrip("p"))
            vf_filters.append(f"scale=-2:{target_h}")
        except ValueError:
            pass

    # Build command args
    # Frame-accurate cut with -ss before -i and -t
    ffmpeg_args = [
        "-ss", str(s_sec),
        "-t", str(segment_duration),
        "-i", str(src),
    ]

    # Video codec and filters
    if ext == "webm":
        ffmpeg_args.extend(["-c:v", "libvpx-vp9", "-crf", str(crf + 8), "-b:v", "0"])
    else:
        ffmpeg_args.extend(["-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p"])

    if framerate and framerate in (24, 30, 60):
        ffmpeg_args.extend(["-r", str(framerate)])

    if vf_filters:
        ffmpeg_args.extend(["-vf", ",".join(vf_filters)])

    # Audio handling
    if mute_audio:
        ffmpeg_args.append("-an")
    else:
        if ext == "webm":
            ffmpeg_args.extend(["-c:a", "libopus", "-b:a", "128k"])
        else:
            ffmpeg_args.extend(["-c:a", "aac", "-b:a", "192k"])

    ffmpeg_args.extend(["-movflags", "+faststart", str(out_path)])

    success, err_msg = run_ffmpeg_process(
        args=ffmpeg_args,
        total_duration=segment_duration,
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
        raise RuntimeError(f"Video trimming failed: {err_msg}")

    # Probe resulting video
    out_probe = probe_media(out_path)
    vinfo = out_probe.get("video") or {}
    ainfo = out_probe.get("audio") or {}

    thumb = generate_video_thumbnail(out_path, duration=out_probe.get("duration", 0.0))

    # Save to media library
    save_media(
        filename=out_path.name,
        filepath=str(out_path.resolve()),
        file_size=out_path.stat().st_size,
        duration=out_probe.get("duration", 0.0),
        format_name=ext,
        media_type="video",
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
