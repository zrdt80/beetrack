import time
import psutil
from typing import Dict, Any
from prometheus_client import Counter, Histogram, Gauge, Info, CollectorRegistry, generate_latest
from prometheus_client.openmetrics.exposition import CONTENT_TYPE_LATEST
from functools import wraps
from app.config import settings


class AppMetrics:
    def __init__(self):
        self.registry = CollectorRegistry()
        self._init_http_metrics()
        self._init_auth_metrics()
        self._init_security_metrics()
        self._init_database_metrics()
        self._init_business_metrics()
        self._init_system_metrics()
        
    def _init_http_metrics(self):
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests by method, endpoint, and status',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.http_request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
            registry=self.registry
        )
        
        self.http_request_size = Histogram(
            'http_request_size_bytes',
            'HTTP request size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        self.http_response_size = Histogram(
            'http_response_size_bytes', 
            'HTTP response size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
    def _init_auth_metrics(self):
        self.auth_attempts_total = Counter(
            'auth_attempts_total',
            'Total authentication attempts',
            ['type', 'status', 'user_agent'],
            registry=self.registry
        )
        
        self.sessions_active = Gauge(
            'sessions_active_total',
            'Number of active user sessions',
            registry=self.registry
        )
        
        self.tokens_issued_total = Counter(
            'tokens_issued_total',
            'Total tokens issued by type',
            ['token_type'],
            registry=self.registry
        )
        
        self.token_refresh_total = Counter(
            'token_refresh_total',
            'Total token refresh attempts',
            ['status'],
            registry=self.registry
        )
        
        self.password_reset_total = Counter(
            'password_reset_total',
            'Total password reset attempts',
            ['status'],
            registry=self.registry
        )
        
    def _init_security_metrics(self):
        self.rate_limit_hits_total = Counter(
            'rate_limit_hits_total',
            'Total rate limit violations',
            ['endpoint', 'limit_type'],
            registry=self.registry
        )
        
        self.auth_failures_total = Counter(
            'auth_failures_total',
            'Authentication failures by IP and reason',
            ['ip_address', 'failure_reason'],
            registry=self.registry
        )
        
        self.suspicious_activity_total = Counter(
            'suspicious_activity_total',
            'Suspicious activity detected',
            ['activity_type', 'severity'],
            registry=self.registry
        )
        
        self.blocked_ips_total = Gauge(
            'blocked_ips_total',
            'Number of currently blocked IP addresses',
            registry=self.registry
        )
        
        self.security_escalations_total = Counter(
            'security_escalations_total',
            'Security escalation events',
            ['escalation_level'],
            registry=self.registry
        )
        
    def _init_database_metrics(self):
        self.db_connections_active = Gauge(
            'db_connections_active',
            'Active database connections',
            registry=self.registry
        )
        
        self.db_query_duration = Histogram(
            'db_query_duration_seconds',
            'Database query execution time',
            ['query_type', 'table'],
            buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0),
            registry=self.registry
        )
        
        self.db_queries_total = Counter(
            'db_queries_total',
            'Total database queries executed',
            ['query_type', 'table', 'status'],
            registry=self.registry
        )
        
        self.db_transactions_total = Counter(
            'db_transactions_total',
            'Database transactions',
            ['status'],
            registry=self.registry
        )
        
        self.db_slow_queries_total = Counter(
            'db_slow_queries_total',
            'Slow database queries (>1s)',
            ['table'],
            registry=self.registry
        )
        
    def _init_business_metrics(self):
        self.users_registered_total = Counter(
            'users_registered_total',
            'Total user registrations',
            ['user_type'],
            registry=self.registry
        )
        
        self.apiaries_created_total = Counter(
            'apiaries_created_total',
            'Total apiaries created',
            registry=self.registry
        )
        
        self.hives_created_total = Counter(
            'hives_created_total',
            'Total hives created',
            registry=self.registry
        )
        
        self.inspections_total = Counter(
            'inspections_total',
            'Total hive inspections',
            ['status'],
            registry=self.registry
        )
        
        self.orders_total = Counter(
            'orders_total',
            'Total orders processed',
            ['status'],
            registry=self.registry
        )
        
        self.data_exports_total = Counter(
            'data_exports_total',
            'Total data exports',
            ['export_type', 'status'],
            registry=self.registry
        )
        
    def _init_system_metrics(self):
        self.system_cpu_usage = Gauge(
            'system_cpu_usage_percent',
            'CPU usage percentage',
            registry=self.registry
        )
        
        self.system_memory_usage = Gauge(
            'system_memory_usage_bytes',
            'Memory usage in bytes',
            registry=self.registry
        )
        
        self.system_disk_usage = Gauge(
            'system_disk_usage_bytes',
            'Disk usage in bytes',
            ['partition'],
            registry=self.registry
        )
        
        self.app_info = Info(
            'app_info',
            'Application information',
            registry=self.registry
        )
        
        self.app_info.info({
            'version': '1.0.0',
            'environment': settings.environment,
            'python_version': psutil.__version__
        })
        
    def record_http_request(self, method: str, endpoint: str, status_code: int, 
                           duration: float, request_size: int = 0, response_size: int = 0):
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint, 
            status_code=str(status_code)
        ).inc()
        
        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
        
        if request_size > 0:
            self.http_request_size.labels(
                method=method,
                endpoint=endpoint
            ).observe(request_size)
            
        if response_size > 0:
            self.http_response_size.labels(
                method=method,
                endpoint=endpoint
            ).observe(response_size)
    
    def record_auth_attempt(self, auth_type: str, status: str, user_agent: str = "unknown"):
        self.auth_attempts_total.labels(
            type=auth_type,
            status=status,
            user_agent=user_agent[:50]
        ).inc()
        
    def record_token_issued(self, token_type: str):
        self.tokens_issued_total.labels(token_type=token_type).inc()
        
    def record_token_refresh(self, status: str):
        self.token_refresh_total.labels(status=status).inc()
        
    def record_rate_limit_hit(self, endpoint: str, limit_type: str):
        self.rate_limit_hits_total.labels(
            endpoint=endpoint,
            limit_type=limit_type
        ).inc()
        
    def record_auth_failure(self, ip_address: str, failure_reason: str):
        self.auth_failures_total.labels(
            ip_address=ip_address,
            failure_reason=failure_reason
        ).inc()
        
    def record_suspicious_activity(self, activity_type: str, severity: str):
        self.suspicious_activity_total.labels(
            activity_type=activity_type,
            severity=severity
        ).inc()
        
    def record_security_escalation(self, escalation_level: str):
        self.security_escalations_total.labels(
            escalation_level=escalation_level
        ).inc()
        
    def update_blocked_ips(self, count: int):
        self.blocked_ips_total.set(count)
        
    def record_db_query(self, query_type: str, table: str, duration: float, status: str = "success"):
        self.db_queries_total.labels(
            query_type=query_type,
            table=table,
            status=status
        ).inc()
        
        self.db_query_duration.labels(
            query_type=query_type,
            table=table
        ).observe(duration)
        
        if duration > 1.0:
            self.db_slow_queries_total.labels(table=table).inc()
            
    def record_business_event(self, event_type: str, **labels):
        if event_type == "user_registered":
            self.users_registered_total.labels(
                user_type=labels.get("user_type", "regular")
            ).inc()
        elif event_type == "apiary_created":
            self.apiaries_created_total.inc()
        elif event_type == "hive_created":
            self.hives_created_total.inc()
        elif event_type == "inspection":
            self.inspections_total.labels(
                status=labels.get("status", "completed")
            ).inc()
        elif event_type == "order":
            self.orders_total.labels(
                status=labels.get("status", "pending")
            ).inc()
        elif event_type == "data_export":
            self.data_exports_total.labels(
                export_type=labels.get("export_type", "csv"),
                status=labels.get("status", "success")
            ).inc()
            
    def update_system_metrics(self):
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            self.system_cpu_usage.set(cpu_percent)
            
            memory = psutil.virtual_memory()
            self.system_memory_usage.set(memory.used)
            
            disk = psutil.disk_usage('/')
            self.system_disk_usage.labels(partition='/').set(disk.used)
            
        except Exception as e:
            print(f"ERROR: Error updating system metrics: {e}")
            
    def get_metrics_text(self) -> bytes:
        return generate_latest(self.registry)
        
    def get_metrics_content_type(self) -> str:
        return CONTENT_TYPE_LATEST


app_metrics = AppMetrics()


def track_database_query(table: str, query_type: str = "select"):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                app_metrics.record_db_query(query_type, table, duration, "success")
                return result
            except Exception as e:
                duration = time.time() - start_time
                app_metrics.record_db_query(query_type, table, duration, "error")
                raise
        return wrapper
    return decorator


def get_current_metrics_summary() -> Dict[str, Any]:
    try:
        app_metrics.update_system_metrics()
        
        return {
            "timestamp": int(time.time()),
            "system": {
                "cpu_usage_percent": psutil.cpu_percent(),
                "memory_usage_percent": psutil.virtual_memory().percent,
                "disk_usage_percent": psutil.disk_usage('/').percent
            },
            "application": {
                "environment": settings.environment,
                "metrics_enabled": True,
                "registry_collectors": len(app_metrics.registry._collector_to_names)
            }
        }
    except Exception as e:
        return {
            "timestamp": int(time.time()),
            "error": f"Failed to collect metrics: {str(e)}",
            "metrics_enabled": False
        }
