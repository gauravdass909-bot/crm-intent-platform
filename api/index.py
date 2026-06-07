import sys
import os

# Make backend package importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

# Use Supabase DATABASE_URL from Vercel env; fall back to SQLite only if unset
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/intent_platform.db"

from app.main import app  # noqa: E402  (exported as ASGI handler for Vercel)
