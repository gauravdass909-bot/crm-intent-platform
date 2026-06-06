from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    anthropic_api_key: str
    google_api_key: str
    serpapi_key: Optional[str] = None
    news_api_key: Optional[str] = None
    database_url: str = "sqlite:///./intent_platform.db"
    batch_schedule_cron: str = "0 6 * * 1"
    decay_schedule_cron: str = "0 2 * * *"
    max_companies_per_batch: int = 500
    min_signals_for_qualification: int = 2

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
