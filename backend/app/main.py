import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .scheduler import setup_scheduler, scheduler
from .api.routes import companies, analysis, market_trends, decay, stats, research

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

_IS_VERCEL = bool(os.environ.get("VERCEL"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created")
    except Exception as e:
        logger.warning(f"DB create_all skipped (tables may already exist): {e}")
    if not _IS_VERCEL:
        setup_scheduler()
    yield
    if not _IS_VERCEL:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="CRM Intent Detection Platform",
    description="Autonomous detection of enterprise companies showing CRM buying intent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://intent-platform-one.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(market_trends.router, prefix="/api")
app.include_router(decay.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(research.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "intent-detection-platform"}


@app.get("/api/ping")
def ping():
    from .database import engine
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"ok": True, "db": "connected"}
    except Exception as e:
        return {"ok": False, "db": str(e)}
