import json
import logging
from typing import Any
import google.generativeai as genai
from google.generativeai import protos
from tenacity import retry, stop_after_attempt, wait_exponential
from ..config import settings

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.google_api_key)

# Correct SDK format for Google Search grounding (google-generativeai 0.8.x)
# google_search_retrieval is the right proto field; the dict form was wrong.
_SEARCH_TOOL = protos.Tool(google_search_retrieval=protos.GoogleSearchRetrieval())

# Model fallback chain — tried in order when one is rate-limited
_GROUNDED_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
_PLAIN_MODELS    = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]


def _generate_with_fallback(prompt: str, *, grounded: bool = True) -> str:
    """Try models in order; fall back to plain (no grounding) on rate-limit.

    On quota errors we skip immediately to the next model — all models share
    the same project quota, so waiting between attempts doesn't help.  Callers
    that need a slow retry (e.g. the discovery batch) should implement their
    own back-off loop around this function.
    """
    models = _GROUNDED_MODELS if grounded else _PLAIN_MODELS
    tool_list = [_SEARCH_TOOL] if grounded else []

    for model_name in models:
        try:
            model = genai.GenerativeModel(model_name=model_name, tools=tool_list)
            resp = model.generate_content(prompt)
            text = resp.text.strip() if resp.text else ""
            if text:
                logger.info(f"[{model_name}{'+ grounding' if grounded else ''}] returned {len(text)} chars")
                return text
        except Exception as e:
            err = str(e)
            if "429" in err or "ResourceExhausted" in err or "quota" in err.lower():
                logger.warning(f"{model_name} rate-limited — skipping to next model")
                continue  # all models share the same quota; no point waiting here
            logger.warning(f"{model_name} failed: {type(e).__name__}: {err[:120]}")
            continue

    # If grounded failed, try once without grounding
    if grounded:
        logger.warning("All grounded models exhausted — trying plain (no grounding)")
        return _generate_with_fallback(prompt, grounded=False)

    logger.error("All Gemini models exhausted (grounded + plain)")
    return ""

SIGNAL_QUERIES = {
    "job_posting": [
        '"CRM administrator" OR "CRM analyst" OR "CRM manager" enterprise company hiring 2025',
        '"Salesforce administrator" OR "HubSpot administrator" job posting enterprise 2025',
        '"CRM implementation" OR "CRM migration" specialist hiring 2025',
        '"CRM consultant" OR "CRM architect" enterprise recruitment 2025',
    ],
    "competitor_dissatisfaction": [
        '"Salesforce alternative" OR "replace Salesforce" enterprise company 2025',
        '"HubSpot replacement" OR "switch from HubSpot" enterprise 2025',
        '"switching from Dynamics" OR "Microsoft CRM alternative" enterprise 2025',
        '"Zoho alternative" OR "SAP CRM replacement" OR "Oracle CX alternative" enterprise 2025',
        '"CRM dissatisfied" OR "CRM too expensive" OR "CRM not working" enterprise 2025',
    ],
    "news": [
        '"digital transformation" "CRM" enterprise company announcement 2025',
        '"CRM migration" OR "CRM modernization" enterprise press release 2025',
        'funding round enterprise company "CRM" OR "customer relationship" 2025',
        'acquisition merger enterprise "CRM integration" OR "technology overhaul" 2025',
    ],
    "review_site": [
        'site:g2.com "enterprise" "CRM" review comparison 2025',
        'site:capterra.com "enterprise CRM" comparison evaluation 2025',
        'site:trustradius.com "CRM" enterprise review 2025',
    ],
    "web_discussion": [
        'site:reddit.com "CRM evaluation" OR "CRM selection" enterprise company 2025',
        'site:quora.com "best enterprise CRM" OR "CRM comparison" 2025',
        '"CRM RFP" OR "CRM procurement" enterprise company 2025',
    ],
}

EXCLUSION_TERMS = ["university", "academic", "student", "thesis", "case study", "research paper", "course"]


def _is_excluded(text: str) -> bool:
    text_lower = text.lower()
    return any(term in text_lower for term in EXCLUSION_TERMS)


def _extract_json_from_text(text: str) -> str:
    """Strip markdown fences and find the JSON array/object in raw text."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        # parts[1] is the content between first pair of fences
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    # Check object first, then array — order matters since objects may contain arrays
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        idx = text.find(start_char)
        if idx != -1:
            end_idx = text.rfind(end_char)
            if end_idx != -1 and end_idx > idx:
                return text[idx : end_idx + 1]
    return text


def search_for_signals(query: str, signal_type: str) -> list[dict[str, Any]]:
    """Two-step: grounded search → plain extraction."""
    search_prompt = (
        f"Search the web for: {query}\n\n"
        "List enterprise companies (500+ employees) showing CRM buying intent. "
        "For each: company name, website domain, signal detected, evidence URL. "
        "Be specific with real company names."
    )
    raw_text = _generate_with_fallback(search_prompt, grounded=True)

    if len(raw_text) < 50:
        return []

    extract_prompt = f"""Extract CRM buyer signals from this search result.

SEARCH TEXT:
{raw_text[:6000]}

SIGNAL TYPE: {signal_type}

Return a JSON array (ONLY buyers — not CRM vendors, not universities, min 500 employees):
[{{"company_name":"...","company_domain":"...","signal_description":"...","source_url":"...","source_name":"...","employee_count_hint":"...","headquarters_hint":"...","current_crm_hint":"..."}}]

Return [] if nothing qualifies. Return ONLY valid JSON, no markdown."""

    try:
        raw = _generate_with_fallback(extract_prompt, grounded=False)
        parsed = json.loads(_extract_json_from_text(raw))
        results = [r for r in parsed if not _is_excluded(r.get("signal_description", ""))]
        logger.info(f"Extracted {len(results)} signals [{signal_type}]: {query[:50]}")
        return results
    except Exception as e:
        logger.warning(f"Extraction failed [{signal_type}]: {e}")
        return []


def deep_research_company(company_name: str, company_domain: str) -> dict[str, Any]:
    """Two-step: grounded research → structured extraction."""
    search_prompt = (
        f"Research {company_name} (website: {company_domain}) for CRM buying intent:\n"
        "1. Recent job postings for CRM admin/implementation/migration roles\n"
        "2. News: digital transformation, funding, M&A, leadership changes\n"
        "3. CRM evaluation discussions or competitor dissatisfaction\n"
        "4. G2/Capterra/TrustRadius reviews mentioning CRM pain points\n"
        "5. Current CRM technology (Salesforce, HubSpot, Dynamics, etc.)\n"
        "6. Company size, industry, headquarters\n"
        "Include specific URLs, dates, and evidence."
    )
    raw_text = _generate_with_fallback(search_prompt, grounded=True)
    if not raw_text:
        raw_text = f"Company: {company_name}, Domain: {company_domain}"

    extract_prompt = f"""Extract structured CRM intelligence from this research.

COMPANY: {company_name} ({company_domain})

RESEARCH:
{raw_text[:8000]}

Return JSON only:
{{"confirmed_name":"{company_name}","confirmed_domain":"{company_domain}","industry":null,"employee_count_estimate":null,"revenue_estimate_usd":null,"headquarters_country":null,"headquarters_city":null,"detected_current_crm":null,"signals":[{{"signal_type":"job_posting|competitor_dissatisfaction|news|review_site|web_discussion","signal_description":"...","source_url":null,"source_name":null,"signal_weight":10}}]}}

Return ONLY valid JSON. No markdown."""

    try:
        raw = _generate_with_fallback(extract_prompt, grounded=False)
        result = json.loads(_extract_json_from_text(raw))
        result.setdefault("confirmed_name", company_name)
        result.setdefault("confirmed_domain", company_domain)
        result.setdefault("signals", [])
        return result
    except Exception as e:
        logger.error(f"Extraction failed for {company_name}: {e}")
        return {"confirmed_name": company_name, "confirmed_domain": company_domain, "signals": []}


def research_company_by_url(url: str) -> dict[str, Any]:
    """
    Entry point for manual URL lookup. Strips protocol/path to get domain,
    then runs deep_research_company.
    """
    import re
    # Strip protocol, www, trailing path
    domain = re.sub(r"^https?://", "", url.strip())
    domain = re.sub(r"^www\.", "", domain)
    domain = domain.split("/")[0].strip()

    # Guess company name from domain (capitalize first segment)
    name_guess = domain.split(".")[0].replace("-", " ").title()

    logger.info(f"Manual URL lookup: {url} → domain={domain}, name_guess={name_guess}")
    return deep_research_company(name_guess, domain)
