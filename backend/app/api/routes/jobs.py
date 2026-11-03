from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from app.config import settings
from app.db.repositories import (
    get_job,
    list_jobs,
    get_job_stats,
    delete_job_record,
    get_media,
)
from app.workers.job_manager import job_manager
from app.services.audio_processor import extract_audio_job
from app.services.video_editor import trim_and_edit_video_job
from app.services.converter import convert_media_job
from app.schemas.requests import (
    ExtractAudioRequest,
    TrimVideoRequest,
    ConvertMediaRequest,
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("")
def get_jobs(
    status: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Lists background processing and download jobs."""
    jobs = list_jobs(status=status, task_type=task_type, search=search, limit=limit, offset=offset)
    return {"jobs": jobs, "count": len(jobs)}

@router.get("/stats")
def get_stats():
    """Returns active, completed, and failed job counts."""
    return get_job_stats()

@router.get("/{job_id}")
def get_single_job(job_id: str):
    """Retrieves current status and progress of a job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/{job_id}/cancel")
def cancel_running_job(job_id: str):
    """Cancels an active or queued job."""
    success = job_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled (may be already finished or not found)")
    return {"success": True, "message": "Job cancellation requested"}

@router.delete("/{job_id}")
def delete_job(job_id: str):
    """Deletes a job record from history."""
    success = delete_job_record(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job record not found")
    return {"success": True}

@router.post("/audio-extract")
def queue_audio_extract(req: ExtractAudioRequest):
    """Queues an audio extraction job."""
    input_path = None
    title = "Audio Extraction"

    if req.media_id:
        m = get_media(req.media_id)
        if not m:
            raise HTTPException(status_code=404, detail="Media file not found in library")
        input_path = m["filepath"]
        title = f"Extract Audio: {m['filename']}"
    elif req.file_path:
        p = Path(req.file_path).resolve()
        if not p.exists():
            raise HTTPException(status_code=404, detail="Input file not found")
        input_path = str(p)
        title = f"Extract Audio: {p.name}"
    else:
        raise HTTPException(status_code=400, detail="Must provide media_id or file_path")

    def runner(job_id, progress_cb, register_proc, is_cancelled):
        extract_audio_job(
            job_id=job_id,
            input_path=input_path,
            output_format=req.output_format,
            bitrate=req.bitrate,
            copy_codec_if_compatible=req.copy_codec,
            progress_callback=progress_cb,
            register_proc=register_proc,
            is_cancelled=is_cancelled,
        )

    job = job_manager.submit_job(
        title=title,
        source=f"file: {Path(input_path).name}",
        task_type="audio_extract",
        task_func=runner,
        meta={
            "output_format": req.output_format,
            "bitrate": req.bitrate,
            "source_filename": Path(input_path).name,
        }
    )

    return {"success": True, "job_id": job["id"], "title": job["title"]}

@router.post("/trim")
def queue_video_trim(req: TrimVideoRequest):
    """Queues a video trimming job."""
    input_path = None
    title = "Trim Video"

    if req.media_id:
        m = get_media(req.media_id)
        if not m:
            raise HTTPException(status_code=404, detail="Media file not found in library")
        input_path = m["filepath"]
        title = f"Trim Video: {m['filename']}"
    elif req.file_path:
        p = Path(req.file_path).resolve()
        if not p.exists():
            raise HTTPException(status_code=404, detail="Input file not found")
        input_path = str(p)
        title = f"Trim Video: {p.name}"
    else:
        raise HTTPException(status_code=400, detail="Must provide media_id or file_path")

    def runner(job_id, progress_cb, register_proc, is_cancelled):
        trim_and_edit_video_job(
            job_id=job_id,
            input_path=input_path,
            start_time=req.start_time,
            end_time=req.end_time,
            output_format=req.output_format,
            mute_audio=req.mute_audio,
            resolution=req.resolution,
            rotation=req.rotation,
            aspect_ratio=req.aspect_ratio,
            framerate=req.framerate,
            crf=req.crf,
            progress_callback=progress_cb,
            register_proc=register_proc,
            is_cancelled=is_cancelled,
        )

    job = job_manager.submit_job(
        title=title,
        source=f"file: {Path(input_path).name}",
        task_type="trim",
        task_func=runner,
        meta={
            "start_time": req.start_time,
            "end_time": req.end_time,
            "output_format": req.output_format,
            "mute_audio": req.mute_audio,
            "source_filename": Path(input_path).name,
        }
    )

    return {"success": True, "job_id": job["id"], "title": job["title"]}

@router.post("/convert")
def queue_format_convert(req: ConvertMediaRequest):
    """Queues a format conversion job."""
    input_path = None
    title = "Convert Media"

    if req.media_id:
        m = get_media(req.media_id)
        if not m:
            raise HTTPException(status_code=404, detail="Media file not found in library")
        input_path = m["filepath"]
        title = f"Convert: {m['filename']} -> {req.output_format.upper()}"
    elif req.file_path:
        p = Path(req.file_path).resolve()
        if not p.exists():
            raise HTTPException(status_code=404, detail="Input file not found")
        input_path = str(p)
        title = f"Convert: {p.name} -> {req.output_format.upper()}"
    else:
        raise HTTPException(status_code=400, detail="Must provide media_id or file_path")

    def runner(job_id, progress_cb, register_proc, is_cancelled):
        convert_media_job(
            job_id=job_id,
            input_path=input_path,
            output_format=req.output_format,
            custom_filename=req.custom_filename,
            video_codec=req.video_codec,
            audio_codec=req.audio_codec,
            resolution=req.resolution,
            audio_bitrate=req.audio_bitrate,
            crf=req.crf,
            progress_callback=progress_cb,
            register_proc=register_proc,
            is_cancelled=is_cancelled,
        )

    job = job_manager.submit_job(
        title=title,
        source=f"file: {Path(input_path).name}",
        task_type="convert",
        task_func=runner,
        meta={
            "output_format": req.output_format,
            "source_filename": Path(input_path).name,
        }
    )

    return {"success": True, "job_id": job["id"], "title": job["title"]}
