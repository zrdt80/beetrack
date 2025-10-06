from datetime import datetime, timezone

from app import models
from tests.conftest import client_as, _ensure_permission


def _seed_logs(session):
    rows = [
        models.Log(
            timestamp=datetime.now(timezone.utc), event="Started system", level="info"
        ),
        models.Log(
            timestamp=datetime.now(timezone.utc),
            event="Operation success",
            level="success",
        ),
        models.Log(
            timestamp=datetime.now(timezone.utc), event="Minor warning", level="warning"
        ),
        models.Log(
            timestamp=datetime.now(timezone.utc),
            event="Critical error occurred",
            level="error",
        ),
        models.Log(
            timestamp=datetime.now(timezone.utc),
            event="Another info message",
            level="info",
        ),
    ]
    for r in rows:
        session.add(r)
    session.flush()
    return rows


def test_list_logs_with_filters_and_pagination(db_session, admin_user):
    admin_user.role = "admin"  # logs router uses requires_role("admin")
    db_session.flush()
    rows = _seed_logs(db_session)
    with client_as(db_session, admin_user) as client:
        r1 = client.get("/logs?limit=2")
        assert r1.status_code == 200
        data1 = r1.json()
        assert data1["meta"]["limit"] == 2
        assert data1["meta"]["has_next"] is True
        assert len(data1["items"]) == 2
        next_cursor = data1["meta"]["next_cursor"]
        assert isinstance(next_cursor, int)

        r2 = client.get(f"/logs?limit=2&after_id={next_cursor}")
        assert r2.status_code == 200
        data2 = r2.json()
        assert len(data2["items"]) >= 1

        r_level = client.get("/logs?level=error")
        assert r_level.status_code == 200
        items = r_level.json()["items"]
        assert all(it["level"] == "error" for it in items)

        r_q = client.get("/logs?q=success")
        assert r_q.status_code == 200
        q_items = r_q.json()["items"]
        assert any("success" in it["event"].lower() for it in q_items)


def test_delete_log_and_clear_logs(db_session, admin_user):
    admin_user.role = "admin"  # logs router uses requires_role("admin")
    db_session.flush()
    rows = _seed_logs(db_session)
    with client_as(db_session, admin_user) as client:
        to_delete = rows[0].id
        r_del = client.delete(f"/logs/{to_delete}")
        assert r_del.status_code == 204

        r_nf = client.delete(f"/logs/{to_delete}")
        assert r_nf.status_code == 404
        assert r_nf.json()["message"] == "Log not found"

        r_clear = client.delete("/logs/clear")
        assert r_clear.status_code == 204

        r_list = client.get("/logs?limit=10")
        assert r_list.status_code == 200
        assert r_list.json()["items"] == []


def test_logs_stats(db_session, admin_user):
    admin_user.role = "admin"  # logs router uses requires_role("admin")
    db_session.flush()
    _seed_logs(db_session)
    with client_as(db_session, admin_user) as client:
        r = client.get("/logs/stats")
        assert r.status_code == 200
        stats = r.json()
        assert (
            stats["total"]
            == stats["info"] + stats["success"] + stats["warning"] + stats["error"]
        )
