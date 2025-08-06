from sqlalchemy.orm import Session
from sqlalchemy import inspect
from app import models
from app.utils.hashing import Hasher
from app.utils.logger import log_event
from datetime import datetime
import json
import os

def run_seed(db: Session):
    inspector = inspect(db.bind)
    if "users" not in inspector.get_table_names():
        print("⚠️ Table 'users' does not exist – seed skipped.")
        log_event("Seed skipped: users table does not exist")
        return

    if db.query(models.User).first():
        print("ℹ️ Seeding skipped – users already exist.")
        log_event("Seed skipped: users already exist")
        return

    print("🌱 Running data seed...")
    log_event("Data seeding started")

    seed_file = os.path.join(os.path.dirname(__file__), "seed_data.json")
    with open(seed_file, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    users = []
    for user in seed_data.get("users", []):
        users.append(models.User(
            username=user["username"],
            email=user["email"],
            hashed_password=Hasher.hash_password(user["password"]),
            role=user["role"]
        ))
    db.add_all(users)
    log_event(f"Seeded {len(users)} users")

    products = []
    for product in seed_data.get("products", []):
        products.append(models.Product(
            name=product["name"],
            description=product["description"],
            unit_price=product["unit_price"],
            stock_quantity=product["stock_quantity"]
        ))
    db.add_all(products)
    log_event(f"Seeded {len(products)} products")

    hives = []
    for hive in seed_data.get("hives", []):
        hives.append(models.Hive(
            name=hive["name"],
            location=hive["location"],
            status=hive["status"],
            last_inspection_date=datetime.fromisoformat(hive["last_inspection_date"]),
        ))
    db.add_all(hives)
    db.commit()
    log_event(f"Seeded {len(hives)} hives")

    inspections_count = 0
    for inspection in seed_data.get("inspections", []):
        hive_obj = db.query(models.Hive).filter_by(id=inspection["hive_id"]).first()
        db.add(models.Inspection(
            hive=hive_obj,
            date=datetime.fromisoformat(inspection["date"]),
            temperature=inspection["temperature"],
            disease_detected=inspection["disease_detected"],
            notes=inspection["notes"]
        ))
        inspections_count += 1
    log_event(f"Seeded {inspections_count} inspections")

    orders_count = 0
    for order in seed_data.get("orders", []):
        db.add(models.Order(
            user_id=order["user_id"],
            date=datetime.fromisoformat(order["date"]),
            status=order["status"],
            total_price=order["total_price"],
            items=[models.OrderItem(
                product_id=item["product_id"],
                quantity=item["quantity"],
                price_each=item["price_each"]
            ) for item in order.get("items", [])]
        ))
        orders_count += 1
    db.commit()
    log_event(f"Seeded {orders_count} orders")

    print("✅ Data seeding completed.")
    log_event("Data seeding completed successfully")
