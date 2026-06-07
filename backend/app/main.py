import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .scheduler import setup_scheduler, scheduler
from .api.routes import companies, analysis, market_trends, decay, stats, research

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    setup_scheduler()
    yield
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
