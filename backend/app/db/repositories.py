import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.db.database import get_connection

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ==================== JOBS REPOSITORY ====================

def create_job(
    title: str,
    source: str,
    task_type: str,
    meta: Optional[Dict[str, Any]] = None,
    job_id: Optional[str] = None,
) -> Dict[str, Any]:
    conn = get_connection()
    jid = job_id or str(uuid.uuid4())
    created = now_iso()
    meta_str = json.dumps(meta or {})
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO jobs (id, title, source, task_type, status, progress, error, output_filename, output_path, output_size, created_at, completed_at, meta_json)
                VALUES (?, ?, ?, ?, 'queued', 0.0, NULL, NULL, NULL, NULL, ?, NULL, ?)
                """,
                (jid, title, source, task_type, created, meta_str),
            )
        return get_job(jid) or {}
    finally:
        conn.close()

def update_job_status(
    job_id: str,
    status: str,
    progress: Optional[float] = None,
    error: Optional[str] = None,
    output_filename: Optional[str] = None,
    output_path: Optional[str] = None,
    output_size: Optional[int] = None,
) -> None:
    conn = get_connection()
    completed_at = now_iso() if status in ("completed", "failed", "cancelled") else None
    try:
        with conn:
            # Fetch current
            row = conn.execute("SELECT progress FROM jobs WHERE id = ?", (job_id,)).fetchone()
            if not row:
                return
            new_prog = progress if progress is not None else row["progress"]

            conn.execute(
                """
                UPDATE jobs
                SET status = ?,
                    progress = ?,
                    error = COALESCE(?, error),
                    output_filename = COALESCE(?, output_filename),
                    output_path = COALESCE(?, output_path),
                    output_size = COALESCE(?, output_size),
                    completed_at = COALESCE(?, completed_at)
                WHERE id = ?
                """,
                (status, new_prog, error, output_filename, output_path, output_size, completed_at, job_id),
            )
    finally:
        conn.close()

def update_job_progress(job_id: str, progress: float) -> None:
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                "UPDATE jobs SET progress = ? WHERE id = ? AND status IN ('downloading', 'processing', 'analyzing')",
                (progress, job_id),
            )
    finally:
        conn.close()

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            return None
        res = dict(row)
        if res.get("meta_json"):
            try:
                res["meta"] = json.loads(res["meta_json"])
            except Exception:
                res["meta"] = {}
        return res
    finally:
        conn.close()

def list_jobs(
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        query = "SELECT * FROM jobs WHERE 1=1"
        params: List[Any] = []

        if status:
            query += " AND status = ?"
            params.append(status)
        if task_type:
            query += " AND task_type = ?"
            params.append(task_type)
        if search:
            query += " AND (title LIKE ? OR output_filename LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term])

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if d.get("meta_json"):
                try:
                    d["meta"] = json.loads(d["meta_json"])
                except Exception:
                    d["meta"] = {}
            result.append(d)
        return result
    finally:
        conn.close()

def delete_job_record(job_id: str) -> bool:
    conn = get_connection()
    try:
        with conn:
            cur = conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
            return cur.rowcount > 0
    finally:
        conn.close()

def get_job_stats() -> Dict[str, int]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT status, COUNT(*) as cnt FROM jobs GROUP BY status
            """
        ).fetchall()
        stats = {
            "queued": 0,
            "analyzing": 0,
            "downloading": 0,
            "processing": 0,
            "completed": 0,
            "failed": 0,
            "cancelled": 0,
            "total": 0,
        }
        for r in rows:
            st = r["status"]
            cnt = r["cnt"]
            if st in stats:
                stats[st] = cnt
            stats["total"] += cnt
        
        stats["active"] = stats["queued"] + stats["analyzing"] + stats["downloading"] + stats["processing"]
        return stats
    finally:
        conn.close()

# ==================== MEDIA REPOSITORY ====================

def save_media(
    filename: str,
    filepath: str,
    file_size: int,
    duration: float,
    format_name: str,
    media_type: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    video_codec: Optional[str] = None,
    audio_codec: Optional[str] = None,
    thumbnail_path: Optional[str] = None,
    source_job_id: Optional[str] = None,
    media_id: Optional[str] = None,
) -> Dict[str, Any]:
    conn = get_connection()
    mid = media_id or str(uuid.uuid4())
    created = now_iso()
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO media (
                    id, filename, filepath, file_size, duration, format_name,
                    media_type, width, height, video_codec, audio_codec,
                    thumbnail_path, source_job_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(filepath) DO UPDATE SET
                    filename = excluded.filename,
                    file_size = excluded.file_size,
                    duration = excluded.duration,
                    format_name = excluded.format_name,
                    width = excluded.width,
                    height = excluded.height,
                    video_codec = excluded.video_codec,
                    audio_codec = excluded.audio_codec,
                    thumbnail_path = COALESCE(excluded.thumbnail_path, media.thumbnail_path)
                """,
                (
                    mid, filename, filepath, file_size, duration, format_name,
                    media_type, width, height, video_codec, audio_codec,
                    thumbnail_path, source_job_id, created
                ),
            )
        return get_media(mid) or {}
    finally:
        conn.close()

def get_media(media_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM media WHERE id = ?", (media_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_media_by_path(filepath: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM media WHERE filepath = ?", (filepath,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def list_media(
    media_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "newest",
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        query = "SELECT * FROM media WHERE 1=1"
        params: List[Any] = []

        if media_type and media_type != "all":
            query += " AND media_type = ?"
            params.append(media_type)
        if search:
            query += " AND filename LIKE ?"
            params.append(f"%{search}%")

        sort_map = {
            "newest": "created_at DESC",
            "oldest": "created_at ASC",
            "name_asc": "filename ASC",
            "name_desc": "filename DESC",
            "size_desc": "file_size DESC",
            "size_asc": "file_size ASC",
            "duration_desc": "duration DESC",
            "duration_asc": "duration ASC",
        }
        order_clause = sort_map.get(sort_by, "created_at DESC")
        query += f" ORDER BY {order_clause} LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

def delete_media_record(media_id: str) -> bool:
    conn = get_connection()
    try:
        with conn:
            cur = conn.execute("DELETE FROM media WHERE id = ?", (media_id,))
            return cur.rowcount > 0
    finally:
        conn.close()

def update_media_filename(media_id: str, new_filename: str, new_filepath: str) -> bool:
    conn = get_connection()
    try:
        with conn:
            cur = conn.execute(
                "UPDATE media SET filename = ?, filepath = ? WHERE id = ?",
                (new_filename, new_filepath, media_id),
            )
            return cur.rowcount > 0
    finally:
        conn.close()

# ==================== APP SETTINGS REPOSITORY ====================

def get_setting(key: str, default: Any = None) -> Any:
    conn = get_connection()
    try:
        row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
        if not row:
            return default
        try:
            return json.loads(row["value"])
        except Exception:
            return row["value"]
    finally:
        conn.close()

def set_setting(key: str, value: Any) -> None:
    conn = get_connection()
    val_str = json.dumps(value)
    try:
        with conn:
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, val_str),
            )
    finally:
        conn.close()

def get_all_settings() -> Dict[str, Any]:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT key, value FROM app_settings").fetchall()
        res = {}
        for r in rows:
            try:
                res[r["key"]] = json.loads(r["value"])
            except Exception:
                res[r["key"]] = r["value"]
        return res
    finally:
        conn.close()
