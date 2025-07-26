from fastapi import FastAPI
from app.database import Base, engine
from app.routers import users, products, hives, inspections, orders, export, stats
from app.services.scheduler import start_scheduler

start_scheduler()

app = FastAPI(
    title="BeeTrack API",
    description="Apiary and order management system for beekeepers",
    version="1.0.0"
)

# Automatyczne tworzenie tabel – tylko na etapie rozwoju
# Base.metadata.create_all(bind=engine)

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(hives.router, prefix="/hives", tags=["Hives"])
app.include_router(inspections.router, prefix="/inspections", tags=["Inspections"])
app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(stats.router, prefix="/stats", tags=["Statistics"])
