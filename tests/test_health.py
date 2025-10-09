from fastapi.testclient import TestClient


def test_healthz_ok(client: TestClient):
    res = client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert data.get("status") in {"ok", "degraded"}
    assert "components" in data and isinstance(data["components"], dict)
    comps = data["components"]
    assert "database" in comps
    assert "redis" in comps


def test_healthz_fields_present(client: TestClient):
    res = client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    for key in ("environment", "version"):
        assert key in data
