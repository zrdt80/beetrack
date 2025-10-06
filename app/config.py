from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    environment: str = "development"  # development|staging|production
    debug: bool = False

    secret_key: str
    access_token_expire_minutes: int = 10
    refresh_token_expire_days: int = 30
    password_hash_algorithm: str = "bcrypt"

    database_url: str

    log_level: str = "INFO"
    log_json: bool = True
    log_db_events: bool = True

    enable_scheduler: bool = True
    audit_retention_days: int = 180

    rate_limiting_enabled: bool = True
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst_requests: int = 10
    rate_limit_storage: str = "memory"
    redis_url: str = "redis://localhost:6379/0"

    security_headers_enabled: bool = True
    cors_allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    cors_extra_origins: str | None = None
    trusted_proxies: list[str] = []

    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    suspicious_activity_threshold: int = 100

    metrics_enabled: bool = True
    metrics_update_interval: int = 30
    prometheus_endpoint_enabled: bool = True
    correlation_ids_enabled: bool = True
    detailed_logging_enabled: bool = True
    system_metrics_collection: bool = True
    slow_query_threshold_seconds: float = 1.0

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret(cls, v: str):
        if not v or len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @field_validator("log_level")
    @classmethod
    def validate_level(cls, v: str):
        return v.upper()

    @field_validator("cors_extra_origins")
    @classmethod
    def parse_extra_origins(cls, v: str | None):
        if not v:
            return None
        parts = [
            p.strip()
            for p in v.replace(";", ",").replace(" ", ",").split(",")
            if p.strip()
        ]
        return ",".join(parts) if parts else None


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
