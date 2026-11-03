import os
import shutil
from pathlib import Path
from typing import Dict, Any, Callable, Optional
import httpx
import yt_dlp
from app.config import settings
from app.security.url_validation import validate_url
from app.utils.filenames import sanitize_filename, get_unique_filepath
from app.utils.ffmpeg import probe_media, FFMPEG_BIN
from app.services.thumbnail_generator import generate_video_thumbnail
from app.db.repositories import (
    update_job_status,
    save_media,
)

def download_media_job(
    job_id: str,
    url: str,
    quality: str = "best",
    format_ext: str = "mp4",
    title_override: Optional[str] = None,
    progress_callback: Optional[Callable[[float], None]] = None,
    is_cancelled: Optional[Callable[[], bool]] = None,
) -> None:
    """Executes a media download task with progress tracking and media registration."""
    is_valid, err = validate_url(url)
    if not is_valid:
        raise ValueError(err or "Invalid URL")

    settings.ensure_directories()
    update_job_status(job_id, status="downloading", progress=0.0)

    # Temporary download directory
    temp_download_dir = settings.TEMP_DIR / f"dl_{job_id}"
    temp_download_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Check if direct streaming URL first
        is_direct = False
        try:
            with httpx.Client(timeout=8.0, follow_redirects=True) as client:
                head = client.head(url)
                ctype = head.headers.get("content-type", "").lower()
                if ctype.startswith("video/") or ctype.startswith("audio/"):
                    is_direct = True
        except Exception:
            pass

        if is_direct:
            _download_direct_stream(
                job_id=job_id,
                url=url,
                quality=quality,
                format_ext=format_ext,
                temp_dir=temp_download_dir,
                progress_cb=progress_callback,
                is_cancelled=is_cancelled,
            )
        else:
            _download_ytdlp(
                job_id=job_id,
                url=url,
                quality=quality,
                format_ext=format_ext,
                temp_dir=temp_download_dir,
                progress_cb=progress_callback,
                is_cancelled=is_cancelled,
            )

        if is_cancelled and is_cancelled():
            update_job_status(job_id, status="cancelled", error="Cancelled by user")
            return

        # Find downloaded file in temp_download_dir
        downloaded_files = [f for f in temp_download_dir.iterdir() if f.is_file()]
        if not downloaded_files:
            raise RuntimeError("No file was produced by the downloader.")

        temp_file = downloaded_files[0]
        final_filename = sanitize_filename(temp_file.name)
        final_path = get_unique_filepath(settings.MEDIA_DIR, final_filename)

        # Move to persistent media storage
        shutil.move(str(temp_file), str(final_path))

        # Probe metadata
        probe = probe_media(final_path)
        mtype = "video" if probe["has_video"] else "audio"
        vinfo = probe.get("video") or {}
        ainfo = probe.get("audio") or {}

        thumb = None
        if mtype == "video":
            thumb = generate_video_thumbnail(final_path, duration=probe.get("duration", 0.0))

        # Save to media library
        saved_media = save_media(
            filename=final_path.name,
            filepath=str(final_path.resolve()),
            file_size=final_path.stat().st_size,
            duration=probe.get("duration", 0.0),
            format_name=probe.get("format", final_path.suffix.lstrip(".")),
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
            output_filename=final_path.name,
            output_path=str(final_path.resolve()),
            output_size=final_path.stat().st_size,
        )

    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_download_dir, ignore_errors=True)

def _download_direct_stream(
    job_id: str,
    url: str,
    quality: str,
    format_ext: str,
    temp_dir: Path,
    progress_cb: Optional[Callable[[float], None]],
    is_cancelled: Optional[Callable[[], bool]],
) -> None:
    """Streams direct media download with chunk progress updates."""
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        with client.stream("GET", url) as response:
            if response.status_code != 200:
                raise RuntimeError(f"HTTP request failed with status {response.status_code}")

            total = int(response.headers.get("content-length", 0))
            filename = sanitize_filename(url.split("?")[0].split("/")[-1] or f"download_{job_id}.{format_ext}")
            out_file = temp_dir / filename

            downloaded = 0
            with open(out_file, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=65536):
                    if is_cancelled and is_cancelled():
                        return
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0 and progress_cb:
                            pct = round(min(99.0, (downloaded / total) * 100.0), 1)
                            progress_cb(pct)

def _download_ytdlp(
    job_id: str,
    url: str,
    quality: str,
    format_ext: str,
    temp_dir: Path,
    progress_cb: Optional[Callable[[float], None]],
    is_cancelled: Optional[Callable[[], bool]],
) -> None:
    """Uses yt-dlp to download authorized video/audio with progress hook."""
    out_tmpl = str(temp_dir / "%(title).100s_%(id)s.%(ext)s")

    format_selector = "bestvideo+bestaudio/best"
    if quality == "audio":
        format_selector = "bestaudio/best"
    elif quality in ("1080", "720", "480", "360"):
        format_selector = f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"

    class CancelException(Exception):
        pass

    def ytdl_hook(d: Dict[str, Any]) -> None:
        if is_cancelled and is_cancelled():
            raise CancelException("Cancelled by user")

        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes") or 0
            if total > 0 and progress_cb:
                pct = round(min(99.0, (downloaded / total) * 100.0), 1)
                progress_cb(pct)

    ydl_opts = {
        "format": format_selector,
        "outtmpl": out_tmpl,
        "progress_hooks": [ytdl_hook],
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 15,
        "ffmpeg_location": str(Path(FFMPEG_BIN).parent) if FFMPEG_BIN else None,
    }

    if quality == "audio" or format_ext == "mp3":
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }]

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except CancelException:
        return
    except yt_dlp.utils.DownloadError as de:
        err = str(de)
        if any(kw in err.lower() for kw in ("private", "login", "drm", "copyright", "members-only", "sign in")):
            raise RuntimeError("This content is protected by access controls, DRM, or private privacy settings. Direct downloading is not permitted.")
        raise RuntimeError(f"Download error: {err.split(';')[-1].strip()}")
