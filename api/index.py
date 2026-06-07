import sys
import os

# Make backend package importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

# Vercel uses ephemeral /tmp — point SQLite there
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/intent_platform.db")

# API keys are set as Vercel environment variables
from app.main import app  # noqa: E402  (exported as ASGI handler)
