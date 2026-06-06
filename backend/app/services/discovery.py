import logging
from collections import defaultdict
from .gemini_client import search_for_signals, deep_research_company, SIGNAL_QUERIES
from ..config import settings

logger = logging.getLogger(__name__)


def _normalize_domain(domain: str) -> str:
    """Strip www. and lowercase for deduplication."""
    return domain.lower().replace("www.", "").strip("/")


def discover_intent_companies() -> list[dict]:
    """
    Stage 1: Run all signal queries, aggregate by company, filter to those
    appearing in MIN_SIGNALS_FOR_QUALIFICATION distinct signal types.
    Returns a list of company dicts ready for deep research.
    """
    company_signals: dict[str, dict] = {}  # domain -> {name, signals_by_type}

    for signal_type, queries in SIGNAL_QUERIES.items():
        logger.info(f"Running {len(queries)} queries for signal type: {signal_type}")
        for query in queries:
            try:
                results = search_for_signals(query, signal_type)
                for r in results:
                    domain = _normalize_domain(r.get("company_domain", ""))
                    if not domain:
                        continue
                    if domain not in company_signals:
                        company_signals[domain] = {
                            "name": r.get("company_name", domain),
                            "domain": domain,
                            "signal_types": set(),
                            "raw_signals": [],
                        }
                    company_signals[domain]["signal_types"].add(signal_type)
                    company_signals[domain]["raw_signals"].append({
                        "signal_type": signal_type,
                        "signal_description": r.get("signal_description", ""),
                        "source_url": r.get("source_url"),
                        "source_name": r.get("source_name"),
                        "employee_count_hint": r.get("employee_count_hint"),
                        "headquarters_hint": r.get("headquarters_hint"),
                        "current_crm_hint": r.get("current_crm_hint"),
                    })
                    logger.debug(f"Signal found: {r.get('company_name')} via {signal_type}")
            except Exception as e:
                logger.error(f"Discovery query failed: {e}")

    min_signals = settings.min_signals_for_qualification
    qualified = [
        v for v in company_signals.values()
        if len(v["signal_types"]) >= min_signals
    ]

    qualified.sort(key=lambda x: len(x["signal_types"]), reverse=True)
    logger.info(f"Discovery complete: {len(company_signals)} total, {len(qualified)} qualified (>= {min_signals} signal types)")
    return qualified[:settings.max_companies_per_batch]


def enrich_company(company: dict) -> dict:
    """Run Gemini deep research on a qualified company."""
    try:
        research = deep_research_company(company["name"], company["domain"])
        research["_discovery_signals"] = company.get("raw_signals", [])
        return research
    except Exception as e:
        logger.error(f"Deep research failed for {company['name']}: {e}")
        return {"confirmed_name": company["name"], "confirmed_domain": company["domain"], "signals": company.get("raw_signals", [])}
