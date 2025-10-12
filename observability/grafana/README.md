# Grafana Dashboard for BeeTrack

This folder contains a ready-to-import Grafana dashboard for monitoring BeeTrack via Prometheus.

## Prerequisites

-   Prometheus scraping the BeeTrack API metrics endpoint `/metrics`.
-   Grafana connected to that Prometheus as a datasource.

## Import Instructions

1. In Grafana, go to Dashboards -> Import.
2. Upload `beetrack-dashboard.json` (this folder) or paste its JSON.
3. Select your Prometheus datasource when prompted.
4. Save.

## Panels Included

-   HTTP RPS and P95 latency
-   Cache hit ratio and operations (sets/deletes)
-   DB slow queries per table
-   Rate limit hits per endpoint
-   System CPU %
-   Simple readiness indicator (based on `up`)

## Notes

-   The cache panels use the counters exposed by the app: `cache_hits_total`, `cache_misses_total`, `cache_sets_total`, `cache_deletes_total`.
-   If you use prefixed cache keys, you can filter by `prefix` label in the panel queries.
-   Adjust the refresh interval and time range to your environment. Default refresh is 10s.
