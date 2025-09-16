import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.utils.logger import log_event
from app.services.metrics import app_metrics
from app.config import settings


class PrometheusMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/metrics", "/health/metrics"]:
            return await call_next(request)
            
        start_time = time.time()
        
        request_size = 0
        if hasattr(request, 'headers') and 'content-length' in request.headers:
            try:
                request_size = int(request.headers['content-length'])
            except (ValueError, TypeError):
                request_size = 0
        
        method = request.method
        endpoint = self._normalize_endpoint(request.url.path)
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        status_code = response.status_code
        
        response_size = 0
        if hasattr(response, 'headers') and 'content-length' in response.headers:
            try:
                response_size = int(response.headers['content-length'])
            except (ValueError, TypeError):
                response_size = 0
        
        app_metrics.record_http_request(
            method=method,
            endpoint=endpoint,
            status_code=status_code,
            duration=duration,
            request_size=request_size,
            response_size=response_size
        )
        
        return response
    
    def _normalize_endpoint(self, path: str) -> str:
        if not path or path == "/":
            return "/"
            
        path = path.split('?')[0]
        
        segments = [seg for seg in path.split('/') if seg]
        
        if not segments:
            return "/"
            
        normalized_segments = []

        for segment in segments:
            if self._is_id_like(segment):
                normalized_segments.append("{id}")
            else:
                normalized_segments.append(segment)
                
        return "/" + "/".join(normalized_segments)
    
    def _is_id_like(self, segment: str) -> bool:
        if segment.isdigit():
            return True
            
        try:
            uuid.UUID(segment)
            return True
        except ValueError:
            pass
            
        if len(segment) > 8 and segment.replace('-', '').replace('_', '').isalnum():
            return True
            
        return False


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
        request.state.correlation_id = correlation_id
        response = await call_next(request)
        response.headers['X-Correlation-ID'] = correlation_id
        return response


class DetailedLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        correlation_id = getattr(request.state, 'correlation_id', 'unknown')
        
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get('user-agent', 'unknown')
        
        if settings.environment == "development" or settings.log_level == "DEBUG":
            log_event(f"[{correlation_id}] {request.method} {request.url.path} - Start - IP: {client_ip} - UA: {user_agent[:50]}", level="DEBUG")
        
        try:
            response = await call_next(request)
            
            duration = time.time() - start_time
            
            status_code = response.status_code
            if status_code >= 400 or duration > 1.0:
                log_event(f"[{correlation_id}] {request.method} {request.url.path} - "
                         f"{status_code} - {duration:.3f}s - IP: {client_ip} - UA: {user_agent[:50]}", 
                         level="WARNING" if status_code >= 400 else "INFO")
                      
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            log_event(f"[{correlation_id}] {request.method} {request.url.path} - "
                     f"ERROR: {str(e)} - {duration:.3f}s - IP: {client_ip} - UA: {user_agent[:50]}", 
                     level="ERROR")
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
            
        forwarded = request.headers.get('x-forwarded')
        if forwarded:
            return forwarded.split(',')[0].strip()
            
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
            
        if hasattr(request, 'client') and request.client:
            return request.client.host
            
        return 'unknown'