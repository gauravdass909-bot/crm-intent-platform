# CRM Intent Detection Platform

Autonomous discovery and scoring of enterprise companies showing CRM buying intent.

---

## Architecture

```
Gemini (Search Grounding) → Signal Discovery
         ↓
Claude claude-sonnet-4-6 (Stage 2) → Intent Reasoning + Scoring
         ↓
Claude claude-sonnet-4-6 (Stage 3) → Validation + Confidence
         ↓
PostgreSQL → FastAPI → Next.js Dashboard
```

---

## Quick Start

### 1. Install Superpowers (Claude Code methodology)

In the Claude Code chat, type:
```
/plugin install superpowers@claude-plugins-official
```

### 2. Start PostgreSQL

```bash
cd intent-platform
docker compose up -d postgres
```

### 3. Configure API Keys

```bash
cp .env.example backend/.env
# Edit backend/.env and fill in:
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=AIza...
```

### 4. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 5. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 6. Run Your First Discovery

Open the dashboard at http://localhost:3000 and click **"Run Discovery Now"**.

The system will:
1. Run 20+ Gemini search queries across 5 signal types
2. Qualify companies appearing in 2+ signal types
3. Deep-research each qualified company with Gemini
4. Score with Claude (Stage 2) + validate (Stage 3)
5. Generate personalized outreach messages
6. Populate the leaderboard and heatmap

---

## API Keys Required

| Key | Provider | Free tier? | Purpose |
|-----|----------|-----------|---------|
| `ANTHROPIC_API_KEY` | console.anthropic.com | No | Intent reasoning (Claude) |
| `GOOGLE_API_KEY` | aistudio.google.com | Yes (limited) | Signal discovery (Gemini) |
| `SERPAPI_KEY` | serpapi.com | 100 searches/month free | Job board searches (optional) |
| `NEWS_API_KEY` | newsapi.org | 100 req/day free | News signals (optional) |

---

## Scoring Reference

| Score | Tier | Buying Stage | Color |
|-------|------|-------------|-------|
| 86-100 | Very High | Decision-Ready | Red |
| 61-85 | High | Evaluation | Orange |
| 31-60 | Medium | Research | Yellow |
| 0-30 | Low | Awareness | Gray |

---

## Signal Types & Weights

| Signal | Weight | Example |
|--------|--------|---------|
| Job Postings | 30 pts | "CRM Administrator hiring" |
| Competitor Dissatisfaction | 25 pts | "Salesforce alternative" searches |
| News Events | 20 pts | Funding + digital transformation |
| Review Site Activity | 15 pts | G2/Capterra CRM comparisons |
| Web Discussion | 10 pts | Reddit/Quora CRM evaluation threads |

---

## Score Decay

Scores decay gradually when no new signals appear:
- Job postings: -5 pts per 7 days without new signal
- News/competitor signals: -5 pts per 14 days
- Web discussions: -5 pts per 10 days
- Review site: -5 pts per 21 days

The decay job runs nightly. Minimum score is 0.

---

## Project Structure

```
intent-platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── scheduler.py         # APScheduler (batch + decay)
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic response schemas
│   │   ├── api/routes/          # FastAPI route handlers
│   │   └── services/
│   │       ├── gemini_client.py # Gemini Search Grounding
│   │       ├── claude_client.py # Claude Stage 2 + 3
│   │       ├── discovery.py     # Multi-signal discovery engine
│   │       ├── scoring.py       # AI pipeline orchestration
│   │       ├── decay.py         # Score decay algorithm
│   │       └── batch.py         # Batch run orchestrator
│   ├── tests/                   # pytest test suite (17 tests)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/page.tsx         # Main dashboard
│       ├── components/
│       │   ├── Leaderboard.tsx  # Account leaderboard
│       │   ├── CompanyCard.tsx  # Expandable company card
│       │   ├── Heatmap.tsx      # Market heatmap
│       │   ├── BatchControl.tsx # Batch trigger + progress
│       │   └── ScoreBadge.tsx   # Score tier badge
│       └── lib/api.ts           # API client
└── docker-compose.yml           # PostgreSQL
```

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
# 17 tests covering scoring, decay, and discovery logic
```

---

## Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Batch Discovery | Weekly (Mon 6am) | Full signal scan + scoring |
| Score Decay | Nightly (2am) | Apply gradual score decay |

Override in `.env`:
```
BATCH_SCHEDULE_CRON=0 6 * * 1
DECAY_SCHEDULE_CRON=0 2 * * *
```
