import os
import mimetypes
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from app.config import settings
from app.security.file_validation import is_safe_path, validate_media_file, ALLOWED_EXTENSIONS
from app.utils.filenames import sanitize_filename, get_unique_filepath
from app.utils.ffmpeg import probe_media
from app.services.thumbnail_generator import generate_video_thumbnail
from app.services.storage_manager import (
    scan_and_sync_media,
    safe_rename_media_file,
    safe_delete_media_file,
)
from app.db.repositories import (
    save_media,
    get_media,
    list_media,
)
from app.schemas.requests import RenameMediaRequest

router = APIRouter(prefix="/media", tags=["Media"])

@router.post("/upload")
async def upload_media_file(file: UploadFile = File(...)):
    """Uploads a local media file, probes metadata, and adds to library."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    is_valid, err = validate_media_file(file.filename)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)

    settings.ensure_directories()
    sanitized = sanitize_filename(file.filename)
    target_path = get_unique_filepath(settings.MEDIA_DIR, sanitized)

    # Stream write in chunks
    total_bytes = 0
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    try:
        with open(target_path, "wb") as out_file:
            while chunk := await file.read(1024 * 1024):  # 1MB chunk
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB} MB"
                    )
                out_file.write(chunk)
    except Exception as e:
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")

    # Probe media
    try:
        probe = probe_media(target_path)
    except Exception as e:
        target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid or corrupt media file: {str(e)}")

    mtype = "video" if probe["has_video"] else "audio"
    vinfo = probe.get("video") or {}
    ainfo = probe.get("audio") or {}

    thumb = None
    if mtype == "video":
        thumb = generate_video_thumbnail(target_path, duration=probe.get("duration", 0.0))

    saved = save_media(
        filename=target_path.name,
        filepath=str(target_path.resolve()),
        file_size=target_path.stat().st_size,
        duration=probe.get("duration", 0.0),
        format_name=probe.get("format", target_path.suffix.lstrip(".")),
        media_type=mtype,
        width=vinfo.get("width"),
        height=vinfo.get("height"),
        video_codec=vinfo.get("codec_name"),
        audio_codec=ainfo.get("codec_name"),
        thumbnail_path=thumb,
    )

    return {"success": True, "media": saved, "probe": probe}

@router.get("")
def get_media_list(
    media_type: Optional[str] = Query(None, description="video, audio, or all"),
    search: Optional[str] = Query(None),
    sort_by: str = Query("newest", description="newest, oldest, name_asc, name_desc, size_desc, size_asc, duration_desc, duration_asc"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Lists media items in the local library with sorting and filtering."""
    items = list_media(media_type=media_type, search=search, sort_by=sort_by, limit=limit, offset=offset)
    return {"items": items, "count": len(items)}

@router.post("/sync")
def sync_media_library():
    """Scans storage folder and syncs media library database."""
    items = scan_and_sync_media()
    return {"success": True, "items": items, "count": len(items)}

@router.get("/{media_id}")
def get_media_item(media_id: str):
    """Retrieves metadata for a specific media item."""
    item = get_media(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media item not found")
    return item

@router.get("/stream/{media_id}")
def stream_media_file(media_id: str, request: Request):
    """
    Streams media file with HTTP 206 Partial Content support for video/audio seeking.
    """
    item = get_media(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media item not found")

    file_path = Path(item["filepath"])
    if not file_path.exists() or not is_safe_path(file_path):
        raise HTTPException(status_code=404, detail="File does not exist on disk")

    file_size = file_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"

    range_header = request.headers.get("range")
    if not range_header:
        # Full file streaming
        def iterfile():
            with open(file_path, mode="rb") as f:
                while chunk := f.read(65536):
                    yield chunk

        headers = {
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": mime_type,
        }
        return StreamingResponse(iterfile(), headers=headers)

    # Range header present, e.g. "bytes=0-1000"
    try:
        byte_range = range_header.strip().replace("bytes=", "")
        parts = byte_range.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1

        if start >= file_size or end >= file_size or start > end:
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        content_length = (end - start) + 1

        def iter_range():
            with open(file_path, mode="rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    read_size = min(65536, remaining)
                    data = f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": mime_type,
        }
        return StreamingResponse(iter_range(), status_code=206, headers=headers)

    except Exception:
        return FileResponse(file_path, media_type=mime_type)

@router.get("/download/{media_id}")
def download_media_file(media_id: str):
    """Directly downloads a media file to the user's browser."""
    item = get_media(media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media item not found")

    file_path = Path(item["filepath"])
    if not file_path.exists() or not is_safe_path(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        filename=item["filename"],
        media_type="application/octet-stream",
    )

@router.get("/thumbnail/{filename}")
def get_thumbnail(filename: str):
    """Serves a generated thumbnail image."""
    sanitized = sanitize_filename(filename)
    thumb_path = settings.THUMBNAILS_DIR / sanitized
    if not thumb_path.exists() or not is_safe_path(thumb_path, settings.THUMBNAILS_DIR):
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(thumb_path, media_type="image/jpeg")

@router.post("/{media_id}/rename")
def rename_media(media_id: str, req: RenameMediaRequest):
    """Renames a media file safely."""
    try:
        updated = safe_rename_media_file(media_id, req.new_filename)
        return {"success": True, "media": updated}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.delete("/{media_id}")
def delete_media(media_id: str):
    """Deletes a media item from disk and database."""
    success = safe_delete_media_file(media_id)
    if not success:
        raise HTTPException(status_code=404, detail="Media item not found")
    return {"success": True}
