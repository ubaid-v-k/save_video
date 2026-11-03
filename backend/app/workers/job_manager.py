import asyncio
import os
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from app.config import settings
from app.db.repositories import (
    create_job,
    update_job_status,
    update_job_progress,
    get_job,
)

class JobManager:
    def __init__(self, max_workers: int = 2):
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="mediabox_worker")
        self.active_processes: Dict[str, subprocess.Popen] = {}
        self.cancellation_flags: Dict[str, bool] = {}
        self.partial_files: Dict[str, Path] = {}
        self._lock = threading.Lock()

    def submit_job(
        self,
        title: str,
        source: str,
        task_type: str,
        task_func: Callable[[str, Callable[[float], None], Callable[[subprocess.Popen], None], Callable[[], bool]], Any],
        meta: Optional[Dict[str, Any]] = None,
        job_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submits a job to the background thread pool."""
        job = create_job(title=title, source=source, task_type=task_type, meta=meta, job_id=job_id)
        jid = job["id"]

        with self._lock:
            self.cancellation_flags[jid] = False

        self.executor.submit(self._run_job_wrapper, jid, task_func)
        return job

    def register_partial_file(self, job_id: str, path: Path) -> None:
        with self._lock:
            self.partial_files[job_id] = path

    def _run_job_wrapper(
        self,
        job_id: str,
        task_func: Callable[..., Any],
    ) -> None:
        def progress_cb(pct: float) -> None:
            update_job_progress(job_id, pct)

        def register_proc_cb(proc: subprocess.Popen) -> None:
            with self._lock:
                self.active_processes[job_id] = proc

        def is_cancelled_cb() -> bool:
            with self._lock:
                return self.cancellation_flags.get(job_id, False)

        try:
            # Check if cancelled before starting
            if is_cancelled_cb():
                update_job_status(job_id, status="cancelled", error="Job was cancelled by user")
                return

            task_func(job_id, progress_cb, register_proc_cb, is_cancelled_cb)

        except Exception as e:
            if is_cancelled_cb():
                update_job_status(job_id, status="cancelled", error="Job was cancelled by user")
            else:
                update_job_status(job_id, status="failed", error=str(e))
        finally:
            with self._lock:
                self.active_processes.pop(job_id, None)
                self.cancellation_flags.pop(job_id, None)
                # If failed or cancelled, remove partial file
                curr_job = get_job(job_id)
                if curr_job and curr_job.get("status") in ("failed", "cancelled"):
                    partial = self.partial_files.pop(job_id, None)
                    if partial and partial.exists():
                        try:
                            partial.unlink(missing_ok=True)
                        except Exception:
                            pass
                else:
                    self.partial_files.pop(job_id, None)

    def cancel_job(self, job_id: str) -> bool:
        """Cancels an active or queued job."""
        job = get_job(job_id)
        if not job or job.get("status") in ("completed", "failed", "cancelled"):
            return False

        with self._lock:
            self.cancellation_flags[job_id] = True
            proc = self.active_processes.get(job_id)
            if proc:
                try:
                    proc.terminate()
                    # Wait briefly, then kill if still running
                    try:
                        proc.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                except Exception:
                    pass

        update_job_status(job_id, status="cancelled", error="Cancelled by user")
        return True

job_manager = JobManager(max_workers=settings.MAX_CONCURRENT_JOBS)
