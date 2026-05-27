import functools
import json
import logging
import sys
import datetime
from typing import Callable, Optional, Any
import redis
from api.config import settings

logger = logging.getLogger("grc")

def serialize_data(data: Any) -> Any:
    """Recursively serialize Pydantic models, SQLAlchemy objects, dates, and datetimes into JSON-serializable types."""
    if isinstance(data, list):
        return [serialize_data(item) for item in data]
    elif isinstance(data, dict):
        return {k: serialize_data(v) for k, v in data.items()}
    elif hasattr(data, "model_dump"):  # Pydantic v2
        return serialize_data(data.model_dump())
    elif hasattr(data, "dict"):  # Pydantic v1 fallback
        return serialize_data(data.dict())
    elif hasattr(data, "_sa_instance_state"):  # SQLAlchemy Model Instance
        d = {}
        for column in data.__table__.columns:
            val = getattr(data, column.name)
            d[column.name] = serialize_data(val)
        return d
    elif hasattr(data, "__dict__"):
        return serialize_data(data.__dict__)
    elif isinstance(data, (datetime.datetime, datetime.date)):
        return data.isoformat()
    return data

class CacheManager:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.memory_cache = {}
        self.memory_expiry = {}
        
        is_testing = "pytest" in sys.modules
        if settings.REDIS_URL and not is_testing:
            try:
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
                # Test connection
                self.redis_client.ping()
                logger.info("CacheManager: Connected to Redis successfully.")
            except Exception as e:
                logger.warning(f"CacheManager: Failed to connect to Redis ({e}). Falling back to in-memory cache.")
                self.redis_client = None
        else:
            logger.info("CacheManager: Using in-memory cache storage.")

    def get(self, key: str) -> Optional[str]:
        if self.redis_client:
            try:
                return self.redis_client.get(key)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # In-memory fallback
        if key in self.memory_cache:
            expiry = self.memory_expiry.get(key)
            if expiry and datetime.datetime.utcnow() > expiry:
                # Expired
                del self.memory_cache[key]
                del self.memory_expiry[key]
                return None
            return self.memory_cache.get(key)
        return None

    def set(self, key: str, value: str, expire: int = 3600):
        if self.redis_client:
            try:
                self.redis_client.set(key, value, ex=expire)
                return
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # In-memory fallback
        self.memory_cache[key] = value
        self.memory_expiry[key] = datetime.datetime.utcnow() + datetime.timedelta(seconds=expire)

    def delete(self, key: str):
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        if key in self.memory_cache:
            del self.memory_cache[key]
        if key in self.memory_expiry:
            del self.memory_expiry[key]

    def clear(self):
        if self.redis_client:
            try:
                self.redis_client.flushdb()
            except Exception as e:
                logger.error(f"Redis flushdb error: {e}")
        self.memory_cache.clear()
        self.memory_expiry.clear()

cache_manager = CacheManager()

def cache_response(expire: int = 3600):
    """
    Decorator to cache route responses. 
    Keys are isolated by tenant to prevent cross-tenant cache leakages.
    """
    def decorator(func: Callable):
        import inspect

        sig = inspect.signature(func)

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Bind parameters to arguments
            bound = sig.bind(*args, **kwargs)
            bound.apply_defaults()
            
            # Check tenant isolation
            tenant_id = ""
            current_user = bound.arguments.get("current_user")
            if current_user:
                tenant_id = getattr(current_user, "tenant_id", "")
            
            # Form cache key
            key_parts = [func.__name__, f"tenant:{tenant_id}"]
            for k, v in sorted(bound.arguments.items()):
                if k not in ("db", "current_user", "request"):
                    key_parts.append(f"{k}:{v}")
            cache_key = f"grc_cache:" + ":".join(key_parts)
            
            cached_val = cache_manager.get(cache_key)
            if cached_val:
                try:
                    return json.loads(cached_val)
                except Exception:
                    pass
            
            result = await func(*args, **kwargs)
            try:
                serialized = serialize_data(result)
                cache_manager.set(cache_key, json.dumps(serialized), expire=expire)
            except Exception as e:
                logger.error(f"Cache serialization error: {e}")
            return result

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Bind parameters to arguments
            bound = sig.bind(*args, **kwargs)
            bound.apply_defaults()
            
            # Check tenant isolation
            tenant_id = ""
            current_user = bound.arguments.get("current_user")
            if current_user:
                tenant_id = getattr(current_user, "tenant_id", "")
            
            # Form cache key
            key_parts = [func.__name__, f"tenant:{tenant_id}"]
            for k, v in sorted(bound.arguments.items()):
                if k not in ("db", "current_user", "request"):
                    key_parts.append(f"{k}:{v}")
            cache_key = f"grc_cache:" + ":".join(key_parts)
            
            cached_val = cache_manager.get(cache_key)
            if cached_val:
                try:
                    return json.loads(cached_val)
                except Exception:
                    pass
            
            result = func(*args, **kwargs)
            try:
                serialized = serialize_data(result)
                cache_manager.set(cache_key, json.dumps(serialized), expire=expire)
            except Exception as e:
                logger.error(f"Cache serialization error: {e}")
            return result

        if inspect.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
