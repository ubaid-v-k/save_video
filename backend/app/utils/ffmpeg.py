import os
import json
import re
import shutil
import subprocess
import glob
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable, Tuple
import imageio_ffmpeg
from app.config import settings

def find_ffmpeg_binaries() -> Tuple[str, str]:
    """
    Locates ffmpeg and ffprobe binaries from PATH, WinGet, or imageio-ffmpeg.
    Returns (ffmpeg_path, ffprobe_path).
    """
    ffmpeg_cmd = settings.CUSTOM_FFMPEG_PATH or shutil.which("ffmpeg")
    ffprobe_cmd = settings.CUSTOM_FFPROBE_PATH or shutil.which("ffprobe")

    # If not found in standard PATH, check WinGet directories on Windows
    if not ffmpeg_cmd or not ffprobe_cmd:
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        if local_app_data:
            # Check WinGet links
            link_ffmpeg = Path(local_app_data) / "Microsoft" / "WinGet" / "Links" / "ffmpeg.exe"
            link_ffprobe = Path(local_app_data) / "Microsoft" / "WinGet" / "Links" / "ffprobe.exe"
            if link_ffmpeg.exists() and not ffmpeg_cmd:
                ffmpeg_cmd = str(link_ffmpeg)
            if link_ffprobe.exists() and not ffprobe_cmd:
                ffprobe_cmd = str(link_ffprobe)

            # Check WinGet Gyan packages
            if not ffmpeg_cmd or not ffprobe_cmd:
                pattern = str(Path(local_app_data) / "Microsoft" / "WinGet" / "Packages" / "Gyan.FFmpeg*" / "**" / "bin" / "*.exe")
                matches = glob.glob(pattern, recursive=True)
                for match in matches:
                    if match.endswith("ffmpeg.exe") and not ffmpeg_cmd:
                        ffmpeg_cmd = match
                    elif match.endswith("ffprobe.exe") and not ffprobe_cmd:
                        ffprobe_cmd = match

    # If still not found, check imageio-ffmpeg for ffmpeg
    if not ffmpeg_cmd:
        try:
            ffmpeg_cmd = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            ffmpeg_cmd = "ffmpeg"

    # If ffprobe still not found, check directory of ffmpeg
    if not ffprobe_cmd and ffmpeg_cmd:
        ffmpeg_dir = Path(ffmpeg_cmd).parent
        candidate_ffprobe = ffmpeg_dir / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
        if candidate_ffprobe.exists():
            ffprobe_cmd = str(candidate_ffprobe)
        else:
            ffprobe_cmd = "ffprobe"

    return ffmpeg_cmd or "ffmpeg", ffprobe_cmd or "ffprobe"

FFMPEG_BIN, FFPROBE_BIN = find_ffmpeg_binaries()

# Ensure FFmpeg directory is in os.environ["PATH"] for all child processes and libraries
if FFMPEG_BIN and FFMPEG_BIN != "ffmpeg":
    _bin_dir = str(Path(FFMPEG_BIN).parent)
    _curr_path = os.environ.get("PATH", "")
    if _bin_dir not in _curr_path:
        os.environ["PATH"] = f"{_bin_dir};{_curr_path}"


def get_ffmpeg_version_info() -> Dict[str, Any]:
    """Returns availability and version info for ffmpeg and ffprobe."""
    ffmpeg_path, ffprobe_path = find_ffmpeg_binaries()
    info = {
        "ffmpeg_available": False,
        "ffmpeg_path": ffmpeg_path,
        "ffmpeg_version": None,
        "ffprobe_available": False,
        "ffprobe_path": ffprobe_path,
        "ffprobe_version": None,
    }

    try:
        res = subprocess.run([ffmpeg_path, "-version"], capture_output=True, text=True, timeout=5, check=False)
        if res.returncode == 0:
            info["ffmpeg_available"] = True
            first_line = res.stdout.splitlines()[0] if res.stdout else ""
            info["ffmpeg_version"] = first_line.strip()
    except Exception as e:
        info["ffmpeg_error"] = str(e)

    try:
        res = subprocess.run([ffprobe_path, "-version"], capture_output=True, text=True, timeout=5, check=False)
        if res.returncode == 0:
            info["ffprobe_available"] = True
            first_line = res.stdout.splitlines()[0] if res.stdout else ""
            info["ffprobe_version"] = first_line.strip()
    except Exception as e:
        info["ffprobe_error"] = str(e)

    return info

def probe_media(file_path: str | Path) -> Dict[str, Any]:
    """
    Uses ffprobe to extract detailed container, video, and audio stream information.
    """
    ffmpeg_path, ffprobe_path = find_ffmpeg_binaries()
    path_str = str(Path(file_path).resolve())

    cmd = [
        ffprobe_path,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path_str
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15, check=False)
        if res.returncode != 0:
            raise RuntimeError(f"FFprobe returned code {res.returncode}: {res.stderr}")
        data = json.loads(res.stdout)
    except Exception as e:
        raise RuntimeError(f"Failed to probe media '{path_str}': {e}")

    format_info = data.get("format", {})
    streams = data.get("streams", [])

    duration = float(format_info.get("duration", 0.0) or 0.0)
    size = int(format_info.get("size", 0) or 0)
    bit_rate = int(format_info.get("bit_rate", 0) or 0)
    format_name = format_info.get("format_name", "unknown")

    video_streams = []
    audio_streams = []

    for s in streams:
        codec_type = s.get("codec_type")
        if codec_type == "video":
            # calculate fps safely
            r_frame_rate = s.get("r_frame_rate", "0/1")
            fps = 0.0
            if "/" in r_frame_rate:
                num, den = r_frame_rate.split("/")
                if float(den) > 0:
                    fps = round(float(num) / float(den), 2)

            video_streams.append({
                "index": s.get("index"),
                "codec_name": s.get("codec_name"),
                "width": s.get("width"),
                "height": s.get("height"),
                "fps": fps,
                "bit_rate": int(s.get("bit_rate", 0) or 0),
                "duration": float(s.get("duration", duration) or duration),
            })
        elif codec_type == "audio":
            audio_streams.append({
                "index": s.get("index"),
                "codec_name": s.get("codec_name"),
                "channels": s.get("channels"),
                "sample_rate": int(s.get("sample_rate", 0) or 0),
                "bit_rate": int(s.get("bit_rate", 0) or 0),
                "duration": float(s.get("duration", duration) or duration),
            })

    primary_video = video_streams[0] if video_streams else None
    primary_audio = audio_streams[0] if audio_streams else None

    return {
        "filename": Path(path_str).name,
        "filepath": path_str,
        "format": format_name,
        "duration": duration,
        "size": size,
        "bit_rate": bit_rate,
        "has_video": len(video_streams) > 0,
        "has_audio": len(audio_streams) > 0,
        "video": primary_video,
        "audio": primary_audio,
        "all_video_streams": video_streams,
        "all_audio_streams": audio_streams,
    }

def run_ffmpeg_process(
    args: List[str],
    total_duration: Optional[float] = None,
    progress_callback: Optional[Callable[[float], None]] = None,
    register_proc: Optional[Callable[[subprocess.Popen], None]] = None,
) -> Tuple[bool, str]:
    """
    Executes ffmpeg with safe argument list (shell=False).
    Parses -progress pipe:1 to update progress callback.
    """
    ffmpeg_path, _ = find_ffmpeg_binaries()
    cmd = [ffmpeg_path, "-y", "-nostdin", "-progress", "pipe:1"] + args

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

        if register_proc:
            register_proc(proc)

        current_out_time_ms = 0
        recent_log_lines = []

        # Read unified output (progress and diagnostic logs)
        if proc.stdout:
            for line in proc.stdout:
                line_str = line.strip()
                recent_log_lines.append(line_str)
                if len(recent_log_lines) > 40:
                    recent_log_lines.pop(0)

                if line_str.startswith("out_time_ms="):
                    try:
                        ms_str = line_str.split("=")[1]
                        current_out_time_ms = int(ms_str)
                        if total_duration and total_duration > 0 and progress_callback:
                            current_sec = current_out_time_ms / 1_000_000.0
                            pct = min(99.0, max(0.0, (current_sec / total_duration) * 100.0))
                            progress_callback(round(pct, 1))
                    except (ValueError, IndexError):
                        pass
                elif line_str == "progress=end":
                    if progress_callback:
                        progress_callback(100.0)

        proc.wait()

        if proc.returncode != 0:
            diag = "\n".join(recent_log_lines[-20:])
            return False, f"FFmpeg exited with code {proc.returncode}:\n{diag}"

        if progress_callback:
            progress_callback(100.0)

        return True, ""

    except Exception as e:
        return False, f"FFmpeg execution error: {str(e)}"
