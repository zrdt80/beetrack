from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import time
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

pool_config = {}
if not DATABASE_URL.startswith("sqlite"):
    pool_config = {
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 3600,
        "pool_pre_ping": True,
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=(
        {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    ),
    **pool_config,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DatabaseMetrics:
    def __init__(self):
        self._setup_query_listeners()

    def _setup_query_listeners(self):
        @event.listens_for(engine, "before_cursor_execute")
        def receive_before_cursor_execute(
            conn, cursor, statement, parameters, context, executemany
        ):
            context._query_start_time = time.time()
            context._query_statement = statement

        @event.listens_for(engine, "after_cursor_execute")
        def receive_after_cursor_execute(
            conn, cursor, statement, parameters, context, executemany
        ):
            if hasattr(context, "_query_start_time"):
                duration = time.time() - context._query_start_time
                self._record_query_metrics(statement, duration)

    def _record_query_metrics(self, statement: str, duration: float):
        try:
            from app.services.metrics import app_metrics
            from app.config import settings

            query_type, table = self._parse_statement(statement)

            app_metrics.record_db_query(query_type, table, duration)

            if duration > settings.slow_query_threshold_seconds:
                print(f"WARNING: SLOW QUERY ({duration:.3f}s): {statement[:200]}...")

        except Exception as e:
            print(f"ERROR: Error recording database metrics: {e}")

    def _parse_statement(self, statement: str) -> tuple[str, str]:
        statement = statement.strip().upper()
        statements = ("SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER")

        first = statement.split(None, 1)[0] if statement else ""
        query_type = first.lower() if first in statements else "other"

        table = "unknown"
        try:
            if query_type == "select":
                if " FROM " in statement:
                    parts = statement.split(" FROM ")[1].split()
                    if parts:
                        table = parts[0].strip('`"[]')
            elif query_type in ["insert", "update", "delete"]:
                if query_type == "insert" and " INTO " in statement:
                    parts = statement.split(" INTO ")[1].split()
                elif query_type == "update":
                    parts = statement.split("UPDATE ")[1].split()
                elif query_type == "delete" and " FROM " in statement:
                    parts = statement.split(" FROM ")[1].split()
                else:
                    parts = []

                if parts:
                    table = parts[0].strip('`"[]')

        except Exception:
            table = "unknown"

        return query_type, table


db_metrics = DatabaseMetrics()
