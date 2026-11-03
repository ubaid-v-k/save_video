import os
import shutil
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MEDIABOX_",
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
    )

    APP_NAME: str = "MediaBox"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    MEDIA_DIR: Path = STORAGE_DIR / "media"
    TEMP_DIR: Path = STORAGE_DIR / "temp"
    THUMBNAILS_DIR: Path = STORAGE_DIR / "thumbnails"
    DB_PATH: Path = STORAGE_DIR / "mediabox.db"
    
    # File limits
    MAX_UPLOAD_SIZE_MB: int = 2000  # 2 GB default
    MAX_CONCURRENT_JOBS: int = 2
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # Custom binaries override (optional)
    CUSTOM_FFMPEG_PATH: str = ""
    CUSTOM_FFPROBE_PATH: str = ""

    def ensure_directories(self) -> None:
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        self.TEMP_DIR.mkdir(parents=True, exist_ok=True)
        self.THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
