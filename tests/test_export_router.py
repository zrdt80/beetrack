import os
from datetime import datetime, timedelta, timezone

import pytest

from app import models, schemas
from app.database import get_db
from app.main import app
from fastapi.testclient import TestClient


def create_product(session, name="Honey", price=10.0, stock=100):
    p = models.Product(name=name, unit_price=price, stock_quantity=stock)
    session.add(p)
    session.flush()
    return p


def create_order(session, user, items, status="completed", date=None):
    o = models.Order(user_id=user.id, status=status, date=date or datetime.now(timezone.utc))
    session.add(o)
    session.flush()
    for product, qty in items:
        session.add(
            models.OrderItem(
                order_id=o.id,
                product_id=product.id,
                quantity=qty,
                price_each=product.unit_price,
            )
        )
    session.flush()
    return o


def create_apiary(session, owner, name="Apiary A", location="Loc A"):
    a = models.Apiary(name=name, owner_id=owner.id, location=location)
    session.add(a)
    session.flush()
    session.add(models.ApiaryMember(apiary_id=a.id, user_id=owner.id, role=models.ApiaryRole.owner, is_active=True))
    session.flush()
    return a


def add_member(session, apiary, user, role=models.ApiaryRole.worker):
    m = models.ApiaryMember(apiary_id=apiary.id, user_id=user.id, role=role, is_active=True)
    session.add(m)
    session.flush()
    return m


def create_hive(session, apiary, name="Hive 1", status="active", last_inspection_date=None):
    h = models.Hive(name=name, apiary_id=apiary.id, status=status, last_inspection_date=last_inspection_date)
    session.add(h)
    session.flush()
    return h


def create_inspection(session, hive, temperature=30.0, disease="none", notes=""):
    ins = models.Inspection(
        hive_id=hive.id,
        temperature=temperature,
        disease_detected=disease,
        notes=notes,
        date=datetime.now(timezone.utc),
    )
    session.add(ins)
    session.flush()
    return ins


def _client_as(session, user):
    def override_get_db():
        try:
            yield session
        finally:
            pass

    def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    from app.services.auth import get_current_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    client = TestClient(app)
    return client


@pytest.fixture(autouse=True)
def _cleanup_exports_dir():
    yield
    if os.path.isdir("exports"):
        try:
            for f in os.listdir("exports"):
                try:
                    os.remove(os.path.join("exports", f))
                except Exception:
                    pass
        except Exception:
            pass


def test_admin_export_orders_csv_success(db_session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.flush()

    p1 = create_product(db_session, name="Clover Honey", price=12.5)
    p2 = create_product(db_session, name="Wildflower Honey", price=9.0)
    create_order(db_session, admin_user, items=[(p1, 2), (p2, 1)], status="completed")

    client = _client_as(db_session, admin_user)
    r = client.get("/export/orders/csv")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    cd = r.headers.get("content-disposition", "")
    assert "attachment; filename=orders.csv" in cd or 'attachment; filename="orders.csv"' in cd
    assert r.content.startswith(b"Order ID,User ID,Date,Status,Product ID,Quantity,Price Each,Total")


def test_admin_export_orders_csv_no_data_returns_404(db_session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.flush()
    client = _client_as(db_session, admin_user)
    r = client.get("/export/orders/csv")
    assert r.status_code == 404
    assert r.json()["message"] == "No orders to export"


def test_admin_export_orders_pdf_success(db_session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.flush()
    p = create_product(db_session, name="Forest Honey", price=11.0)
    create_order(db_session, admin_user, items=[(p, 3)], status="completed")

    client = _client_as(db_session, admin_user)
    r = client.get("/export/orders/pdf")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert int(r.headers.get("content-length", "0")) > 0


def test_admin_export_inspections_pdf_success(db_session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.flush()
    apiary = create_apiary(db_session, admin_user, name="Apiary Admin")
    hive = create_hive(db_session, apiary, name="Hive A")
    create_inspection(db_session, hive, temperature=28.5, disease="none", notes="All good")

    client = _client_as(db_session, admin_user)
    r = client.get("/export/inspections/pdf")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")


def test_admin_export_inspections_pdf_no_data_404(db_session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.flush()
    client = _client_as(db_session, admin_user)
    r = client.get("/export/inspections/pdf")
    assert r.status_code == 404
    assert r.json()["message"] == "No inspections to export"


def test_export_filtered_orders_as_admin_csv_with_filters(db_session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.flush()
    p = create_product(db_session, name="Orange Honey", price=8.5)
    today = datetime.now(timezone.utc)
    create_order(db_session, admin_user, items=[(p, 2)], status="completed", date=today - timedelta(days=1))
    create_order(db_session, admin_user, items=[(p, 1)], status="pending", date=today)

    client = _client_as(db_session, admin_user)
    payload = {
        "start_date": (today - timedelta(days=2)).isoformat(),
        "end_date": (today + timedelta(days=1)).isoformat(),
        "format": "csv",
        "status_filter": ["completed"],
        "user_ids": [admin_user.id],
    }
    r = client.post("/export/filtered/orders", json=payload)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    cd = r.headers.get("content-disposition", "")
    assert cd.endswith('.csv"') or cd.endswith(".csv") or ".csv" in cd
    content = r.content.decode("utf-8")
    assert "completed" in content
    assert "pending" not in content


def test_export_filtered_orders_as_regular_user_only_own(db_session, admin_user, regular_user):
    p = create_product(db_session, name="Acacia", price=7.0)
    create_order(db_session, admin_user, items=[(p, 2)], status="completed")
    create_order(db_session, regular_user, items=[(p, 3)], status="completed")

    client = _client_as(db_session, regular_user)
    r = client.post("/export/filtered/orders", json={"format": "csv"})
    assert r.status_code == 200
    csv_text = r.content.decode("utf-8")
    lines = [ln for ln in csv_text.strip().splitlines() if ln.strip()]
    assert len(lines) >= 2
    header = lines[0].split(",")
    user_id_idx = header.index("User ID")
    for row in lines[1:]:
        cols = row.split(",")
        assert int(cols[user_id_idx]) == regular_user.id


def test_export_filtered_orders_no_match_returns_404(db_session, admin_user):
    client = _client_as(db_session, admin_user)
    payload = {"status_filter": ["shipped"], "format": "csv"}
    r = client.post("/export/filtered/orders", json=payload)
    assert r.status_code == 404
    assert r.json()["message"] == "No orders matched filters or access denied"


def test_export_filtered_inspections_csv_with_permissions(db_session, admin_user, regular_user):
    apiary1 = create_apiary(db_session, admin_user, name="A1")
    apiary2 = create_apiary(db_session, admin_user, name="A2")
    add_member(db_session, apiary1, regular_user)
    h1 = create_hive(db_session, apiary1, name="H1")
    h2 = create_hive(db_session, apiary2, name="H2")
    create_inspection(db_session, h1, temperature=29.0, disease="none")
    create_inspection(db_session, h2, temperature=31.0, disease="varroa")

    client_user = _client_as(db_session, regular_user)
    r_denied = client_user.post(
        "/export/filtered/inspections",
        json={"apiary_ids": [apiary1.id, apiary2.id], "format": "csv"},
    )
    assert r_denied.status_code == 404
    assert r_denied.json()["message"] == "No inspections matched filters or access denied"

    r_ok = client_user.post(
        "/export/filtered/inspections",
        json={"apiary_ids": [apiary1.id], "format": "csv"},
    )
    assert r_ok.status_code == 200
    assert r_ok.headers["content-type"].startswith("text/csv")
    csv_text = r_ok.content.decode("utf-8")
    assert "Hive ID" in csv_text and "," in csv_text


def test_export_filtered_hives_pdf_and_csv(db_session, admin_user, regular_user):
    apiary = create_apiary(db_session, admin_user, name="A3")
    add_member(db_session, apiary, regular_user)
    create_hive(db_session, apiary, name="H-A", last_inspection_date=datetime.now(timezone.utc) - timedelta(days=10))
    create_hive(db_session, apiary, name="H-B", status="inactive")

    client_user = _client_as(db_session, regular_user)
    r_csv = client_user.post(
        "/export/filtered/hives",
        json={"apiary_ids": [apiary.id], "format": "csv", "status_filter": ["active", "inactive"]},
    )
    assert r_csv.status_code == 200
    assert r_csv.headers["content-type"].startswith("text/csv")
    csv_text = r_csv.content.decode("utf-8")
    assert "Hive ID,Name,Apiary ID,Status,Last Inspection" in csv_text

    admin_user.role = models.UserRole.admin
    db_session.flush()
    client_admin = _client_as(db_session, admin_user)
    r_pdf = client_admin.post(
        "/export/filtered/hives",
        json={"apiary_ids": [apiary.id], "format": "pdf"},
    )
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"].startswith("application/pdf")


def test_export_filtered_apiaries_csv_with_counts(db_session, admin_user, regular_user):
    a1 = create_apiary(db_session, admin_user, name="AX")
    a2 = create_apiary(db_session, admin_user, name="AY")
    add_member(db_session, a1, regular_user)
    h1 = create_hive(db_session, a1, name="HX")
    h2 = create_hive(db_session, a2, name="HY")
    _ = h1, h2

    client_user = _client_as(db_session, regular_user)
    r_user = client_user.post(
        "/export/filtered/apiaries",
        json={"format": "csv", "include_member_count": True, "include_hive_count": True},
    )
    assert r_user.status_code == 200
    text = r_user.content.decode("utf-8")
    lines = [ln for ln in text.strip().splitlines() if ln.strip()]
    assert lines[0] == "Apiary ID,Name,Location,Owner ID,Created At,Description,Member Count,Hive Count"
    assert len(lines) == 2
    data_cols = lines[1].split(",")
    assert int(data_cols[0]) == a1.id

    admin_user.role = models.UserRole.admin
    db_session.flush()
    client_admin = _client_as(db_session, admin_user)
    r_admin = client_admin.post(
        "/export/filtered/apiaries",
        json={"format": "csv", "include_member_count": False, "include_hive_count": False},
    )
    assert r_admin.status_code == 200
    text_admin = r_admin.content.decode("utf-8")
    assert "Member Count" not in text_admin and "Hive Count" not in text_admin
    assert f"{a1.id}" in text_admin and f"{a2.id}" in text_admin
