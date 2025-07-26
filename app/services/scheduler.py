import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
import pandas as pd


def archive_logs():
    db: Session = SessionLocal()
    try:
        logs = db.query(models.Log).all()
        if not logs:
            return

        os.makedirs("logs", exist_ok=True)
        today = datetime.now().strftime("%Y-%m-%d")
        path = f"logs/logs_{today}.csv"

        data = [{"timestamp": log.timestamp, "event": log.event} for log in logs]
        df = pd.DataFrame(data)
        df.to_csv(path, index=False)

        log_entry = models.Log(timestamp=datetime.utcnow(), event=f"Archived logs to {path}")
        db.add(log_entry)
        db.commit()
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(archive_logs, CronTrigger(day="*/7", hour=0, minute=0))
    scheduler.start()
