from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.config import settings
from app.services.metrics import app_metrics, get_current_metrics_summary

router = APIRouter()


@router.get("/metrics")
async def get_metrics():
    if not settings.prometheus_endpoint_enabled:
        raise HTTPException(status_code=404, detail="Metrics endpoint disabled")
        
    metrics_data = app_metrics.get_metrics_text()
    return Response(
        content=metrics_data,
        media_type=app_metrics.get_metrics_content_type()
    )


@router.get("/health")
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


@router.get("/health/detailed")
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


@router.get("/health/metrics")
async def health_metrics():
    from app.services.auth_security import auth_failure_tracker
    
    failure_stats = auth_failure_tracker.get_failure_stats()
    system_metrics = get_current_metrics_summary()
    
    return {
        "status": "healthy",
        "timestamp": system_metrics.get("timestamp"),
        "performance": {
            "system": system_metrics.get("system", {}),
            "application": system_metrics.get("application", {})
        },
        "security": {
            "failure_tracking": failure_stats,
            "rate_limiting": {
                "enabled": settings.rate_limiting_enabled,
                "requests_per_minute": settings.rate_limit_requests_per_minute
            }
        },
        "monitoring": {
            "prometheus_enabled": settings.prometheus_endpoint_enabled,
            "correlation_ids_enabled": settings.correlation_ids_enabled,
            "detailed_logging_enabled": settings.detailed_logging_enabled,
            "metrics_update_interval": settings.metrics_update_interval
        }
    }