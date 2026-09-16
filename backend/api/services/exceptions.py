"""
Custom Exception Classes for RippleGuard Services.
"""

class PackageNotFoundError(Exception):
    """Raised when a package or version cannot be found in the upstream registry."""
    pass


class ServiceTimeoutError(Exception):
    """Raised when an upstream registry or dependency resolution service times out."""
    pass
