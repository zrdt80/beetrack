from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    environment: str = "development"  # development|staging|production
    debug: bool = False

    secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    password_hash_algorithm: str = "bcrypt"

    database_url: str

    log_level: str = "INFO"
    log_json: bool = True
    log_db_events: bool = True

    enable_scheduler: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"
        case_sensitive = False

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


@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
