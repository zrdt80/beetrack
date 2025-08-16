import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.utils.logger import log_event
import pandas as pd


def archive_logs():
    db: Session = SessionLocal()
    try:
        logs = db.query(models.Log).all()
        if not logs:
            log_event("Scheduler: No logs to archive")
            return

        os.makedirs("logs", exist_ok=True)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        path = f"logs/logs_{today}.csv"

        data = [{"timestamp": log.timestamp, "event": log.event} for log in logs]
        df = pd.DataFrame(data)
        df.to_csv(path, index=False)

        log_entry = models.Log(timestamp=datetime.now(timezone.utc), event=f"Archived logs to {path}")
        db.add(log_entry)
        db.commit()
        log_event(f"Scheduler: Archived {len(logs)} logs to {path}")
    except Exception as e:
        log_event(f"Scheduler: Log archiving failed - {str(e)}")
    finally:
        db.close()


def purge_old_logs(days: int = 30):
    db: Session = SessionLocal()
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        deleted = db.query(models.Log).filter(models.Log.timestamp < cutoff).delete()
        db.commit()
        if deleted:
            log_event(f"Scheduler: Purged {deleted} logs older than {days} days")
    except Exception as e:
        log_event(f"Scheduler: Log purge failed - {str(e)}")
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(archive_logs, CronTrigger(day="*/7", hour=0, minute=0))
    scheduler.add_job(purge_old_logs, CronTrigger(hour=1, minute=0))  # daily purge
    scheduler.start()
    log_event("Scheduler started: log archiving job scheduled for every 7 days")
