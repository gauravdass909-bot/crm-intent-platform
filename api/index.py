import sys
import os
import traceback

# Make backend package importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

# Use Supabase DATABASE_URL from Vercel env; fall back to SQLite only if unset
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/intent_platform.db"

try:
    from app.main import app  # exported as ASGI handler for Vercel
except Exception as _boot_err:
    # Surface startup errors as a minimal FastAPI app so we can read the traceback
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/{path:path}")
    def _error(path: str = ""):
        return {"error": str(_boot_err), "traceback": traceback.format_exc()}
