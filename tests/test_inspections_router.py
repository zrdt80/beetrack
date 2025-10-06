from datetime import datetime, timedelta, timezone

from app import models
from tests.conftest import _ensure_permission, client_as
from app.services.rbac import Perm


def _aware(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


def create_apiary(session, owner, name="Apiary I"):
    a = models.Apiary(name=name, owner_id=owner.id, location="L")
    session.add(a)
    session.flush()
    session.add(
        models.ApiaryMember(
            apiary_id=a.id,
            user_id=owner.id,
            role=models.ApiaryRole.owner,
            is_active=True,
        )
    )
    session.flush()
    return a


def create_hive(session, apiary, name="Hive I", last_date=None):
    h = models.Hive(
        name=name, apiary_id=apiary.id, status="active", last_inspection_date=last_date
    )
    session.add(h)
    session.flush()
    return h


def create_inspection_entity(session, hive, date):
    ins = models.Inspection(
        hive_id=hive.id, date=date, notes="", temperature=30.0, disease_detected="none"
    )
    session.add(ins)
    session.flush()
    return ins


def test_create_inspection_updates_hive_last_date(db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.INSPECTIONS_CREATE)
    apiary = create_apiary(db_session, admin_user)
    hive = create_hive(db_session, apiary)
    with client_as(db_session, admin_user) as client:
        payload = {"hive_id": hive.id}
        r = client.post("/inspections/", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["hive_id"] == hive.id

        db_session.refresh(hive)
        assert hive.last_inspection_date is not None


def test_create_inspection_future_date_rejected(db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.INSPECTIONS_CREATE)
    apiary = create_apiary(db_session, admin_user)
    hive = create_hive(db_session, apiary)
    with client_as(db_session, admin_user) as client:
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        r = client.post("/inspections/", json={"hive_id": hive.id, "date": future})
        assert r.status_code == 400
        assert r.json()["message"] == "Inspection date cannot be in the future"


def test_list_inspections_and_for_hive(db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.INSPECTIONS_VIEW)
    apiary = create_apiary(db_session, admin_user)
    hive1 = create_hive(db_session, apiary, name="H1")
    hive2 = create_hive(db_session, apiary, name="H2")
    create_inspection_entity(
        db_session, hive1, datetime.now(timezone.utc) - timedelta(days=2)
    )
    create_inspection_entity(
        db_session, hive2, datetime.now(timezone.utc) - timedelta(days=1)
    )
    create_inspection_entity(db_session, hive1, datetime.now(timezone.utc))

    with client_as(db_session, admin_user) as client:
        r_list = client.get("/inspections?size=2")
        assert r_list.status_code == 200
        resp = r_list.json()
        assert resp["meta"]["size"] == 2
        assert len(resp["items"]) == 2

        r_hive = client.get(f"/inspections/hive/{hive1.id}")
        assert r_hive.status_code == 200
        items = r_hive.json()["items"]
        assert all(it["hive_id"] == hive1.id for it in items)

        r_nf = client.get("/inspections/hive/999999")
        assert r_nf.status_code == 404
        assert r_nf.json()["message"] == "Hive not found"


def test_update_inspection_reassigns_hive_and_recalc(db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.INSPECTIONS_CREATE)
    _ensure_permission(db_session, admin_user, Perm.INSPECTIONS_MANAGE)
    apiary = create_apiary(db_session, admin_user)
    h1 = create_hive(db_session, apiary, name="H1")
    h2 = create_hive(db_session, apiary, name="H2")

    older = datetime.now(timezone.utc) - timedelta(days=3)
    newer = datetime.now(timezone.utc) - timedelta(days=1)
    create_inspection_entity(db_session, h1, older)
    ins = create_inspection_entity(db_session, h1, newer)
    h1.last_inspection_date = newer
    db_session.flush()

    with client_as(db_session, admin_user) as client:
        payload = {"hive_id": h2.id, "date": (datetime.now(timezone.utc)).isoformat()}
        r = client.put(f"/inspections/{ins.id}", json=payload)
        assert r.status_code == 200

        db_session.refresh(h1)
        db_session.refresh(h2)
        assert h1.last_inspection_date is not None
        assert (
            abs((_aware(h1.last_inspection_date) - _aware(older)).total_seconds()) < 3
        )
        assert h2.last_inspection_date is not None


def test_delete_inspection_updates_last_date(db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.INSPECTIONS_CREATE)
    _ensure_permission(db_session, admin_user, Perm.INSPECTIONS_MANAGE)
    apiary = create_apiary(db_session, admin_user)
    h = create_hive(db_session, apiary)
    d1 = datetime.now(timezone.utc) - timedelta(days=2)
    d2 = datetime.now(timezone.utc) - timedelta(days=1)
    i1 = create_inspection_entity(db_session, h, d1)
    i2 = create_inspection_entity(db_session, h, d2)
    h.last_inspection_date = d2
    db_session.flush()

    with client_as(db_session, admin_user) as client:
        r = client.delete(f"/inspections/{i2.id}")
        assert r.status_code == 204

        db_session.refresh(h)
        assert abs((_aware(h.last_inspection_date) - _aware(d1)).total_seconds()) < 3
