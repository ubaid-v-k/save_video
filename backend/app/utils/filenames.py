import re
import unicodedata
from pathlib import Path
from typing import Tuple, Optional

# Characters not permitted in Windows/POSIX filenames
FORBIDDEN_CHARS = re.compile(r'[\\/*?:"<>|\x00-\x1f]')

def sanitize_filename(filename: str, max_length: int = 150) -> str:
    """
    Sanitizes a filename:
    - Normalizes unicode
    - Strips invalid characters
    - Replaces path separators and reserved characters with underscores
    - Trims leading/trailing whitespace and dots
    - Limits length while preserving extension
    """
    if not filename:
        return "untitled_media"

    path_obj = Path(filename)
    stem = path_obj.stem
    ext = path_obj.suffix.lower()

    # Normalize unicode (NFKC)
    stem = unicodedata.normalize("NFKC", stem)

    # Replace forbidden chars with underscore
    stem = FORBIDDEN_CHARS.sub("_", stem)

    # Collapse multiple consecutive underscores or spaces
    stem = re.sub(r'[\s_]+', '_', stem).strip('._ ')

    # Reserved Windows device names
    reserved_names = {
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4",
        "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2",
        "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    }
    if stem.upper() in reserved_names or not stem:
        stem = f"media_{stem}" if stem else "media"

    # Truncate if too long (reserving space for extension)
    max_stem_len = max_length - len(ext) - 1
    if len(stem) > max_stem_len:
        stem = stem[:max_stem_len].rstrip('._ ')

    return f"{stem}{ext}"

def get_unique_filepath(target_dir: Path, filename: str) -> Path:
    """
    Returns a unique file path within target_dir, adding numerical suffix if needed.
    """
    sanitized = sanitize_filename(filename)
    path_obj = Path(sanitized)
    stem = path_obj.stem
    ext = path_obj.suffix

    candidate = target_dir / sanitized
    counter = 1
    while candidate.exists():
        candidate = target_dir / f"{stem}_{counter}{ext}"
        counter += 1

    return candidate

def parse_timestamp(time_str: str | float | int) -> Tuple[bool, float, Optional[str]]:
    """
    Parses timestamp in seconds or HH:MM:SS / MM:SS format into total float seconds.
    Returns (is_valid, seconds, error_message).
    """
    if isinstance(time_str, (int, float)):
        val = float(time_str)
        if val < 0:
            return False, 0.0, "Timestamp cannot be negative"
        return True, round(val, 3), None

    if not isinstance(time_str, str) or not time_str.strip():
        return False, 0.0, "Timestamp string cannot be empty"

    time_str = time_str.strip()

    # Check if direct numeric string
    try:
        val = float(time_str)
        if val < 0:
            return False, 0.0, "Timestamp cannot be negative"
        return True, round(val, 3), None
    except ValueError:
        pass

    # Match HH:MM:SS, MM:SS, or HH:MM:SS.mmm
    parts = time_str.split(":")
    if len(parts) > 3 or len(parts) < 2:
        return False, 0.0, "Timestamp must be in HH:MM:SS or MM:SS format"

    try:
        if len(parts) == 3:
            h = float(parts[0])
            m = float(parts[1])
            s = float(parts[2])
        else: # 2 parts: MM:SS
            h = 0.0
            m = float(parts[0])
            s = float(parts[1])

        if h < 0 or m < 0 or s < 0:
            return False, 0.0, "Time components cannot be negative"
        if m >= 60:
            return False, 0.0, "Minutes must be between 0 and 59"
        if s >= 60:
            return False, 0.0, "Seconds must be between 0 and 59.999"

        total_seconds = h * 3600 + m * 60 + s
        return True, round(total_seconds, 3), None
    except ValueError:
        return False, 0.0, "Invalid numbers in timestamp"

def format_timestamp(seconds: float) -> str:
    """Formats seconds into HH:MM:SS string."""
    if seconds < 0:
        seconds = 0
    total_sec = int(seconds)
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    secs = total_sec % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"
