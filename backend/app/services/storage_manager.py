import os
import shutil
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.config import settings
from app.security.file_validation import is_safe_path, ALLOWED_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS
from app.utils.filenames import sanitize_filename
from app.utils.ffmpeg import probe_media
from app.services.thumbnail_generator import generate_video_thumbnail
from app.db.repositories import (
    save_media,
    get_media,
    list_media,
    delete_media_record,
    update_media_filename,
)

def get_storage_stats() -> Dict[str, Any]:
    """Returns disk usage statistics in bytes and readable format."""
    target_dir = settings.MEDIA_DIR
    try:
        total, used, free = shutil.disk_usage(target_dir)
    except Exception:
        total, used, free = (0, 0, 0)

    # Calculate size of all files in media directory
    media_files_size = 0
    media_files_count = 0
    if settings.MEDIA_DIR.exists():
        for f in settings.MEDIA_DIR.rglob("*"):
            if f.is_file():
                media_files_size += f.stat().st_size
                media_files_count += 1

    return {
        "disk_total_bytes": total,
        "disk_used_bytes": used,
        "disk_free_bytes": free,
        "media_size_bytes": media_files_size,
        "media_count": media_files_count,
        "media_dir": str(settings.MEDIA_DIR),
    }

def scan_and_sync_media() -> List[Dict[str, Any]]:
    """
    Scans MEDIA_DIR, probes any unregistered files, and removes database records
    for files that no longer exist on disk.
    """
    settings.ensure_directories()
    existing_records = list_media(limit=1000)
    db_paths = {r["filepath"]: r for r in existing_records}

    disk_files = []
    for f in settings.MEDIA_DIR.iterdir():
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
            disk_files.append(f)

    # 1. Clean up missing files from DB
    for filepath, rec in db_paths.items():
        if not Path(filepath).exists():
            delete_media_record(rec["id"])

    # 2. Register new files
    synced = []
    for file_path in disk_files:
        path_str = str(file_path.resolve())
        if path_str not in db_paths:
            try:
                probe = probe_media(file_path)
                mtype = "video" if probe["has_video"] else "audio"
                vinfo = probe.get("video") or {}
                ainfo = probe.get("audio") or {}

                thumb = None
                if mtype == "video":
                    thumb = generate_video_thumbnail(file_path, duration=probe.get("duration", 0.0))

                saved = save_media(
                    filename=file_path.name,
                    filepath=path_str,
                    file_size=file_path.stat().st_size,
                    duration=probe.get("duration", 0.0),
                    format_name=probe.get("format", file_path.suffix.lstrip(".")),
                    media_type=mtype,
                    width=vinfo.get("width"),
                    height=vinfo.get("height"),
                    video_codec=vinfo.get("codec_name"),
                    audio_codec=ainfo.get("codec_name"),
                    thumbnail_path=thumb,
                )
                synced.append(saved)
            except Exception:
                pass

    return list_media(limit=100)

def safe_rename_media_file(media_id: str, new_name: str) -> Dict[str, Any]:
    """Safely renames a media file on disk and in database."""
    record = get_media(media_id)
    if not record:
        raise ValueError("Media record not found")

    old_path = Path(record["filepath"])
    if not old_path.exists():
        delete_media_record(media_id)
        raise ValueError("File does not exist on disk")

    sanitized = sanitize_filename(new_name)
    if not sanitized.lower().endswith(old_path.suffix.lower()):
        sanitized = f"{sanitized}{old_path.suffix}"

    new_path = old_path.parent / sanitized
    if not is_safe_path(new_path, settings.MEDIA_DIR):
        raise ValueError("Forbidden target path")

    if new_path.exists() and new_path != old_path:
        raise ValueError(f"A file named '{sanitized}' already exists")

    old_path.rename(new_path)
    update_media_filename(media_id, sanitized, str(new_path.resolve()))
    return get_media(media_id) or {}

def safe_delete_media_file(media_id: str) -> bool:
    """Safely deletes media file, thumbnail, and DB record."""
    record = get_media(media_id)
    if not record:
        return False

    path_str = record["filepath"]
    fpath = Path(path_str)
    if fpath.exists() and is_safe_path(fpath, settings.MEDIA_DIR):
        try:
            fpath.unlink(missing_ok=True)
        except Exception:
            pass

    # Delete thumbnail if present
    thumb_path = record.get("thumbnail_path")
    if thumb_path and "/api/media/thumbnail/" in thumb_path:
        tname = thumb_path.split("/")[-1]
        local_thumb = settings.THUMBNAILS_DIR / tname
        if local_thumb.exists():
            local_thumb.unlink(missing_ok=True)

    return delete_media_record(media_id)

def cleanup_temporary_files(max_age_hours: int = 12) -> int:
    """Removes leftover temporary files older than max_age_hours."""
    if not settings.TEMP_DIR.exists():
        return 0

    count = 0
    now = time.time()
    cutoff = now - (max_age_hours * 3600)

    for item in settings.TEMP_DIR.iterdir():
        try:
            if item.is_file() and item.stat().st_mtime < cutoff:
                item.unlink(missing_ok=True)
                count += 1
            elif item.is_dir() and item.stat().st_mtime < cutoff:
                shutil.rmtree(item, ignore_errors=True)
                count += 1
        except Exception:
            pass

    return count
