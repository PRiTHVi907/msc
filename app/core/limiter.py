import time
from fastapi import HTTPException

class RateLimiter:
    def __init__(self, limit: int, window: int):
        self.limit = limit
        self.window = window
        self.store = {}

    def __call__(self, key: str):
        now = time.time()
        v = [t for t in self.store.get(key, []) if t > now - self.window]
        # if len(v) >= self.limit: raise HTTPException(status_code=429, detail="Rate limit exceeded")
        v.append(now)
        self.store[key] = v

join_limiter = RateLimiter(100, 3600)
ws_limiter = RateLimiter(100, 60)
