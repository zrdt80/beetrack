import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app import models
from tests.conftest import _create_user


def make_product(db: Session, name: str, price: float = 10.0, stock: int = 100) -> models.Product:
    p = models.Product(name=name, description=f"{name} desc", unit_price=price, stock_quantity=stock)
    db.add(p)
    db.flush()
    return p


def make_order_with_product(db: Session, user: models.User, product: models.Product, qty: int = 1) -> models.Order:
    order = models.Order(user_id=user.id, date=datetime.now(timezone.utc), status="pending", total_price=0)
    db.add(order)
    db.flush()
    db.add(models.OrderItem(order_id=order.id, product_id=product.id, quantity=qty, price_each=product.unit_price))
    order.total_price = qty * product.unit_price
    db.commit()
    db.refresh(order)
    return order


def test_create_product_success(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    payload = {
        "name": "  New Product  ",
        "description": "A new product",
        "unit_price": 12.5,
        "stock_quantity": 5,
    }

    resp = client.post("/products/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Product"
    assert data["unit_price"] == pytest.approx(12.5)
    assert data["stock_quantity"] == 5


def test_create_product_conflict_case_insensitive(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    make_product(db_session, "Honey")

    resp = client.post("/products/", json={
        "name": "hOnEy",
        "description": "dup",
        "unit_price": 3.0,
        "stock_quantity": 1,
    })
    assert resp.status_code == 400
    assert "already exists" in resp.json()["message"].lower()


def test_create_product_requires_admin(client: TestClient, db_session: Session, regular_user):
    from app.main import app
    from app.services.auth import get_current_user

    def override_get_current_user():
        return regular_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    resp = client.post("/products/", json={
        "name": "NoPerm",
        "description": "",
        "unit_price": 1.0,
        "stock_quantity": 1,
    })

    assert resp.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)


def test_list_products_pagination_and_headers(client: TestClient, db_session: Session):
    for i in range(1, 6):
        make_product(db_session, f"P{i}", price=1.0 * i, stock=10 * i)

    resp = client.get("/products/?page=1&size=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["meta"]["page"] == 1
    assert data["meta"]["size"] == 3
    assert data["meta"]["total"] >= 5
    assert resp.headers.get("Cache-Control") == "no-cache, no-store, must-revalidate"


def test_get_product_success_and_not_found(client: TestClient, db_session: Session):
    p = make_product(db_session, "FindMe", 2.0, 7)

    ok = client.get(f"/products/{p.id}")
    assert ok.status_code == 200
    assert ok.json()["name"] == "FindMe"

    miss = client.get("/products/999999")
    assert miss.status_code == 404
    assert "Product not found" in miss.json()["message"]


def test_update_product_success(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    p = make_product(db_session, "UpdA", 5.0, 2)

    resp = client.put(f"/products/{p.id}", json={
        "name": "  Renamed  ",
        "unit_price": 6.0,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Renamed"
    assert data["unit_price"] == pytest.approx(6.0)


def test_update_product_conflict_case_insensitive(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    a = make_product(db_session, "Alpha")
    b = make_product(db_session, "Bravo")

    resp = client.put(f"/products/{b.id}", json={"name": "ALPHA"})
    assert resp.status_code == 400
    assert "already exists" in resp.json()["message"].lower()


def test_update_product_not_found(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    resp = client.put("/products/999999", json={"name": "X"})
    assert resp.status_code == 404
    assert "Product not found" in resp.json()["message"]


def test_delete_product_success(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    p = make_product(db_session, "DelP", 3.0, 4)

    resp = client.delete(f"/products/{p.id}")
    assert resp.status_code == 204

    miss = client.get(f"/products/{p.id}")
    assert miss.status_code == 404


def test_delete_product_blocked_by_order_reference(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    buyer = _create_user(db_session, "buyer")
    p = make_product(db_session, "RefProd", 2.0, 10)
    make_order_with_product(db_session, buyer, p, qty=2)

    resp = client.delete(f"/products/{p.id}")
    assert resp.status_code == 400
    assert "referenced" in resp.json()["message"].lower()


def test_delete_product_not_found(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()

    resp = client.delete("/products/999999")
    assert resp.status_code == 404
    assert "Product not found" in resp.json()["message"]
