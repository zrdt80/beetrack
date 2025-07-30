from sqlalchemy.orm import Session
from sqlalchemy import inspect
from app import models
from app.utils.hashing import Hasher
from datetime import datetime
import json
import os

def run_seed(db: Session):
    inspector = inspect(db.bind)
    if "users" not in inspector.get_table_names():
        print("⚠️ Table 'users' does not exist – seed skipped.")
        return

    if db.query(models.User).first():
        print("ℹ️ Seeding skipped – users already exist.")
        return

    print("🌱 Running data seed...")

    # Load seed data from JSON file
    seed_file = os.path.join(os.path.dirname(__file__), "seed_data.json")
    with open(seed_file, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    # Insert users
    users = []
    for user in seed_data.get("users", []):
        users.append(models.User(
            username=user["username"],
            email=user["email"],
            hashed_password=Hasher.hash_password(user["password"]),
            role=user["role"]
        ))
    db.add_all(users)

    # Insert products
    products = []
    for product in seed_data.get("products", []):
        products.append(models.Product(
            name=product["name"],
            description=product["description"],
            unit_price=product["unit_price"],
            stock_quantity=product["stock_quantity"]
        ))
    db.add_all(products)

    # Insert hives
    hives = []
    for hive in seed_data.get("hives", []):
        hives.append(models.Hive(
            name=hive["name"],
            location=hive["location"],
            status=hive["status"]
        ))
    db.add_all(hives)
    db.commit()

    # Insert inspections (assign hive by name)
    for inspection in seed_data.get("inspections", []):
        hive_obj = db.query(models.Hive).filter_by(name=inspection["hive_name"]).first()
        db.add(models.Inspection(
            hive=hive_obj,
            date=datetime.fromisoformat(inspection["date"]),
            temperature=inspection["temperature"],
            disease_detected=inspection["disease_detected"],
            notes=inspection["notes"]
        ))

    # Insert orders
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
    db.commit()

    print("✅ Data seeding completed.")
