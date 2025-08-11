from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.utils.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from app.database import Base, engine
from app.routers import users, products, hives, inspections, orders, export, stats, logs
from app.services.scheduler import start_scheduler

start_scheduler()

app = FastAPI(
    title="BeeTrack API",
    description="Apiary and order management system for beekeepers",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Revoked", "Content-Disposition"],
)

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(hives.router, prefix="/hives", tags=["Hives"])
app.include_router(inspections.router, prefix="/inspections", tags=["Inspections"])
app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(stats.router, prefix="/stats", tags=["Statistics"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
