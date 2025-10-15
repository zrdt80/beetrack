from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from app.utils.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from app.routers import (
    users,
    products,
    hives,
    inspections,
    orders,
    export,
    stats,
    logs,
    role_requests,
    apiaries,
    monitoring,
)
from app.routers import admin_monitoring, dashboard, admin_rbac
from app.services.scheduler import start_scheduler
from app.config import settings
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from app.schemas import ErrorResponse, ErrorDetail
from contextlib import asynccontextmanager

from app.middleware.rate_limiting import GlobalRateLimitMiddleware
from app.middleware.security import (
    SecurityHeadersMiddleware,
    CORSSecurityMiddleware,
    IPFilteringMiddleware,
)
from app.middleware.monitoring import (
    PrometheusMiddleware,
    CorrelationIdMiddleware,
    DetailedLoggingMiddleware,
)
from app.telemetry import init_tracing, instrument_fastapi_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.enable_scheduler:
        start_scheduler()

    if settings.metrics_enabled and settings.system_metrics_collection:
        from app.services.metrics import app_metrics
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        metrics_scheduler = BackgroundScheduler()
        metrics_scheduler.add_job(
            func=app_metrics.update_system_metrics,
            trigger=IntervalTrigger(seconds=settings.metrics_update_interval),
            id="system_metrics_update",
            name="Update system metrics",
            replace_existing=True,
        )
        metrics_scheduler.start()

    yield


app = FastAPI(
    title="BeeTrack API",
    description="Apiary and order management system for beekeepers",
    version="1.0.0",
    lifespan=lifespan,
)


init_tracing(service_name="beetrack-api")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    details = [
        ErrorDetail(
            loc=[str(p) for p in err.get("loc", [])],
            msg=err.get("msg", ""),
            type=err.get("type"),
        )
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            code="VALIDATION_ERROR", message="Validation failed", details=details
        ).model_dump(),
    )


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
    message = (
        exc.detail if isinstance(exc.detail, str) else code.replace("_", " ").title()
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse.simple(code, message).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=ErrorResponse.simple(
            "INTERNAL_ERROR", "Internal server error"
        ).model_dump(),
    )


if settings.detailed_logging_enabled:
    app.add_middleware(DetailedLoggingMiddleware)

if settings.correlation_ids_enabled:
    app.add_middleware(CorrelationIdMiddleware)

if settings.metrics_enabled:
    app.add_middleware(PrometheusMiddleware)

app.add_middleware(GlobalRateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CORSSecurityMiddleware)
app.add_middleware(IPFilteringMiddleware)

app.mount("/static", StaticFiles(directory="static"), name="static")

instrument_fastapi_app(app)

app.include_router(monitoring.router, tags=["Monitoring"])
app.include_router(admin_monitoring.router)
app.include_router(admin_rbac.router)
app.include_router(dashboard.router)
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(hives.router, prefix="/hives", tags=["Hives"])
app.include_router(inspections.router, prefix="/inspections", tags=["Inspections"])
app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(stats.router, prefix="/stats", tags=["Statistics"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
app.include_router(
    role_requests.router, prefix="/role-requests", tags=["Role Requests"]
)
app.include_router(apiaries.router, prefix="/apiaries", tags=["Apiaries"])
