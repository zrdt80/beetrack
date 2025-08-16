from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from datetime import datetime, timedelta
import json
import random
import os

from app import models
from app.utils.hashing import Hasher
from app.utils.logger import log_event
from app.database import Base, engine

FORCE_RESEED = False
GENERATE_LARGE_DATA = True
RANDOM_SEED = 42
INSPECTIONS_PER_HIVE = 30
ORDERS_COUNT = 400
ORDER_ITEMS_MIN = 1
ORDER_ITEMS_MAX = 7
SEED_FILENAME = "seed_data.json"


def ensure_tables_exist():
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        if "users" not in existing_tables:
            print("⚠️ Tables don't exist. Creating tables directly with SQLAlchemy...")
            log_event("Creating tables with SQLAlchemy (alembic migrations may have failed)")
            Base.metadata.create_all(bind=engine)
            return True
        return False
    except Exception as e:
        print(f"❌ Error checking/creating tables: {e}")
        log_event(f"Error in ensure_tables_exist: {str(e)}")
        return False


def _generate_inspections(base_date: datetime, hives: list) -> list:
    inspections = []
    for hive_index, _hive in enumerate(hives, start=1):
        for i in range(INSPECTIONS_PER_HIVE):
            dt = base_date + timedelta(days=i, hours=(hive_index % 4))
            temp = round(32.0 + random.random() * 2.5, 1)
            disease = random.choices(
                ["none", "varroa", "nosema", "foulbrood"],
                weights=[75, 10, 8, 7]
            )[0]
            notes_lookup = {
                "none": "Normal activity",
                "varroa": "Mites monitored",
                "nosema": "Spore check",
                "foulbrood": "Isolation protocol"
            }
            inspections.append({
                "hive_id": hive_index,
                "date": dt.isoformat() + "Z",
                "temperature": temp,
                "disease_detected": disease,
                "notes": notes_lookup[disease]
            })
    return inspections


def _generate_dense_hive_inspections(base_date: datetime, dense_hives: list, existing: list) -> None:
    extra_days = 40
    for dense_id in dense_hives:
        start_offset = 100
        for d in range(extra_days):
            dt = base_date + timedelta(days=start_offset + d, hours=(dense_id % 5))
            temp = round(32.5 + random.random() * 2.8, 1)
            disease = random.choices(
                ["none", "varroa", "nosema", "foulbrood"],
                weights=[70, 12, 10, 8]
            )[0]
            existing.append({
                "hive_id": dense_id,
                "date": dt.isoformat() + "Z",
                "temperature": temp,
                "disease_detected": disease,
                "notes": f"Extended monitoring {d+1}"
            })


def _generate_orders(order_base: datetime, products: list, users: list) -> list:
    orders = []
    product_count = len(products)
    user_count = len(users)
    for oid in range(ORDERS_COUNT):
        user_id = (oid % user_count) + 1 if user_count else 1
        order_date = order_base + timedelta(minutes=30 * oid)
        status = random.choices(
            ["completed", "pending", "cancelled", "shipped"],
            weights=[55, 20, 5, 20]
        )[0]
        items_count = random.randint(ORDER_ITEMS_MIN, ORDER_ITEMS_MAX)
        chosen_products = (
            random.sample(range(1, product_count + 1), k=min(items_count, product_count))
            if product_count else []
        )
        items = []
        total = 0.0
        for pid in chosen_products:
            try:
                unit_price = float(products[pid - 1]["unit_price"])
            except Exception:
                unit_price = 10.0
            quantity = random.randint(1, 5)
            items.append({
                "product_id": pid,
                "quantity": quantity,
                "price_each": unit_price
            })
            total += unit_price * quantity
        orders.append({
            "user_id": user_id,
            "date": order_date.isoformat() + "Z",
            "status": status,
            "total_price": round(total, 2),
            "items": items
        })
    return orders


def _generate_large_data(base_seed: dict) -> dict:
    random.seed(RANDOM_SEED)
    users = base_seed.get("users", [])
    products = base_seed.get("products", [])
    hives = base_seed.get("hives", [])

    base_date = datetime(2025, 7, 1, 8, 0, 0)
    inspections = _generate_inspections(base_date, hives)
    _generate_dense_hive_inspections(base_date, dense_hives=[1, 2], existing=inspections)

    order_base = datetime(2025, 7, 1, 12, 0, 0)
    orders = _generate_orders(order_base, products, users)

    generated = dict(base_seed)
    generated["inspections"] = inspections
    generated["orders"] = orders
    return generated


def _build_seed_file_path() -> str:
    base_dir = os.path.dirname(__file__)
    return os.path.join(base_dir, SEED_FILENAME)


def _load_seed_data() -> dict:
    seed_file = _build_seed_file_path()
    with open(seed_file, "r", encoding="utf-8") as f:
        return json.load(f)


def _clear_existing_data(db: Session):
    print("♻️ FORCE_RESEED=True: clearing existing data...")
    log_event("Force reseed initiated: clearing tables")
    dialect = db.bind.dialect.name
    try:
        if dialect == "postgresql":
            db.execute(text(
                "TRUNCATE TABLE order_items, orders, user_sessions, inspections, hives, products, logs, users RESTART IDENTITY CASCADE"
            ))
        else:
            ordered_tables = [
                models.OrderItem.__table__,
                models.Order.__table__,
                models.UserSession.__table__,
                models.Inspection.__table__,
                models.Hive.__table__,
                models.Product.__table__,
                models.Log.__table__,
                models.User.__table__,
            ]
            for table in ordered_tables:
                db.execute(table.delete())
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌ Error clearing data: {e}")
        log_event(f"Error during force reseed clearing: {e}")
        raise


def _seed_users(db: Session, seed_data: dict):
    users_payload = []
    for user in seed_data.get("users", []):
        users_payload.append(models.User(
            username=user["username"],
            email=user["email"],
            hashed_password=Hasher.hash_password(user["password"]),
            role=user["role"]
        ))
    db.add_all(users_payload)
    log_event(f"Seeded {len(users_payload)} users")


def _seed_products(db: Session, seed_data: dict):
    products_payload = []
    for product in seed_data.get("products", []):
        products_payload.append(models.Product(
            name=product["name"],
            description=product["description"],
            unit_price=product["unit_price"],
            stock_quantity=product["stock_quantity"]
        ))
    db.add_all(products_payload)
    log_event(f"Seeded {len(products_payload)} products")


def _seed_hives(db: Session, seed_data: dict):
    hives_payload = []
    for hive in seed_data.get("hives", []):
        hives_payload.append(models.Hive(
            name=hive["name"],
            location=hive["location"],
            status=hive["status"],
            last_inspection_date=datetime.fromisoformat(hive["last_inspection_date"]),
        ))
    db.add_all(hives_payload)
    db.commit()
    log_event(f"Seeded {len(hives_payload)} hives")


def _seed_inspections(db: Session, seed_data: dict):
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


def _seed_orders(db: Session, seed_data: dict):
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


def run_seed(db: Session):
    inspector = inspect(db.bind)
    if "users" not in inspector.get_table_names():
        created = ensure_tables_exist()
        if not created:
            print("⚠️ Table 'users' does not exist – seed skipped.")
            log_event("Seed skipped: users table does not exist")
            return

    if db.query(models.User).first() and not FORCE_RESEED:
        print("ℹ️ Seeding skipped – users already exist (set FORCE_RESEED=True in seed.py to reseed).")
        log_event("Seed skipped: users already exist")
        return

    if FORCE_RESEED:
        try:
            _clear_existing_data(db)
        except Exception:
            return

    print("🌱 Running data seed...")
    log_event("Data seeding started")

    seed_data = _load_seed_data()

    if GENERATE_LARGE_DATA:
        print("🧪 GENERATE_LARGE_DATA=True: building large synthetic dataset in-memory...")
        log_event("Generating large synthetic seed dataset")
        seed_data = _generate_large_data(seed_data)

    _seed_users(db, seed_data)
    _seed_products(db, seed_data)
    _seed_hives(db, seed_data)
    _seed_inspections(db, seed_data)
    _seed_orders(db, seed_data)

    print("✅ Data seeding completed.")
    log_event("Data seeding completed successfully")
