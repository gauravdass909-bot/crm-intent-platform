import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from .config import settings

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def setup_scheduler():
    from .services.batch import run_batch
    from .services.decay import apply_decay
    from .database import SessionLocal

    def _batch_job():
        logger.info("Scheduled batch job starting...")
        run_batch()

    def _decay_job():
        logger.info("Scheduled decay job starting...")
        db = SessionLocal()
        try:
            apply_decay(db)
        finally:
            db.close()

    batch_cron = CronTrigger.from_crontab(settings.batch_schedule_cron)
    decay_cron = CronTrigger.from_crontab(settings.decay_schedule_cron)

    scheduler.add_job(_batch_job, trigger=batch_cron, id="batch_discovery", replace_existing=True)
    scheduler.add_job(_decay_job, trigger=decay_cron, id="score_decay", replace_existing=True)

    scheduler.start()
    logger.info(f"Scheduler started: batch={settings.batch_schedule_cron}, decay={settings.decay_schedule_cron}")
