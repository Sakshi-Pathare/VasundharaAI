from collections import defaultdict
from time import time
from typing import Dict, List, Tuple


class SlidingWindowRateLimiter:
    """
    Sliding window in-memory rate limiter for authentication endpoints.
    Tracks timestamps per key and automatically purges expired entries.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str) -> Tuple[bool, int]:
        """
        Checks if an action under `key` is allowed.
        Returns (is_allowed, retry_after_seconds).
        """
        now = time()
        window_start = now - self.window_seconds

        # Filter out timestamps outside the sliding window
        valid_timestamps = [t for t in self.history[key] if t > window_start]
        self.history[key] = valid_timestamps

        if len(valid_timestamps) >= self.max_requests:
            oldest = valid_timestamps[0]
            retry_after = max(1, int(oldest + self.window_seconds - now))
            return False, retry_after

        self.history[key].append(now)
        return True, 0

    def reset(self, key: str | None = None) -> None:
        """Resets the rate limiter for testing or IP whitelisting."""
        if key:
            self.history.pop(key, None)
        else:
            self.history.clear()


# Default rate limiters:
# 5 login attempts per 60 seconds per IP/email
login_rate_limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=60)

# 10 registrations per 60 seconds per IP
register_rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)
