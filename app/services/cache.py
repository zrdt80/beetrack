import json
import hashlib
from typing import Optional, Callable
from functools import wraps
import redis.asyncio as redis
from app.config import settings
from app.utils.logger import log_event


class CacheService:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._enabled = settings.rate_limit_storage == "redis"

    async def get_redis(self) -> Optional[redis.Redis]:
        if not self._enabled:
            return None

        if self._redis is None:
            try:
                self._redis = redis.from_url(
                    settings.redis_url, decode_responses=True, socket_connect_timeout=5
                )
                await self._redis.ping()
                log_event("Redis cache connection established", level="INFO")
            except Exception as e:
                log_event(f"Redis cache unavailable: {e}", level="WARNING")
                self._enabled = False
                return None

        return self._redis

    async def get(self, key: str) -> Optional[str]:
        client = await self.get_redis()
        if not client:
            return None

        try:
            return await client.get(key)
        except Exception as e:
            log_event(f"Cache get error: {e}", level="ERROR")
            return None

    async def set(self, key: str, value: str, ttl: int = 300) -> bool:
        client = await self.get_redis()
        if not client:
            return False

        try:
            await client.setex(key, ttl, value)
            return True
        except Exception as e:
            log_event(f"Cache set error: {e}", level="ERROR")
            return False

    async def delete(self, key: str) -> bool:
        client = await self.get_redis()
        if not client:
            return False

        try:
            await client.delete(key)
            return True
        except Exception as e:
            log_event(f"Cache delete error: {e}", level="ERROR")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        client = await self.get_redis()
        if not client:
            return 0

        try:
            keys = []
            async for key in client.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                return await client.delete(*keys)
            return 0
        except Exception as e:
            log_event(f"Cache delete pattern error: {e}", level="ERROR")
            return 0

    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        key_parts = [prefix]

        for arg in args:
            key_parts.append(str(arg))

        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = json.dumps(sorted_kwargs, sort_keys=True)
            key_parts.append(hashlib.md5(kwargs_str.encode()).hexdigest()[:8])

        return ":".join(key_parts)


cache_service = CacheService()


def cached(prefix: str, ttl: int = 300):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = cache_service.generate_key(prefix, *args, **kwargs)

            cached_value = await cache_service.get(cache_key)
            if cached_value is not None:
                try:
                    return json.loads(cached_value)
                except json.JSONDecodeError:
                    pass

            result = (
                await func(*args, **kwargs)
                if asyncio.iscoroutinefunction(func)
                else func(*args, **kwargs)
            )

            if result is not None:
                try:
                    await cache_service.set(
                        cache_key, json.dumps(result, default=str), ttl
                    )
                except (TypeError, ValueError) as e:
                    log_event(f"Cache serialization error: {e}", level="WARNING")

            return result

        return wrapper

    return decorator


async def invalidate_cache(prefix: str, *args, **kwargs):
    if args or kwargs:
        cache_key = cache_service.generate_key(prefix, *args, **kwargs)
        await cache_service.delete(cache_key)
    else:
        pattern = f"{prefix}:*"
        count = await cache_service.delete_pattern(pattern)
        if count > 0:
            log_event(
                f"Invalidated {count} cache entries matching {pattern}", level="INFO"
            )


import asyncio
