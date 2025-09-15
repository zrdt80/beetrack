from typing import Dict, List
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.config import settings
from app.utils.logger import log_event


class SecurityHeadersMiddleware(BaseHTTPMiddleware):    
    def __init__(self, app):
        super().__init__(app)
        self.security_headers = self._get_security_headers()
    
    def _get_security_headers(self) -> Dict[str, str]:
        headers = {
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-Permitted-Cross-Domain-Policies": "none",
            "Server": "BeeTrack"
        }
        
        if settings.environment == "production":
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
            
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        else:
            headers["Content-Security-Policy"] = (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "connect-src 'self' ws: wss:; "
                "frame-ancestors 'none'"
            )
        
        return headers
    
    def _should_add_headers(self, request: Request) -> bool:
        return not request.url.path.startswith("/health")
    
    async def dispatch(self, request: Request, call_next):
        if not settings.security_headers_enabled:
            return await call_next(request)
        
        response = await call_next(request)
        
        if self._should_add_headers(request):
            for header, value in self.security_headers.items():
                response.headers[header] = value
        
        return response


class CORSSecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.allowed_origins = self._get_allowed_origins()
        self.allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
        self.allowed_headers = [
            "Accept",
            "Accept-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token"
        ]
        self.expose_headers = [
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining", 
            "X-RateLimit-Reset",
            "X-Session-Revoked"
        ]
    
    def _get_allowed_origins(self) -> List[str]:
        if settings.environment == "production":
            return settings.cors_allowed_origins
        else:
            base_origins = settings.cors_allowed_origins
            dev_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
            return list(set(base_origins + dev_origins))
    
    def _is_allowed_origin(self, origin: str) -> bool:
        if not origin:
            return False
        
        if origin in self.allowed_origins:
            return True
        
        if settings.environment != "production":
            if origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
                return True
        
        return False
    
    def _add_cors_headers(self, response: Response, origin: str = None):
        if origin and self._is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = self.allowed_origins[0] if self.allowed_origins else "*"
        
        response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allowed_methods)
        response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allowed_headers)
        response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "86400"
    
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("Origin")
        
        if request.method == "OPTIONS":
            from starlette.responses import Response
            response = Response()
            self._add_cors_headers(response, origin)
            return response
        
        response = await call_next(request)
        
        self._add_cors_headers(response, origin)
        
        return response


class IPFilteringMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.blocked_ips = set()
        self.whitelisted_ips = set()
    
    def _get_client_ip(self, request: Request) -> str:
        forwarded_for = request.headers.get("X-Forwarded-For")
        real_ip = request.headers.get("X-Real-IP")
        
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        elif real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _is_ip_blocked(self, ip: str) -> bool:
        if ip in self.whitelisted_ips:
            return False
        
        return ip in self.blocked_ips
    
    async def dispatch(self, request: Request, call_next):
        ip = self._get_client_ip(request)
        
        if self._is_ip_blocked(ip):
            log_event(f"Blocked request from IP {ip} to {request.url.path}", level="WARNING")
            
            from starlette.responses import JSONResponse
            return JSONResponse(
                content={
                    "code": "ACCESS_DENIED",
                    "message": "Access denied",
                    "details": None,
                    "trace_id": None
                },
                status_code=403
            )
        
        return await call_next(request)
    
    def block_ip(self, ip: str):
        self.blocked_ips.add(ip)
        log_event(f"IP {ip} added to block list", level="INFO")
    
    def unblock_ip(self, ip: str):
        self.blocked_ips.discard(ip)
        log_event(f"IP {ip} removed from block list", level="INFO")
    
    def whitelist_ip(self, ip: str):
        self.whitelisted_ips.add(ip)
        log_event(f"IP {ip} added to whitelist", level="INFO")
