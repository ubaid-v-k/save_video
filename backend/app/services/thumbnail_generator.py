import os
import subprocess
from pathlib import Path
from typing import Optional
from app.config import settings
from app.utils.ffmpeg import find_ffmpeg_binaries

def generate_video_thumbnail(video_path: str | Path, duration: float = 0.0) -> Optional[str]:
    """
    Generates a JPEG thumbnail image from a video file using FFmpeg.
    Returns the relative path to the generated thumbnail, or None if failed.
    """
    vpath = Path(video_path)
    if not vpath.exists():
        return None

    settings.ensure_directories()
    thumb_name = f"thumb_{vpath.stem}_{int(os.path.getmtime(str(vpath)))}.jpg"
    out_path = settings.THUMBNAILS_DIR / thumb_name

    # If thumbnail already exists and is non-empty, reuse it
    if out_path.exists() and out_path.stat().st_size > 0:
        return f"/api/media/thumbnail/{thumb_name}"

    # Pick capture timestamp safely
    capture_time = 1.0
    if duration > 2.0:
        capture_time = min(duration * 0.15, 5.0)

    ffmpeg_bin, _ = find_ffmpeg_binaries()
    cmd = [
        ffmpeg_bin,
        "-y",
        "-ss", str(round(capture_time, 2)),
        "-i", str(vpath),
        "-vf", "scale=480:-2",
        "-vframes", "1",
        "-q:v", "3",
        str(out_path)
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, timeout=10, check=False)
        if res.returncode == 0 and out_path.exists() and out_path.stat().st_size > 0:
            return f"/api/media/thumbnail/{thumb_name}"
    except Exception:
        pass

    return None
