from typing import Optional
from pydantic import BaseModel, Field

class AnalyzeUrlRequest(BaseModel):
    url: str = Field(..., description="Media URL to analyze")

class StartDownloadRequest(BaseModel):
    url: str = Field(..., description="Media URL to download")
    quality: str = Field("best", description="Quality preset (best, 1080, 720, 480, 360, audio)")
    format_ext: str = Field("mp4", description="Output container format (mp4, mp3, webm)")
    title: Optional[str] = Field(None, description="Optional custom title")

class ExtractAudioRequest(BaseModel):
    media_id: Optional[str] = Field(None, description="ID of media from library")
    file_path: Optional[str] = Field(None, description="Path of uploaded temp file")
    output_format: str = Field("mp3", description="Audio format (mp3, wav, aac, flac, ogg)")
    bitrate: str = Field("192k", description="Audio bitrate (128k, 192k, 256k, 320k)")
    copy_codec: bool = Field(False, description="Attempt direct stream copy if compatible")

class TrimVideoRequest(BaseModel):
    media_id: Optional[str] = Field(None, description="ID of media from library")
    file_path: Optional[str] = Field(None, description="Path of uploaded temp file")
    start_time: str = Field(..., description="Start timestamp (HH:MM:SS, MM:SS, or seconds)")
    end_time: str = Field(..., description="End timestamp (HH:MM:SS, MM:SS, or seconds)")
    output_format: str = Field("mp4", description="Output format (mp4, webm, mkv)")
    mute_audio: bool = Field(False, description="Whether to strip audio track")
    resolution: Optional[str] = Field(None, description="Resize resolution (1080, 720, 480, original)")
    rotation: Optional[int] = Field(None, description="Rotation angle (90, 180, 270)")
    aspect_ratio: Optional[str] = Field(None, description="Aspect ratio preset (16:9, 9:16, 1:1, 4:3)")
    framerate: Optional[int] = Field(None, description="Output frame rate (24, 30, 60)")
    crf: int = Field(22, ge=15, le=35, description="Quality CRF (15 highest, 35 lowest)")

class ConvertMediaRequest(BaseModel):
    media_id: Optional[str] = Field(None, description="ID of media from library")
    file_path: Optional[str] = Field(None, description="Path of uploaded temp file")
    output_format: str = Field(..., description="Target container format")
    custom_filename: Optional[str] = Field(None, description="Custom name without extension")
    video_codec: Optional[str] = Field(None, description="Video codec (h264, vp9, copy)")
    audio_codec: Optional[str] = Field(None, description="Audio codec (aac, mp3, opus, copy)")
    resolution: Optional[str] = Field(None, description="Target height (1080, 720, 480, original)")
    audio_bitrate: Optional[str] = Field("192k", description="Audio bitrate")
    crf: int = Field(23, ge=15, le=35, description="Video quality CRF")

class RenameMediaRequest(BaseModel):
    new_filename: str = Field(..., min_length=1, max_length=200, description="New filename")

class UpdateSettingsRequest(BaseModel):
    theme: Optional[str] = None
    default_format: Optional[str] = None
    default_quality: Optional[str] = None
    max_upload_size_mb: Optional[int] = None
    default_audio_bitrate: Optional[str] = None
