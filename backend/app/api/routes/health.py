import sys
import time
from fastapi import APIRouter
from app.config import settings
from app.utils.ffmpeg import get_ffmpeg_version_info
from app.services.storage_manager import get_storage_stats
from app.db.repositories import get_job_stats

router = APIRouter(prefix="/health", tags=["Health"])

START_TIME = time.time()

@router.get("")
def get_system_health():
    """Returns system status, FFmpeg availability, storage usage, and runtime info."""
    ffmpeg_info = get_ffmpeg_version_info()
    storage = get_storage_stats()
    job_stats = get_job_stats()
    uptime_sec = int(time.time() - START_TIME)

    is_healthy = ffmpeg_info["ffmpeg_available"] and ffmpeg_info["ffprobe_available"]

    return {
        "status": "healthy" if is_healthy else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "uptime_seconds": uptime_sec,
        "python_version": sys.version.split()[0],
        "ffmpeg": ffmpeg_info,
        "storage": storage,
        "jobs": job_stats,
    }
