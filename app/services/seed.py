from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from datetime import datetime, timedelta, timezone
import json
import random
import os

from app import models
from sqlalchemy import func
from app.utils.hashing import Hasher
from app.utils.logger import log_event
from app.database import Base, engine
from app.services.rbac_init import initialize_rbac_system, verify_rbac_setup

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
                "TRUNCATE TABLE order_items, orders, user_sessions, inspections, apiary_invitations, apiary_members, hives, apiaries, products, role_change_requests, logs, users RESTART IDENTITY CASCADE"
            ))
        else:
            ordered_tables = [
                models.OrderItem.__table__,
                models.Order.__table__,
                models.UserSession.__table__,
                models.Inspection.__table__,
                models.ApiaryInvitation.__table__,
                models.ApiaryMember.__table__,
                models.Hive.__table__,
                models.Apiary.__table__,
                models.Product.__table__,
                models.Log.__table__,
                models.RoleChangeRequest.__table__,
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
    db.commit()
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
    db.commit()
    log_event(f"Seeded {len(products_payload)} products")


def _seed_apiaries(db: Session, seed_data: dict):
    users_by_username = {u.username.lower(): u for u in db.query(models.User).all()}
    created_apiaries: list[models.Apiary] = []
    for apiary in seed_data.get("apiaries", []):
        owner_name = (apiary.get("owner") or "").lower()
        owner = users_by_username.get(owner_name)
        if not owner:
            continue
        obj = models.Apiary(
            name=apiary["name"],
            location=apiary.get("location"),
            description=apiary.get("description"),
            owner_id=owner.id,
        )
        db.add(obj)
        created_apiaries.append(obj)
    if created_apiaries:
        db.flush()
        for a in created_apiaries:
            db.add(
                models.ApiaryMember(
                    apiary_id=a.id,
                    user_id=a.owner_id,
                    role=models.ApiaryRole.owner,
                    is_active=True,
                )
            )
        db.commit()
    log_event(f"Seeded {len(created_apiaries)} apiaries (+owner memberships)")


def _seed_apiary_members(db: Session, seed_data: dict):
    if not seed_data.get("apiary_members"):
        return
    apiaries_by_name = {a.name: a for a in db.query(models.Apiary).all()}
    users_by_username = {u.username.lower(): u for u in db.query(models.User).all()}
    created = 0
    for m in seed_data.get("apiary_members", []):
        apiary = apiaries_by_name.get(m.get("apiary"))
        user = users_by_username.get((m.get("username") or "").lower())
        if not apiary or not user:
            continue
        existing = db.query(models.ApiaryMember).filter_by(apiary_id=apiary.id, user_id=user.id).first()
        if existing:
            continue
        role_value = (m.get("role") or "worker").lower()
        try:
            role = models.ApiaryRole(role_value)
        except Exception:
            role = models.ApiaryRole.worker
        db.add(models.ApiaryMember(apiary_id=apiary.id, user_id=user.id, role=role, is_active=True))
        created += 1
    if created:
        db.commit()
        log_event(f"Seeded {created} apiary members")


def _seed_hives(db: Session, seed_data: dict):
    apiary_by_name = {a.name: a.id for a in db.query(models.Apiary).all()}
    hives_payload = []
    for hive in seed_data.get("hives", []):
        apiary_key = hive.get("location") or hive.get("apiary")
        apiary_id = apiary_by_name.get(apiary_key)
        if apiary_id is None:
            continue
        lid = hive.get("last_inspection_date")
        lid_dt = None
        if lid:
            try:
                lid_dt = datetime.fromisoformat(lid.replace("Z", "+00:00"))
            except Exception:
                lid_dt = None
        hives_payload.append(models.Hive(
            name=hive["name"],
            status=hive.get("status", "active"),
            last_inspection_date=lid_dt,
            apiary_id=apiary_id,
        ))
    db.add_all(hives_payload)
    db.commit()
    log_event(f"Seeded {len(hives_payload)} hives (last_inspection_date deferred)")


def _seed_inspections(db: Session, seed_data: dict):
    ordered_hives = db.query(models.Hive).order_by(models.Hive.id).all()
    if not ordered_hives:
        return
    index_to_real_id: dict[int, int] = {}
    for idx, hive in enumerate(ordered_hives, start=1):
        index_to_real_id[idx] = hive.id
    inspections_count = 0
    for inspection in seed_data.get("inspections", []):
        raw_idx = int(inspection.get("hive_id", 0) or 0)
        real_id = index_to_real_id.get(raw_idx)
        if not real_id:
            continue
        try:
            dt = datetime.fromisoformat(inspection["date"].replace("Z", "+00:00"))
        except Exception:
            dt = datetime.now(timezone.utc)
        db.add(models.Inspection(
            hive_id=real_id,
            date=dt,
            temperature=inspection.get("temperature"),
            disease_detected=inspection.get("disease_detected", "none"),
            notes=inspection.get("notes")
        ))
        inspections_count += 1
    db.commit()
    log_event(f"Seeded {inspections_count} inspections (committed)")


def _recalculate_last_inspection_dates(db: Session):
    results = (
        db.query(models.Inspection.hive_id, func.max(models.Inspection.date))
        .group_by(models.Inspection.hive_id)
        .all()
    )
    max_map = {hid: dt for hid, dt in results}
    hives = db.query(models.Hive).all()
    for hive in hives:
        hive.last_inspection_date = max_map.get(hive.id)
    db.commit()
    log_event("Recalculated last_inspection_date for all hives during seed")


def _seed_orders(db: Session, seed_data: dict):
    user_rows = db.query(models.User.id).order_by(models.User.id).all()
    product_rows = db.query(models.Product.id).order_by(models.Product.id).all()
    if not user_rows or not product_rows:
        log_event("Skip orders seeding: missing users or products")
        return
    user_ids = [u.id for u in user_rows]
    product_ids = [p.id for p in product_rows]

    orders_count = 0
    user_index = 0
    for order in seed_data.get("orders", []):
        real_user_id = user_ids[user_index % len(user_ids)]
        user_index += 1
        items = []
        for item in order.get("items", []):
            try:
                idx = int(item.get("product_id", 1)) - 1
            except Exception:
                idx = 0
            real_product_id = product_ids[idx % len(product_ids)]
            items.append(
                models.OrderItem(
                    product_id=real_product_id,
                    quantity=item.get("quantity", 1),
                    price_each=item.get("price_each", 0.0),
                )
            )
        db.add(
            models.Order(
                user_id=real_user_id,
                date=datetime.fromisoformat(order["date"]),
                status=order["status"],
                total_price=order["total_price"],
                items=items,
            )
        )
        orders_count += 1
    db.commit()
    log_event(f"Seeded {orders_count} orders")


def _seed_role_change_requests(db: Session):
    users = db.query(models.User).order_by(models.User.id).all()
    if not users:
        return
    rng = random.Random(RANDOM_SEED)
    admin_user = next((u for u in users if u.role == models.UserRole.admin), None)

    worker_candidates = [u for u in users if u.role == models.UserRole.worker]
    user_candidates = [u for u in users if u.role == models.UserRole.user]
    if len(worker_candidates) < 4 or len(user_candidates) < 4:
        return
    selected_workers = rng.sample(worker_candidates, 4)
    selected_users = rng.sample(user_candidates, 4)

    window_start = datetime(2025, 1, 7, 7, 0, 0)
    window_end = datetime(2025, 8, 15, 7, 0, 0)

    def random_start():
        span_seconds = int((window_end - window_start).total_seconds())
        offset = rng.randint(0, span_seconds)
        return window_start + timedelta(seconds=offset)

    def next_after(prev: datetime):
        extra_hours = rng.randint(0, 18)
        extra_minutes = rng.randint(0, 59)
        return prev + timedelta(hours=24 + extra_hours, minutes=extra_minutes)

    requests: list[models.RoleChangeRequest] = []

    def add_request(u, created_at: datetime, status, from_role, to_role=models.UserRole.worker, reason_prefix="Pattern seed"):
        r = models.RoleChangeRequest(
            user_id=u.id,
            from_role=from_role,
            to_role=to_role,
            status=status,
            reason=f"{reason_prefix} for {u.username}",
            created_at=created_at,
        )
        if status in (models.RoleRequestStatus.approved, models.RoleRequestStatus.rejected, models.RoleRequestStatus.canceled):
            r.decided_at = created_at + timedelta(hours=rng.randint(2, 8))
            if admin_user:
                r.decided_by = admin_user.id
            if status == models.RoleRequestStatus.approved:
                r.admin_comment = "Approved (pattern)"
            elif status == models.RoleRequestStatus.rejected:
                r.admin_comment = "Rejected (pattern)"
            else:
                r.admin_comment = "Canceled (pattern)"
        return r

    for w in selected_workers:
        current = random_start()
        for i in range(3):
            status = rng.choice([models.RoleRequestStatus.rejected, models.RoleRequestStatus.canceled])
            req = add_request(w, current, status, from_role=models.UserRole.user)
            requests.append(req)
            current = next_after(current)

    for u in selected_users:
        current = random_start()
        for i in range(3):
            status = rng.choice([models.RoleRequestStatus.rejected, models.RoleRequestStatus.canceled])
            req = add_request(u, current, status, from_role=models.UserRole.user)
            requests.append(req)
            current = next_after(current)

    for w in selected_workers:
        related = [r for r in requests if r.user_id == w.id]
        last_time = max(r.created_at for r in related)
        req = add_request(w, next_after(last_time), models.RoleRequestStatus.approved, from_role=models.UserRole.user)
        requests.append(req)

    pending_users = rng.sample(selected_users, 2)
    for u in pending_users:
        related = [r for r in requests if r.user_id == u.id]
        last_time = max(r.created_at for r in related)
        req = add_request(u, next_after(last_time), models.RoleRequestStatus.pending, from_role=models.UserRole.user)
        req.decided_at = None
        req.decided_by = None
        req.admin_comment = None
        requests.append(req)

    requests.sort(key=lambda r: r.created_at)
    db.add_all(requests)
    db.commit()
    log_event(f"Seeded {len(requests)} role change requests (patterned distribution)")


def run_seed(db: Session):
    inspector = inspect(db.bind)
    if "users" not in inspector.get_table_names():
        created = ensure_tables_exist()
        if not created:
            print("⚠️ Table 'users' does not exist – seed skipped.")
            log_event("Seed skipped: users table does not exist")
            return

    rbac_initialized = initialize_rbac_system(db)
    if rbac_initialized:
        rbac_status = verify_rbac_setup(db)
        print(f"🔐 RBAC Status: {rbac_status['status']} - {rbac_status.get('permissions_count', 0)} permissions, {rbac_status.get('roles_count', 0)} roles")
    else:
        print("⚠️ RBAC initialization failed - continuing with data seeding")

    users_exist = db.query(models.User).first() is not None
    if users_exist and not FORCE_RESEED:
        print("ℹ️ Users exist – will skip user seeding and proceed to seed remaining entities if empty.")
        log_event("Users exist – running partial seed for remaining entities")

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

    if not users_exist:
        _seed_users(db, seed_data)
    else:
        log_event("Skip users seeding: already present")

    if not db.query(models.Product).first():
        _seed_products(db, seed_data)
    else:
        log_event("Skip products seeding: already present")

    if not db.query(models.Apiary).first():
        _seed_apiaries(db, seed_data)
    else:
        log_event("Skip apiaries seeding: already present")

    if not db.query(models.ApiaryMember).first():
        _seed_apiary_members(db, seed_data)
    else:
        log_event("Skip apiary members seeding: already present")

    if not db.query(models.Hive).first():
        _seed_hives(db, seed_data)
    else:
        log_event("Skip hives seeding: already present")

    if not db.query(models.Inspection).first():
        _seed_inspections(db, seed_data)
    else:
        log_event("Skip inspections seeding: already present")

    _recalculate_last_inspection_dates(db)

    if not db.query(models.Order).first():
        _seed_orders(db, seed_data)
    else:
        log_event("Skip orders seeding: already present")

    if not db.query(models.RoleChangeRequest).first():
        _seed_role_change_requests(db)
    else:
        log_event("Skip role change requests seeding: already present")

    print("✅ Data seeding completed.")
    log_event("Data seeding completed successfully")
    
    try:
        from app.services.rbac_init import assign_rbac_roles_to_users
        print("🔐 Assigning RBAC roles to seeded users...")
        assign_rbac_roles_to_users(db)
    except Exception as e:
        print(f"⚠️ RBAC role assignment failed: {e}")
        log_event(f"RBAC role assignment failed: {str(e)}")


def backfill_last_inspection_dates(db: Session):
    try:
        results = (
            db.query(models.Inspection.hive_id, func.max(models.Inspection.date))
            .group_by(models.Inspection.hive_id)
            .all()
        )
        max_map = {hid: dt for hid, dt in results}
        updated = 0
        for hive in db.query(models.Hive).all():
            new_dt = max_map.get(hive.id)
            if hive.last_inspection_date != new_dt:
                hive.last_inspection_date = new_dt
                updated += 1
        db.commit()
        log_event(f"Backfill last_inspection_date updated {updated} hives")
        print(f"Backfill complete: updated {updated} hives")
    except Exception as e:
        db.rollback()
        log_event(f"Backfill error: {e}")
        print(f"Backfill error: {e}")
