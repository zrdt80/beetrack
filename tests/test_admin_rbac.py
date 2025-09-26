import csv
import io
import json
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app import models


def create_audit_event(session, **overrides) -> models.AuditEvent:
    defaults = {
        "event_code": "RBAC_ROLE_ASSIGNED",
        "actor_user_id": None,
        "user_id": None,
        "created_at": datetime.now(timezone.utc),
        "metadata_json": json.dumps({"role": "Worker", "username": "member"}),
    }
    defaults.update(overrides)
    event = models.AuditEvent(**defaults)
    session.add(event)
    session.flush()
    return event


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def test_list_rbac_changes_filters_by_actor_and_event(
    client: TestClient, db_session, admin_user, regular_user
):
    latest_event = create_audit_event(
        db_session,
        actor_user_id=admin_user.id,
        user_id=regular_user.id,
        event_code="RBAC_ROLE_ASSIGNED",
        metadata_json=json.dumps({"role": "Supervisor", "username": regular_user.username}),
    )
    create_audit_event(
        db_session,
        actor_user_id=regular_user.id,
        user_id=regular_user.id,
        event_code="RBAC_ROLE_REMOVED",
        created_at=datetime.now(timezone.utc) - timedelta(days=1),
        metadata_json=json.dumps({"role": "Worker", "username": regular_user.username}),
    )
    db_session.commit()

    response = client.get(
        "/admin/rbac/changes",
        params={"page": 1, "size": 10, "actor_id": admin_user.id},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert len(payload["items"]) == 1
    item = payload["items"][0]
    assert item["event_code"] == "RBAC_ROLE_ASSIGNED"
    assert item["user_id"] == admin_user.id
    assert item["target_user_id"] == regular_user.id
    assert parse_timestamp(item["timestamp"]) == latest_event.created_at

    response_event = client.get(
        "/admin/rbac/changes",
        params={
            "page": 1,
            "size": 10,
            "event": "RBAC_ROLE_REMOVED",
            "actor_id": regular_user.id,
        },
    )
    assert response_event.status_code == 200
    payload_event = response_event.json()
    assert payload_event["total"] == 1
    assert payload_event["items"][0]["event_code"] == "RBAC_ROLE_REMOVED"


def test_list_rbac_changes_since_until_filters(
    client: TestClient, db_session, admin_user, regular_user
):
    older = create_audit_event(
        db_session,
        actor_user_id=admin_user.id,
        user_id=regular_user.id,
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    newer = create_audit_event(
        db_session,
        actor_user_id=admin_user.id,
        user_id=regular_user.id,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db_session.commit()

    response_since = client.get(
        "/admin/rbac/changes",
        params={
            "page": 1,
            "size": 20,
            "since": (newer.created_at - timedelta(minutes=5)).isoformat(),
        },
    )
    assert response_since.status_code == 200
    data_since = response_since.json()
    assert data_since["total"] == 1
    assert data_since["items"][0]["id"] == newer.id

    response_until = client.get(
        "/admin/rbac/changes",
        params={
            "page": 1,
            "size": 20,
            "until": (older.created_at + timedelta(minutes=5)).isoformat(),
        },
    )
    assert response_until.status_code == 200
    data_until = response_until.json()
    assert data_until["total"] == 1
    assert data_until["items"][0]["id"] == older.id


def test_export_rbac_changes_csv_scopes(
    client: TestClient, db_session, admin_user, regular_user
):
    newest = create_audit_event(
        db_session,
        actor_user_id=admin_user.id,
        user_id=regular_user.id,
        created_at=datetime.now(timezone.utc),
        metadata_json=json.dumps({"details": "Newest"}),
    )
    older = create_audit_event(
        db_session,
        actor_user_id=admin_user.id,
        user_id=regular_user.id,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
        metadata_json=json.dumps({"details": "Older"}),
    )
    db_session.commit()

    response_page = client.get(
        "/admin/rbac/changes/export",
        params={"page": 1, "size": 1},
    )
    assert response_page.status_code == 200
    assert response_page.headers["content-type"].startswith("text/csv")

    reader = csv.reader(io.StringIO(response_page.content.decode("utf-8")))
    rows = list(reader)
    assert len(rows) == 2
    header, first_row = rows[0], rows[1]
    assert header == [
        "id",
        "timestamp",
        "username",
        "actor_user_id",
        "event_code",
        "action",
        "details",
        "target_user_id",
    ]
    assert int(first_row[0]) == newest.id
    assert first_row[5] == "role assigned"
    assert first_row[6] == "Newest"

    response_all = client.get("/admin/rbac/changes/export")
    reader_all = csv.reader(io.StringIO(response_all.content.decode("utf-8")))
    rows_all = list(reader_all)[1:]
    assert len(rows_all) == 2
    ids = {int(row[0]) for row in rows_all}
    assert ids == {newest.id, older.id}