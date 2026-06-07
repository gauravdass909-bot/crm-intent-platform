import sys
import os

# Make backend package importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

# DATABASE_URL is set as a Vercel environment variable (Supabase PostgreSQL)
# Only fall back to SQLite if not provided at all
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/intent_platform.db"

from app.main import app  # noqa: E402  (exported as ASGI handler)
