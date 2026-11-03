import httpx
import yt_dlp
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from app.security.url_validation import validate_url
from app.utils.ffmpeg import probe_media

def analyze_remote_url(url: str) -> Dict[str, Any]:
    """
    Analyzes a remote media URL for supported formats, duration, resolutions and title.
    Returns structured analysis or clear explanation if unsupported/restricted.
    """
    is_valid, err = validate_url(url)
    if not is_valid:
        return {
            "supported": False,
            "error": err or "Invalid or forbidden URL",
            "is_restricted": False,
            "url": url,
        }

    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    # 1. Check if direct media URL via HTTP HEAD
    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.head(url)
            content_type = resp.headers.get("content-type", "").lower()
            content_length = resp.headers.get("content-length")
            size_bytes = int(content_length) if content_length and content_length.isdigit() else None

            if content_type.startswith("video/") or content_type.startswith("audio/"):
                ext = content_type.split("/")[-1].split(";")[0]
                filename = url.split("?")[0].split("/")[-1] or f"direct_media.{ext}"
                return {
                    "supported": True,
                    "is_direct": True,
                    "title": filename,
                    "url": url,
                    "source_type": "direct_media",
                    "thumbnail": None,
                    "duration": 0.0,
                    "file_size": size_bytes,
                    "content_type": content_type,
                    "qualities": [
                        {"id": "best", "label": "Original Quality", "ext": ext, "size": size_bytes},
                        {"id": "audio", "label": "Audio Only", "ext": "mp3", "size": None},
                    ]
                }
    except Exception:
        # Fall through to yt-dlp inspection
        pass

    # 2. Use yt-dlp to inspect metadata safely
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 10,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return {
                    "supported": False,
                    "error": "Could not retrieve media details from this URL.",
                    "is_restricted": False,
                    "url": url,
                }

            title = info.get("title", "Untitled Media")
            thumbnail = info.get("thumbnail")
            duration = info.get("duration", 0.0)
            formats = info.get("formats", [])

            # Filter unique video resolutions
            qualities = []
            seen_heights = set()

            # Add "Best Available"
            qualities.append({"id": "best", "label": "Best Available Quality", "resolution": "Original", "ext": "mp4"})

            # Parse video formats
            for f in sorted(formats, key=lambda x: x.get("height") or 0, reverse=True):
                h = f.get("height")
                if h and h in (1080, 720, 480, 360) and h not in seen_heights:
                    seen_heights.add(h)
                    qualities.append({
                        "id": str(h),
                        "label": f"{h}p ({f.get('ext', 'mp4')})",
                        "resolution": f"{h}p",
                        "ext": "mp4",
                        "filesize": f.get("filesize") or f.get("filesize_approx"),
                    })

            # Add Audio Only
            qualities.append({"id": "audio", "label": "Audio Only (MP3)", "resolution": "Audio", "ext": "mp3"})

            return {
                "supported": True,
                "is_direct": False,
                "title": title,
                "url": url,
                "source_type": info.get("extractor", "web"),
                "thumbnail": thumbnail,
                "duration": duration,
                "file_size": info.get("filesize") or info.get("filesize_approx"),
                "qualities": qualities,
            }

    except yt_dlp.utils.DownloadError as de:
        err_msg = str(de)
        is_restricted = any(kw in err_msg.lower() for kw in ("private", "login", "drm", "copyright", "protected", "members-only", "sign in"))
        if is_restricted:
            explanation = (
                f"This content from {domain} is private, login-protected, or DRM-restricted. "
                "MediaBox adheres to platform access policies. Please upload your authorized export file directly."
            )
        else:
            explanation = f"Could not analyze media from {domain}: {err_msg.split(';')[-1].strip()}"

        return {
            "supported": False,
            "error": explanation,
            "is_restricted": is_restricted,
            "url": url,
        }
    except Exception as e:
        return {
            "supported": False,
            "error": f"Failed to analyze URL: {str(e)}",
            "is_restricted": False,
            "url": url,
        }
