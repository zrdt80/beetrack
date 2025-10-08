from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings
from app.utils.logger import log_event


_storage_uri = (
    settings.redis_url if settings.rate_limit_storage == "redis" else "memory://"
)

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
)

try:
    log_event(f"Rate limiter storage: {_storage_uri}", level="INFO")
except Exception:
    pass
