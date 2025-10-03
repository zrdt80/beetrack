import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app import models
from app.services.rbac import Perm
from tests.conftest import _create_user, _ensure_permission


def create_product(db: Session, name: str, price: float = 10.0, stock: int = 100) -> models.Product:
    p = models.Product(name=name, description=f"{name} desc", unit_price=price, stock_quantity=stock)
    db.add(p)
    db.flush()
    return p


def create_order_entity(db: Session, user: models.User, items: list[tuple[models.Product, int]], status: str = "pending") -> models.Order:
    order = models.Order(user_id=user.id, date=datetime.now(timezone.utc), status=status, total_price=0)
    db.add(order)
    db.flush()
    total = 0
    for product, qty in items:
        db.add(models.OrderItem(order_id=order.id, product_id=product.id, quantity=qty, price_each=product.unit_price))
        total += qty * product.unit_price
    order.total_price = total
    db.commit()
    db.refresh(order)
    return order


def test_create_order_success(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_CREATE)
    p1 = create_product(db_session, "Honey", 5.0, stock=10)
    p2 = create_product(db_session, "Wax", 2.5, stock=20)

    payload = {
        "items": [
            {"product_id": p1.id, "quantity": 2},
            {"product_id": p2.id, "quantity": 4},
        ]
    }

    resp = client.post("/orders/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert data["user_id"] == admin_user.id
    assert data["total_price"] == pytest.approx(20.0)
    assert len(data["items"]) == 2

    db_session.refresh(p1)
    db_session.refresh(p2)
    assert p1.stock_quantity == 8
    assert p2.stock_quantity == 16


def test_create_order_empty_items(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_CREATE)
    resp = client.post("/orders/", json={"items": []})
    assert resp.status_code == 400
    assert "at least one" in resp.json()["message"]


def test_create_order_product_not_found(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_CREATE)
    resp = client.post("/orders/", json={"items": [{"product_id": 999999, "quantity": 1}]})
    assert resp.status_code == 404
    assert "Product ID" in resp.json()["message"]


def test_create_order_insufficient_stock(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_CREATE)
    p = create_product(db_session, "Royal Jelly", 12.0, stock=1)
    resp = client.post("/orders/", json={"items": [{"product_id": p.id, "quantity": 5}]})
    assert resp.status_code == 400
    assert "Not enough stock" in resp.json()["message"]


def test_get_user_orders_basic(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_VIEW)
    p = create_product(db_session, "Filter A", 3.0, 50)
    create_order_entity(db_session, admin_user, [(p, 1)], status="pending")
    create_order_entity(db_session, admin_user, [(p, 2)], status="completed")

    resp = client.get("/orders/")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data and "meta" in data
    assert data["meta"]["total"] >= 2


def test_get_user_orders_statuses_and_search(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_VIEW)
    p1 = create_product(db_session, "Sunflower Honey", 7.0, 50)
    p2 = create_product(db_session, "Clover Honey", 6.0, 50)
    create_order_entity(db_session, admin_user, [(p1, 1)], status="processing")
    create_order_entity(db_session, admin_user, [(p2, 2)], status="completed")

    resp = client.get("/orders/?statuses=processing,completed")
    assert resp.status_code == 200
    data = resp.json()
    assert data["meta"]["total"] >= 2

    resp2 = client.get("/orders/?product_search=clover")
    assert resp2.status_code == 200
    data2 = resp2.json()
    items = data2["items"]
    assert len(items) == 1
    returned_order = items[0]
    assert all(oi["product_id"] == p2.id for oi in returned_order["items"])


def test_get_all_orders_requires_manage(client: TestClient, db_session: Session):
    resp = client.get("/orders/all")
    assert resp.status_code == 403


def test_get_all_orders_with_manage(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_MANAGE)
    user2 = _create_user(db_session, "other")
    p = create_product(db_session, "Comb", 4.0, 50)
    create_order_entity(db_session, admin_user, [(p, 1)], status="pending")
    create_order_entity(db_session, user2, [(p, 3)], status="completed")

    resp = client.get("/orders/all?statuses=pending,completed&sort_key=id&sort_order=asc")
    assert resp.status_code == 200
    data = resp.json()
    assert data["meta"]["total"] >= 2


def test_update_order_status_admin_success(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    _ensure_permission(db_session, admin_user, Perm.ORDERS_MANAGE)

    p = create_product(db_session, "Processor", 9.0, 50)
    other_user = _create_user(db_session, "buyer")
    order = create_order_entity(db_session, other_user, [(p, 1)], status="pending")

    payload = {"status": "processing"}
    resp = client.put(f"/orders/{order.id}", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "processing"


def test_update_order_status_invalid_status(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    _ensure_permission(db_session, admin_user, Perm.ORDERS_MANAGE)

    p = create_product(db_session, "ErrItem", 1.0, 10)
    order = create_order_entity(db_session, admin_user, [(p, 1)], status="pending")

    resp = client.put(f"/orders/{order.id}", json={"status": "made-up"})
    assert resp.status_code == 400
    assert "Invalid status" in resp.json()["message"]


def test_update_order_status_not_found(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    _ensure_permission(db_session, admin_user, Perm.ORDERS_MANAGE)

    resp = client.put("/orders/999999", json={"status": "processing"})
    assert resp.status_code == 404
    assert "Order not found" in resp.json()["message"]


def test_delete_order_by_owner_without_manage(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    p = create_product(db_session, "Deletion P", 5.0, 10)
    order = create_order_entity(db_session, owner, [(p, 2)], status="pending")

    from app.main import app
    from app.services.auth import get_current_user

    def override_get_current_user():
        return owner

    app.dependency_overrides[get_current_user] = override_get_current_user

    resp = client.delete(f"/orders/{order.id}")
    assert resp.status_code == 204

    db_session.refresh(p)
    assert p.stock_quantity == 12

    app.dependency_overrides.pop(get_current_user, None)


def test_delete_order_unauthorized_other_user(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    other = _create_user(db_session, "other")
    p = create_product(db_session, "Secret P", 5.0, 10)
    order = create_order_entity(db_session, owner, [(p, 1)], status="pending")

    from app.main import app
    from app.services.auth import get_current_user

    def override_get_current_user():
        return other

    app.dependency_overrides[get_current_user] = override_get_current_user

    resp = client.delete(f"/orders/{order.id}")
    assert resp.status_code == 403

    app.dependency_overrides.pop(get_current_user, None)


def test_delete_order_admin_with_manage(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ORDERS_MANAGE)
    admin_user.role = models.UserRole.admin
    db_session.commit()

    other = _create_user(db_session, "other")
    p = create_product(db_session, "Admin D", 5.0, 10)
    order = create_order_entity(db_session, other, [(p, 1)], status="pending")

    resp = client.delete(f"/orders/{order.id}")
    assert resp.status_code == 204
