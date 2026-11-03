from fastapi import APIRouter
from app.config import settings
from app.db.repositories import (
    get_all_settings,
    set_setting,
)
from app.services.storage_manager import cleanup_temporary_files
from app.schemas.requests import UpdateSettingsRequest
from app.utils.ffmpeg import get_ffmpeg_version_info

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "theme": "dark",
    "default_format": "mp4",
    "default_quality": "best",
    "default_audio_bitrate": "192k",
    "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
    "media_dir": str(settings.MEDIA_DIR),
}

@router.get("")
def get_settings():
    """Retrieves application configuration and settings."""
    stored = get_all_settings()
    current = {**DEFAULT_SETTINGS, **stored}
    ffmpeg_info = get_ffmpeg_version_info()
    return {
        "settings": current,
        "capabilities": {
            "ffmpeg": ffmpeg_info["ffmpeg_available"],
            "ffprobe": ffmpeg_info["ffprobe_available"],
            "supported_video_formats": ["mp4", "webm", "mkv", "mov", "avi"],
            "supported_audio_formats": ["mp3", "wav", "aac", "flac", "ogg"],
            "max_concurrent_jobs": settings.MAX_CONCURRENT_JOBS,
        }
    }

@router.post("")
def update_settings(req: UpdateSettingsRequest):
    """Updates user preferences safely."""
    if req.theme:
        set_setting("theme", req.theme)
    if req.default_format:
        set_setting("default_format", req.default_format)
    if req.default_quality:
        set_setting("default_quality", req.default_quality)
    if req.default_audio_bitrate:
        set_setting("default_audio_bitrate", req.default_audio_bitrate)
    if req.max_upload_size_mb:
        set_setting("max_upload_size_mb", req.max_upload_size_mb)

    return {"success": True, "settings": get_settings()["settings"]}

@router.post("/cleanup-temp")
def trigger_temp_cleanup():
    """Manually cleans up temporary files."""
    cleaned = cleanup_temporary_files(max_age_hours=0) # clean all temp files
    return {"success": True, "cleaned_files": cleaned}
