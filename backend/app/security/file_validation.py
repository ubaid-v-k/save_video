from pathlib import Path
from typing import Set, Tuple, Optional
from app.config import settings

ALLOWED_VIDEO_EXTENSIONS: Set[str] = {
    ".mp4", ".mkv", ".webm", ".mov", ".avi", ".flv", ".wmv", ".m4v", ".ts", ".3gp"
}

ALLOWED_AUDIO_EXTENSIONS: Set[str] = {
    ".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".opus", ".wma"
}

ALLOWED_EXTENSIONS: Set[str] = ALLOWED_VIDEO_EXTENSIONS | ALLOWED_AUDIO_EXTENSIONS

def is_safe_path(target: Path, base_dir: Optional[Path] = None) -> bool:
    """
    Ensure the target path is strictly within the allowed base directory.
    Prevents path traversal attacks (e.g. ../../windows/system32).
    """
    base = (base_dir or settings.STORAGE_DIR).resolve()
    try:
        resolved_target = target.resolve()
        # Ensure target is relative to base
        resolved_target.relative_to(base)
        return True
    except (ValueError, RuntimeError):
        return False

def validate_media_file(filename: str, allowed_extensions: Optional[Set[str]] = None) -> Tuple[bool, Optional[str]]:
    """Validates filename extension and safety."""
    if not filename:
        return False, "Filename cannot be empty"

    ext = Path(filename).suffix.lower()
    allowed = allowed_extensions or ALLOWED_EXTENSIONS
    if ext not in allowed:
        return False, f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(allowed))}"

    return True, None
