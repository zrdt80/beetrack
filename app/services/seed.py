from sqlalchemy.orm import Session
from sqlalchemy import inspect
from app import models
from app.utils.hashing import Hasher
from datetime import datetime


def run_seed(db: Session):
    inspector = inspect(db.bind)
    if "users" not in inspector.get_table_names():
        print("⚠️ Tabela users nie istnieje – seed pominięty.")
        return

    # Sprawdź, czy użytkownicy już istnieją
    if db.query(models.User).first():
        print("ℹ️ Seed danych pominięty – użytkownicy już istnieją.")
        return
    
    print("🌱 Uruchamiam seed danych...")

    # Dodaj admina
    admin = models.User(
        username="admin",
        email="admin@beetrack.local",
        hashed_password=Hasher.hash_password("admin123"),
        role="admin"
    )

    worker = models.User(
        username="worker",
        email="worker@beetrack.local",
        hashed_password=Hasher.hash_password("worker123"),
        role="worker"
    )

    # Produkty
    product1 = models.Product(
        name="Miód lipowy",
        description="Delikatny, jasny miód z lipy",
        unit_price=25.0,
        stock_quantity=100
    )
    product2 = models.Product(
        name="Miód gryczany",
        description="Ciemny, intensywny miód z gryki",
        unit_price=30.0,
        stock_quantity=80
    )

    # Ule
    hive1 = models.Hive(name="UL-001", location="Pasieka północna", status="active")
    hive2 = models.Hive(name="UL-002", location="Pasieka południowa", status="active")

    # Inspekcja testowa
    inspection1 = models.Inspection(
        hive=hive1,
        date=datetime.utcnow(),
        temperature=33.5,
        disease_detected="none",
        notes="Stan bardzo dobry."
    )

    # Dodaj wszystko do bazy
    db.add_all([admin, worker, product1, product2, hive1, hive2, inspection1])
    db.commit()

    print("✅ Seed danych zakończony.")
