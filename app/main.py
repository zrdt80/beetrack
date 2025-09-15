from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from app.utils.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from app.routers import users, products, hives, inspections, orders, export, stats, logs, role_requests, apiaries
from app.services.scheduler import start_scheduler
from app.config import settings
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from app.schemas import ErrorResponse, ErrorDetail

from app.middleware.rate_limiting import GlobalRateLimitMiddleware
from app.middleware.security import SecurityHeadersMiddleware, CORSSecurityMiddleware, IPFilteringMiddleware

app = FastAPI(
    title="BeeTrack API",
    description="Apiary and order management system for beekeepers",
    version="1.0.0"
)


@app.on_event("startup")
def _startup():
    if settings.enable_scheduler:
        start_scheduler()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    details = [ErrorDetail(loc=[str(p) for p in err.get('loc', [])], msg=err.get('msg', ''), type=err.get('type')) for err in exc.errors()]  # type: ignore[arg-type]
    return JSONResponse(status_code=422, content=ErrorResponse(code="VALIDATION_ERROR", message="Validation failed", details=details).model_dump())


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        422: "UNPROCESSABLE_ENTITY",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else code.replace("_", " ").title()
    return JSONResponse(status_code=exc.status_code, content=ErrorResponse.simple(code, message).model_dump())


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content=ErrorResponse.simple("INTERNAL_ERROR", "Internal server error").model_dump())

app.add_middleware(GlobalRateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CORSSecurityMiddleware)
app.add_middleware(IPFilteringMiddleware)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/health")
async def health_check():
    from app.services.auth_security import auth_failure_tracker
    
    failure_stats = auth_failure_tracker.get_failure_stats()
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.environment,
        "security": {
            "rate_limiting_enabled": settings.rate_limiting_enabled,
            "security_headers_enabled": settings.security_headers_enabled,
            "tracked_failures": failure_stats['total_tracked_combinations'],
            "currently_locked": failure_stats['currently_locked'],
            "suspicious_ips": failure_stats['suspicious_ips']
        }
    }

@app.get("/health/detailed")
async def detailed_health_check():
    from app.services.auth_security import auth_failure_tracker
    from app.database import get_db
    
    try:
        db = next(get_db())
        try:
            from app.models import User
            _user_count = db.query(User).count()
            db_status = "connected"
        finally:
            db.close()
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    failure_stats = auth_failure_tracker.get_failure_stats()
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "checks": {
            "database": db_status,
            "rate_limiter": "active" if settings.rate_limiting_enabled else "disabled",
            "scheduler": "active" if settings.enable_scheduler else "disabled"
        },
        "security_metrics": failure_stats,
        "configuration": {
            "environment": settings.environment,
            "rate_limit_per_minute": settings.rate_limit_requests_per_minute,
            "max_login_attempts": settings.max_login_attempts,
            "lockout_duration_minutes": settings.lockout_duration_minutes
        }
    }

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(hives.router, prefix="/hives", tags=["Hives"])
app.include_router(inspections.router, prefix="/inspections", tags=["Inspections"])
app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(stats.router, prefix="/stats", tags=["Statistics"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(role_requests.router, prefix="/role-requests", tags=["Role Requests"])
app.include_router(apiaries.router, prefix="/apiaries", tags=["Apiaries"])
