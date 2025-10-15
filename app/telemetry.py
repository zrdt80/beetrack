from __future__ import annotations

import os
from typing import Optional

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor


def init_tracing(
    service_name: str = "beetrack-api", otlp_endpoint: Optional[str] = None
) -> None:
    if os.getenv("TRACING_ENABLED", "true").lower() not in {"1", "true", "yes", "on"}:
        return

    endpoint = (
        otlp_endpoint or os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or "http://tempo:4317"
    )

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
            "deployment.environment": os.getenv(
                "ENVIRONMENT", os.getenv("ENV", "development")
            ),
        }
    )

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    try:
        SQLAlchemyInstrumentor().instrument()
    except Exception:
        pass

    try:
        HTTPXClientInstrumentor().instrument()
    except Exception:
        pass


def instrument_fastapi_app(app) -> None:
    try:
        FastAPIInstrumentor.instrument_app(app)
    except Exception:
        pass
