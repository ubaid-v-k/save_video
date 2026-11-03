import pytest
from app.security.url_validation import validate_url, is_ip_blocked
from app.security.file_validation import is_safe_path, validate_media_file
import ipaddress
from pathlib import Path

def test_blocked_ips():
    # Loopback
    assert is_ip_blocked(ipaddress.ip_address("127.0.0.1")) is True
    # Private RFC1918
    assert is_ip_blocked(ipaddress.ip_address("10.0.0.1")) is True
    assert is_ip_blocked(ipaddress.ip_address("172.16.0.5")) is True
    assert is_ip_blocked(ipaddress.ip_address("192.168.1.1")) is True
    # Cloud metadata
    assert is_ip_blocked(ipaddress.ip_address("169.254.169.254")) is True
    # Public IP
    assert is_ip_blocked(ipaddress.ip_address("8.8.8.8")) is False
    assert is_ip_blocked(ipaddress.ip_address("1.1.1.1")) is False

def test_validate_url_ssrf():
    # Forbidden localhost
    valid, err = validate_url("http://localhost:8000/api")
    assert valid is False
    assert "forbidden" in err.lower()

    valid, err = validate_url("http://127.0.0.1:3000")
    assert valid is False

    valid, err = validate_url("http://169.254.169.254/latest/meta-data/")
    assert valid is False

    # Unsupported protocol
    valid, err = validate_url("file:///etc/passwd")
    assert valid is False
    assert "unsupported protocol" in err.lower()

    valid, err = validate_url("gopher://example.com")
    assert valid is False

    # Empty url
    valid, err = validate_url("")
    assert valid is False

def test_file_validation():
    # Valid extensions
    valid, err = validate_media_file("clip.mp4")
    assert valid is True
    assert err is None

    valid, err = validate_media_file("song.mp3")
    assert valid is True

    # Invalid extension
    valid, err = validate_media_file("script.py")
    assert valid is False
    assert "unsupported file extension" in err.lower()

    valid, err = validate_media_file("hack.exe")
    assert valid is False

def test_safe_path():
    base = Path("C:/allowed/storage")
    good_path = Path("C:/allowed/storage/media/video.mp4")
    bad_path = Path("C:/allowed/storage/../../windows/system32/calc.exe")

    assert is_safe_path(good_path, base) is True
    assert is_safe_path(bad_path, base) is False
