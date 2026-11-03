import sqlite3
from typing import Generator
from app.config import settings

def get_connection() -> sqlite3.Connection:
    """Creates a new sqlite3 database connection with row factory enabled."""
    settings.ensure_directories()
    conn = sqlite3.connect(str(settings.DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db() -> None:
    """Initializes tables and indexes."""
    settings.ensure_directories()
    conn = get_connection()
    try:
        with conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    source TEXT NOT NULL,
                    task_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    progress REAL NOT NULL DEFAULT 0.0,
                    error TEXT,
                    output_filename TEXT,
                    output_path TEXT,
                    output_size INTEGER,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    meta_json TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
                CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

                CREATE TABLE IF NOT EXISTS media (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    filepath TEXT NOT NULL UNIQUE,
                    file_size INTEGER NOT NULL,
                    duration REAL NOT NULL,
                    format_name TEXT NOT NULL,
                    media_type TEXT NOT NULL,
                    width INTEGER,
                    height INTEGER,
                    video_codec TEXT,
                    audio_codec TEXT,
                    thumbnail_path TEXT,
                    source_job_id TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);

                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            """)

            # Clean up interrupted jobs from previous unclean shutdowns
            conn.execute("""
                UPDATE jobs 
                SET status = 'failed', error = 'Process interrupted by application restart'
                WHERE status IN ('queued', 'analyzing', 'downloading', 'processing')
            """)
    finally:
        conn.close()

# Initialize DB tables on module load
try:
    init_db()
except Exception:
    pass

