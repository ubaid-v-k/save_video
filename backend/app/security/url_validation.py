import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, Optional

# Unsafe IP networks to block (SSRF protection)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network
    ipaddress.ip_network("10.0.0.0/8"),         # Private RFC1918
    ipaddress.ip_network("100.64.0.0/10"),      # Shared Address Space (CGNAT)
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-Local (includes cloud metadata 169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),      # Private RFC1918
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # TEST-NET-1
    ipaddress.ip_network("192.88.99.0/24"),     # 6to4 Relay Anycast
    ipaddress.ip_network("192.168.0.0/16"),     # Private RFC1918
    ipaddress.ip_network("198.18.0.0/15"),      # Network benchmark tests
    ipaddress.ip_network("198.51.100.0/24"),    # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),     # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved / Future use
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
    # IPv6 blocks
    ipaddress.ip_network("::/128"),             # Unspecified
    ipaddress.ip_network("::1/128"),            # Loopback
    ipaddress.ip_network("fc00::/7"),           # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),          # Link-local unicast
    ipaddress.ip_network("ff00::/8"),           # Multicast
]

def is_ip_blocked(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address belongs to any blocked or private network."""
    if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved:
        return True
    return any(ip_obj in net for net in BLOCKED_NETWORKS)

def validate_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Validates a URL for format, protocol, and SSRF restrictions.
    Returns (is_valid, error_message).
    """
    if not url or not isinstance(url, str):
        return False, "URL cannot be empty"

    url = url.strip()
    if len(url) > 2048:
        return False, "URL is too long (maximum 2048 characters)"

    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Invalid URL structure: {e}"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported protocol '{parsed.scheme}'. Only HTTP and HTTPS are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL must contain a valid domain name or host"

    # Explicitly disallow localhost and common local aliases
    lowered_host = hostname.lower()
    if lowered_host in ("localhost", "127.0.0.1", "::1", "0.0.0.0", "local", "metadata.google.internal"):
        return False, "Access to localhost or internal network destinations is forbidden."

    if lowered_host.endswith(".local") or lowered_host.endswith(".internal"):
        return False, "Access to internal domain zones is forbidden."

    # DNS Resolution and SSRF validation
    try:
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), proto=socket.IPPROTO_TCP)
        if not addr_info:
            return False, f"Could not resolve host '{hostname}'"

        for entry in addr_info:
            ip_str = entry[4][0]
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                if is_ip_blocked(ip_obj):
                    return False, f"Destination host resolves to forbidden internal or private IP address ({ip_str})"
            except ValueError:
                return False, f"Invalid IP representation: {ip_str}"

    except socket.gaierror:
        return False, f"Could not resolve domain '{hostname}'"
    except Exception as e:
        return False, f"Failed to validate host: {str(e)}"

    return True, None
