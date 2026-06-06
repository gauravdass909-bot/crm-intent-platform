import re
import uuid
import threading
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ...services.research_service import generate_research_report

router = APIRouter(prefix="/research", tags=["research"])

# In-memory job store (sufficient for single-instance MVP)
_jobs: dict[str, dict] = {}
_lock = threading.Lock()


class ResearchRequest(BaseModel):
    company_name: str
    company_url: str


def _clean_domain(url: str) -> str:
    domain = re.sub(r"^https?://", "", url.strip())
    domain = re.sub(r"^www\.", "", domain)
    return domain.split("/")[0].strip()


@router.post("/start")
def start_research(body: ResearchRequest):
    if not body.company_name.strip() or not body.company_url.strip():
        raise HTTPException(400, "company_name and company_url are required")

    job_id = str(uuid.uuid4())
    domain = _clean_domain(body.company_url)

    with _lock:
        _jobs[job_id] = {
            "status": "running",
            "progress_pct": 0,
            "message": "Starting research…",
            "company_name": body.company_name,
            "company_domain": domain,
            "result": None,
            "error": None,
        }

    def _run():
        def _cb(msg: str, pct: int):
            with _lock:
                if job_id in _jobs:
                    _jobs[job_id]["progress_pct"] = pct
                    _jobs[job_id]["message"] = msg

        try:
            result = generate_research_report(body.company_name, domain, _cb)
            with _lock:
                _jobs[job_id].update(status="completed", result=result,
                                     progress_pct=100, message="Report ready")
        except Exception as e:
            with _lock:
                _jobs[job_id].update(status="failed", error=str(e))

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": job_id, "status": "started"}


@router.get("/{job_id}/status")
def job_status(job_id: str):
    with _lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress_pct": job["progress_pct"],
        "message": job["message"],
        "company_name": job["company_name"],
        "company_domain": job["company_domain"],
        "error": job["error"],
    }


@router.get("/{job_id}/report")
def get_report(job_id: str):
    with _lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "completed":
        raise HTTPException(400, f"Job not complete (status: {job['status']})")
    return job["result"]
