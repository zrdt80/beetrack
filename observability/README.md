# Observability (Prometheus + Grafana)

This folder contains a minimal Prometheus and Grafana setup for BeeTrack.

## What’s included

-   Prometheus scrape config for the API metrics endpoint (`/metrics`).
-   Grafana provisioning for the Prometheus datasource and dashboards.
-   A ready-to-import dashboard JSON.

## How to run (docker-compose)

The repo’s `docker-compose.yml` defines `prometheus`, `grafana`, and `redis_exporter` behind the `observability` profile.

1. Ensure the API is up (it exposes `/metrics`).
2. Start Prometheus and Grafana:
    - Start the whole stack with observability: `docker-compose --profile observability up -d`
    - Or, start only observability: `docker-compose --profile observability up -d prometheus grafana redis_exporter`
    - Prometheus UI: http://localhost:9090
    - Grafana UI: http://localhost:3001 (default admin/admin on first run)
3. Grafana should auto-provision the “Prometheus” datasource and load dashboards from `observability/grafana/dashboards`.
4. Redis metrics are exposed via `redis_exporter` (http://localhost:9121) and scraped by Prometheus.

## Dashboard

If auto-provisioning doesn’t load the dashboard, you can import it manually from `observability/grafana/beetrack-dashboard.json`.

## Notes

-   If you want Redis metrics, add a Redis exporter and update Prometheus scrape configs.
-   Adjust scrape intervals and retention in `observability/prometheus/prometheus.yml` to suit your environment.
