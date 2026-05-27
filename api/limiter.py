import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from api.config import settings

logger = logging.getLogger("grc")

# Fallback to in-memory if Redis isn't configured/available
storage_uri = "memory://"
if settings.REDIS_URL:
    storage_uri = settings.REDIS_URL
    logger.info(f"Rate Limiter: Using Redis storage: {storage_uri}")
else:
    logger.info("Rate Limiter: Using in-memory storage")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=storage_uri,
    default_limits=["100/minute"]
)
