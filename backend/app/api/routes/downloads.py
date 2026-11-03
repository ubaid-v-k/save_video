from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.requests import AnalyzeUrlRequest, StartDownloadRequest
from app.services.media_analyzer import analyze_remote_url
from app.services.downloader import download_media_job
from app.workers.job_manager import job_manager

router = APIRouter(prefix="/downloads", tags=["Downloads"])

@router.post("/analyze")
def analyze_url(req: AnalyzeUrlRequest):
    """Inspects a media URL and returns available qualities or restrictions."""
    res = analyze_remote_url(req.url)
    return res

@router.post("/start")
def start_download(req: StartDownloadRequest):
    """Queues a media download job."""
    # First re-analyze URL to ensure it is valid
    analysis = analyze_remote_url(req.url)
    if not analysis.get("supported"):
        raise HTTPException(
            status_code=400,
            detail=analysis.get("error", "URL is not supported or access is restricted")
        )

    title = req.title or analysis.get("title") or "Downloaded Media"

    def task_runner(job_id, progress_cb, register_proc, is_cancelled):
        download_media_job(
            job_id=job_id,
            url=req.url,
            quality=req.quality,
            format_ext=req.format_ext,
            title_override=title,
            progress_callback=progress_cb,
            is_cancelled=is_cancelled,
        )

    job = job_manager.submit_job(
        title=title,
        source=f"url: {req.url}",
        task_type="download",
        task_func=task_runner,
        meta={
            "url": req.url,
            "quality": req.quality,
            "format_ext": req.format_ext,
            "thumbnail": analysis.get("thumbnail"),
        }
    )

    return {
        "success": True,
        "job_id": job["id"],
        "status": job["status"],
        "title": job["title"],
    }
