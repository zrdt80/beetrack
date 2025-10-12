# Observability (Prometheus + Grafana)

This folder contains a minimal Prometheus and Grafana setup for BeeTrack.

## What’s included
- Prometheus scrape config for the API metrics endpoint (`/metrics`).
- Grafana provisioning for the Prometheus datasource and dashboards.
- A ready-to-import dashboard JSON.

## How to run (docker-compose)
The repo’s `docker-compose.yml` defines `prometheus` and `grafana` services.

1. Ensure the API is up (it exposes `/metrics`).
2. Start Prometheus and Grafana:
   - They’ll come up automatically with `docker-compose up -d`.
   - Prometheus UI: http://localhost:9090
   - Grafana UI: http://localhost:3001 (default admin/admin on first run)
3. Grafana should auto-provision the “Prometheus” datasource and load dashboards from `observability/grafana/dashboards`.

## Dashboard
If auto-provisioning doesn’t load the dashboard, you can import it manually from `observability/grafana/beetrack-dashboard.json`.

## Notes
- If you want Redis metrics, add a Redis exporter and update Prometheus scrape configs.
- Adjust scrape intervals and retention in `observability/prometheus/prometheus.yml` to suit your environment.