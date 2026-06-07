import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.environ["ANTHROPIC_API_KEY"] = "dummy"
os.environ["GOOGLE_API_KEY"] = "dummy"
# Use IPv6 address directly — local DNS doesn't resolve the hostname but Vercel does
os.environ["DATABASE_URL"] = "postgresql://postgres:Fuckyourass%402892@[2406:da18:167b:f902:5094:e2b:411b:d61a]:5432/postgres"

from sqlalchemy import create_engine, text
from app.database import Base
import app.models.company
import app.models.intent_score
import app.models.signal
import app.models.outreach_message
import app.models.market_trend
import app.models.batch_run

engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)

with engine.connect() as conn:
    conn.execute(text("SELECT 1"))
    print("DB connection verified")

Base.metadata.create_all(bind=engine)
print("All tables created on Supabase successfully")

with engine.connect() as conn:
    q = "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    result = conn.execute(text(q))
    tables = [r[0] for r in result]
    print("Tables:", tables)
