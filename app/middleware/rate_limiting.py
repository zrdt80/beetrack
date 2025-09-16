import time
from typing import Dict, Tuple
from datetime import datetime
from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.config import settings
from app.utils.logger import log_event, record_audit_event
import asyncio


class InMemoryRateLimiter:
    def __init__(self):
        self._storage: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, key: str, limit: int, window_seconds: int = 60) -> Tuple[bool, Dict]:
        async with self._lock:
            now = time.time()
            window_start = now - window_seconds
            
            if key not in self._storage:
                self._storage[key] = {
                    'requests': [],
                    'first_request': now,
                    'last_request': now,
                    'total_requests': 0
                }
            
            bucket = self._storage[key]
            
            bucket['requests'] = [req_time for req_time in bucket['requests'] if req_time > window_start]
            
            current_count = len(bucket['requests'])
            remaining = max(0, limit - current_count)
            
            bucket['last_request'] = now
            bucket['total_requests'] += 1
            
            metadata = {
                'current_count': current_count,
                'limit': limit,
                'remaining': remaining,
                'reset_time': int(window_start + window_seconds),
                'total_requests': bucket['total_requests'],
                'window_seconds': window_seconds
            }
            
            if current_count >= limit:
                return False, metadata
            
            bucket['requests'].append(now)
            metadata['current_count'] = current_count + 1
            metadata['remaining'] = remaining - 1
            
            return True, metadata

    async def cleanup_expired(self):
        async with self._lock:
            now = time.time()
            expired_keys = []
            
            for key, bucket in self._storage.items():
                if now - bucket['last_request'] > 86400:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self._storage[key]


class RedisRateLimiter:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            try:
                import redis.asyncio as redis
                self._redis = redis.from_url(self.redis_url, decode_responses=True)
            except ImportError:
                log_event("Redis not available, falling back to memory storage", level="WARNING")
                return None
        return self._redis
    
    async def is_allowed(self, key: str, limit: int, window_seconds: int = 60) -> Tuple[bool, Dict]:
        redis = await self._get_redis()
        if redis is None:
            fallback = InMemoryRateLimiter()
            return await fallback.is_allowed(key, limit, window_seconds)
        
        try:
            now = time.time()
            window_start = now - window_seconds
            
            pipe = redis.pipeline()
            
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window_seconds + 1)
            
            results = await pipe.execute()
            current_count = results[1]
            
            remaining = max(0, limit - current_count)
            
            metadata = {
                'current_count': current_count + 1,
                'limit': limit,
                'remaining': remaining - 1,
                'reset_time': int(now + window_seconds),
                'window_seconds': window_seconds
            }
            
            if current_count >= limit:
                await redis.zrem(key, str(now))
                metadata['current_count'] = current_count
                metadata['remaining'] = remaining
                return False, metadata
            
            return True, metadata
            
        except Exception as e:
            log_event(f"Redis rate limiter error: {e}", level="ERROR")
            return True, {'error': 'rate_limiter_unavailable'}


class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.limiter = self._create_limiter()
        self._suspicious_ips: Dict[str, datetime] = {}
    
    def _create_limiter(self):
        if settings.rate_limit_storage == "redis":
            return RedisRateLimiter(settings.redis_url)
        return InMemoryRateLimiter()
    
    def _get_client_ip(self, request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        real_ip = request.headers.get("X-Real-IP")
        
        if forwarded_for and self._is_trusted_proxy(request.client.host):
            return forwarded_for.split(",")[0].strip()
        elif real_ip and self._is_trusted_proxy(request.client.host):
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _is_trusted_proxy(self, ip: str) -> bool:
        return ip in settings.trusted_proxies if settings.trusted_proxies else True
    
    def _get_rate_limit_key(self, request: Request, ip: str) -> str:
        path = request.url.path
        
        if path.startswith("/users/login") or path.startswith("/users/register"):
            return f"auth:{ip}"
        elif path.startswith("/users/"):
            return f"users:{ip}"
        else:
            return f"general:{ip}"
    
    def _get_rate_limit_for_endpoint(self, request: Request) -> Tuple[int, int]:
        path = request.url.path
        
        if path.startswith("/users/login") or path.startswith("/users/register"):
            return 10, 60
        elif path.startswith("/users/"):
            return 30, 60
        else:
            return settings.rate_limit_requests_per_minute, 60
    
    def _is_suspicious_activity(self, ip: str, metadata: Dict) -> bool:
        if not metadata or 'current_count' not in metadata:
            return False
        
        current_count = metadata['current_count']
        
        if current_count > settings.suspicious_activity_threshold:
            return True
        
        if current_count > settings.rate_limit_burst_requests:
            if ip in self._suspicious_ips:
                last_flagged = self._suspicious_ips[ip]
                if (datetime.now() - last_flagged).total_seconds() < 60:
                    return True
        
        return False
    
    def _create_rate_limit_response(self, metadata: Dict, suspicious: bool = False) -> JSONResponse:
        from app.services.metrics import app_metrics
        
        status_code = status.HTTP_429_TOO_MANY_REQUESTS
        
        limit_type = "suspicious" if suspicious else "standard"
        endpoint = metadata.get('endpoint', 'unknown')
        app_metrics.record_rate_limit_hit(endpoint, limit_type)
        
        if suspicious:
            app_metrics.record_suspicious_activity("rate_limit_exceeded", "medium")
        
        headers = {
            "X-RateLimit-Limit": str(metadata.get('limit', 0)),
            "X-RateLimit-Remaining": str(metadata.get('remaining', 0)),
            "X-RateLimit-Reset": str(metadata.get('reset_time', 0)),
            "Retry-After": str(metadata.get('window_seconds', 60))
        }
        
        if suspicious:
            headers["X-Security-Alert"] = "suspicious-activity-detected"
            status_code = status.HTTP_403_FORBIDDEN
        
        content = {
            "code": "RATE_LIMITED" if not suspicious else "SUSPICIOUS_ACTIVITY",
            "message": "Rate limit exceeded. Please try again later." if not suspicious else "Suspicious activity detected. Access temporarily restricted.",
            "details": {
                "limit": metadata.get('limit'),
                "window_seconds": metadata.get('window_seconds'),
                "reset_time": metadata.get('reset_time')
            } if not suspicious else None,
            "trace_id": None
        }
        
        return JSONResponse(content=content, status_code=status_code, headers=headers)
    
    async def dispatch(self, request: Request, call_next):
        if not settings.rate_limiting_enabled:
            return await call_next(request)
        
        if request.url.path in ["/health", "/docs", "/openapi.json"] or request.url.path.startswith("/static/"):
            return await call_next(request)
        
        ip = self._get_client_ip(request)
        rate_key = self._get_rate_limit_key(request, ip)
        limit, window = self._get_rate_limit_for_endpoint(request)
        
        try:
            allowed, metadata = await self.limiter.is_allowed(rate_key, limit, window)
            
            if not allowed:
                suspicious = self._is_suspicious_activity(ip, metadata)
                
                if suspicious:
                    self._suspicious_ips[ip] = datetime.now()
                    log_event(f"Suspicious activity detected from IP {ip}: {metadata.get('current_count', 0)} requests", level="WARNING")
                    record_audit_event("SUSPICIOUS_ACTIVITY", metadata={
                        "ip_address": ip,
                        "requests_count": metadata.get('current_count', 0),
                        "endpoint": request.url.path,
                        "user_agent": request.headers.get("user-agent", "")
                    }, ip=ip, user_agent=request.headers.get("user-agent"))
                
                log_event(f"Rate limit exceeded for IP {ip} on {request.url.path}: {metadata.get('current_count', 0)}/{limit}")
                return self._create_rate_limit_response(metadata, suspicious)
            
            response = await call_next(request)
            
            if metadata and 'limit' in metadata:
                response.headers["X-RateLimit-Limit"] = str(metadata['limit'])
                response.headers["X-RateLimit-Remaining"] = str(metadata['remaining'])
                response.headers["X-RateLimit-Reset"] = str(metadata['reset_time'])
            
            return response
            
        except Exception as e:
            log_event(f"Rate limiting middleware error: {e}", level="ERROR")
            return await call_next(request)
