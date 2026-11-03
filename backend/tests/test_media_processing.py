import os
import subprocess
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.utils.ffmpeg import find_ffmpeg_binaries, probe_media
from app.services.video_editor import trim_and_edit_video_job
from app.services.audio_processor import extract_audio_job
from app.services.converter import convert_media_job
from app.services.thumbnail_generator import generate_video_thumbnail
from app.db.repositories import get_job, create_job

client = TestClient(app)

@pytest.fixture(scope="session")
def sample_video(tmp_path_factory) -> Path:
    """Creates a tiny 3-second synthetic test video with audio using FFmpeg testsrc."""
    tmp_dir = tmp_path_factory.mktemp("media_fixtures")
    video_path = tmp_dir / "sample_testsrc.mp4"

    ffmpeg_bin, _ = find_ffmpeg_binaries()
    cmd = [
        ffmpeg_bin,
        "-y",
        "-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=25",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(video_path)
    ]

    res = subprocess.run(cmd, capture_output=True, check=False)
    assert res.returncode == 0
    assert video_path.exists() and video_path.stat().st_size > 0
    return video_path

def test_health_api():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "ffmpeg" in data
    assert data["ffmpeg"]["ffmpeg_available"] is True

def test_probe_media(sample_video):
    probe = probe_media(sample_video)
    assert probe["has_video"] is True
    assert probe["has_audio"] is True
    assert probe["duration"] >= 2.8
    assert probe["video"]["width"] == 320
    assert probe["video"]["height"] == 240

def test_thumbnail_generator(sample_video):
    thumb = generate_video_thumbnail(sample_video, duration=3.0)
    assert thumb is not None
    assert "/api/media/thumbnail/" in thumb

def test_trim_video(sample_video):
    job_id = "test_trim_job_123"
    create_job(title="Test Trim", source=str(sample_video), task_type="trim", job_id=job_id)
    trim_and_edit_video_job(
        job_id=job_id,
        input_path=str(sample_video),
        start_time="00:00:01",
        end_time="00:00:02",
        output_format="mp4",
        mute_audio=False,
    )
    job = get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"
    assert job["output_filename"] is not None
    out_file = Path(job["output_path"])
    assert out_file.exists()

    # Probe trimmed file duration ~ 1 sec
    out_probe = probe_media(out_file)
    assert 0.8 <= out_probe["duration"] <= 1.5

def test_extract_audio(sample_video):
    job_id = "test_audio_job_123"
    create_job(title="Test Audio", source=str(sample_video), task_type="audio_extract", job_id=job_id)
    extract_audio_job(
        job_id=job_id,
        input_path=str(sample_video),
        output_format="mp3",
        bitrate="192k",
    )
    job = get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"
    assert job["output_filename"].endswith(".mp3")
    out_file = Path(job["output_path"])
    assert out_file.exists()

    out_probe = probe_media(out_file)
    assert out_probe["has_audio"] is True
    assert out_probe["audio"]["codec_name"] == "mp3"

def test_convert_media(sample_video):
    job_id = "test_convert_job_123"
    create_job(title="Test Convert", source=str(sample_video), task_type="convert", job_id=job_id)
    convert_media_job(
        job_id=job_id,
        input_path=str(sample_video),
        output_format="webm",
    )
    job = get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"
    assert job["output_filename"].endswith(".webm")
    out_file = Path(job["output_path"])
    assert out_file.exists()
