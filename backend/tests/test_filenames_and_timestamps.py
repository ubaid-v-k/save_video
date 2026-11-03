import pytest
from app.utils.filenames import sanitize_filename, parse_timestamp, format_timestamp

def test_sanitize_filename():
    assert sanitize_filename("my video?.mp4") == "my_video.mp4"
    assert sanitize_filename("test/../unsafe:file*name.mp3") == "unsafe_file_name.mp3"
    assert sanitize_filename("   hello   world   .webm") == "hello_world.webm"
    assert sanitize_filename("CON.mp4") == "media_CON.mp4"
    assert sanitize_filename("") == "untitled_media"

def test_parse_timestamp():
    # Valid numeric
    ok, sec, err = parse_timestamp(12.5)
    assert ok is True and sec == 12.5 and err is None

    # Valid MM:SS
    ok, sec, err = parse_timestamp("01:30")
    assert ok is True and sec == 90.0

    # Valid HH:MM:SS
    ok, sec, err = parse_timestamp("01:02:03")
    assert ok is True and sec == 3723.0

    # Invalid seconds
    ok, sec, err = parse_timestamp("01:75")
    assert ok is False
    assert "seconds" in err.lower()

    # Invalid minutes
    ok, sec, err = parse_timestamp("01:65:10")
    assert ok is False
    assert "minutes" in err.lower()

    ok, sec, err = parse_timestamp("-10")
    assert ok is False
    assert "negative" in err.lower()

    ok, sec, err = parse_timestamp("invalid:time")
    assert ok is False

def test_format_timestamp():
    assert format_timestamp(0) == "00:00:00"
    assert format_timestamp(90) == "00:01:30"
    assert format_timestamp(3665) == "01:01:05"
