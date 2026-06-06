import json
import logging
from typing import Any
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
from ..config import settings

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.google_api_key)

# Gemini 2.x uses "google_search", not "google_search_retrieval" (which was for 1.5)
_SEARCH_TOOL = {"google_search": {}}

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
    # Find first '[' or '{' to handle preamble text
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        idx = text.find(start_char)
        if idx != -1:
            # find matching close
            end_idx = text.rfind(end_char)
            if end_idx != -1 and end_idx > idx:
                return text[idx : end_idx + 1]
    return text


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=4, max=20))
def search_for_signals(query: str, signal_type: str) -> list[dict[str, Any]]:
    """Two-step: grounded search → separate extraction call."""

    # ── Step 1: grounded search (natural language output) ──
    try:
        search_model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            tools=[_SEARCH_TOOL],
        )
        search_prompt = (
            f"Search the web for: {query}\n\n"
            "List enterprise companies (500+ employees) that are showing signs of CRM buying intent. "
            "For each company include: company name, website domain, what signal was detected, evidence URL. "
            "Be specific with real company names and domains."
        )
        search_resp = search_model.generate_content(search_prompt)
        raw_text = search_resp.text.strip()
        logger.info(f"Grounded search returned {len(raw_text)} chars for: {query[:60]}")
    except Exception as e:
        logger.warning(f"Grounded search failed ({query[:50]}): {e}")
        raw_text = ""

    if len(raw_text) < 50:
        logger.warning(f"Empty/short grounded response, skipping extraction for: {query[:60]}")
        return []

    # ── Step 2: extract structured JSON from the search text ──
    try:
        extract_model = genai.GenerativeModel(model_name="gemini-2.5-flash")
        extract_prompt = f"""Extract company CRM intent signals from this web search result text.

SEARCH TEXT:
{raw_text[:6000]}

SIGNAL TYPE: {signal_type}

Return a JSON array of companies that are BUYERS showing CRM intent:
[
  {{
    "company_name": "Acme Corp",
    "company_domain": "acme.com",
    "signal_description": "Acme Corp posted 3 CRM administrator roles on LinkedIn indicating active CRM evaluation",
    "source_url": "https://linkedin.com/jobs/...",
    "source_name": "LinkedIn",
    "employee_count_hint": "5000+ employees",
    "headquarters_hint": "United States",
    "current_crm_hint": "Salesforce"
  }}
]

Rules:
- ONLY include buyer companies — NOT CRM vendors (Salesforce, HubSpot, Microsoft, Zoho, Oracle, SAP)
- ONLY include buyer companies — NOT universities, consultants, agencies, research institutions
- Minimum 500 employees
- If no qualifying companies found, return []

Return ONLY a valid JSON array. No markdown. No preamble."""

        extract_resp = extract_model.generate_content(extract_prompt)
        parsed = json.loads(_extract_json_from_text(extract_resp.text))
        results = [r for r in parsed if not _is_excluded(r.get("signal_description", ""))]
        logger.info(f"Extracted {len(results)} signals for {signal_type}: {query[:50]}")
        return results
    except Exception as e:
        logger.warning(f"Extraction step failed ({query[:50]}): {e}")
        return []


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=4, max=20))
def deep_research_company(company_name: str, company_domain: str) -> dict[str, Any]:
    """Two-step: grounded research → structured extraction."""

    # ── Step 1: grounded research ──
    try:
        search_model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            tools=[_SEARCH_TOOL],
        )
        search_prompt = (
            f"Research this company for CRM buying intent signals: {company_name} (website: {company_domain})\n\n"
            "Find and summarize:\n"
            "1. Recent job postings mentioning CRM (admin, implementation, migration roles)\n"
            "2. News about digital transformation, tech changes, funding, M&A\n"
            "3. Discussions about CRM evaluation, comparison, or dissatisfaction\n"
            "4. Reviews on G2, Capterra, TrustRadius about their CRM pain points\n"
            "5. Their current CRM technology (Salesforce, HubSpot, Dynamics, etc.)\n"
            "6. Company size, industry, headquarters country\n\n"
            "Be specific with URLs, dates, and evidence."
        )
        search_resp = search_model.generate_content(search_prompt)
        raw_text = search_resp.text.strip()
        logger.info(f"Deep research returned {len(raw_text)} chars for {company_name}")
    except Exception as e:
        logger.error(f"Grounded research failed for {company_name}: {e}")
        raw_text = f"Limited information available for {company_name} ({company_domain})."

    # ── Step 2: extract structured JSON ──
    try:
        extract_model = genai.GenerativeModel(model_name="gemini-2.5-flash")
        extract_prompt = f"""Extract structured company intelligence from this research text.

COMPANY: {company_name} ({company_domain})

RESEARCH TEXT:
{raw_text[:8000]}

Return a JSON object:
{{
  "confirmed_name": "{company_name}",
  "confirmed_domain": "{company_domain}",
  "industry": string or null,
  "employee_count_estimate": integer or null,
  "revenue_estimate_usd": integer or null,
  "headquarters_country": string or null,
  "headquarters_city": string or null,
  "detected_current_crm": string or null,
  "signals": [
    {{
      "signal_type": "job_posting"|"competitor_dissatisfaction"|"news"|"review_site"|"web_discussion",
      "signal_description": string (1-2 sentences of specific evidence),
      "source_url": string or null,
      "source_name": string or null,
      "signal_weight": integer (1-30 based on signal strength)
    }}
  ]
}}

Return ONLY valid JSON. No markdown."""

        extract_resp = extract_model.generate_content(extract_prompt)
        result = json.loads(_extract_json_from_text(extract_resp.text))
        # ensure required keys
        result.setdefault("confirmed_name", company_name)
        result.setdefault("confirmed_domain", company_domain)
        result.setdefault("signals", [])
        return result
    except Exception as e:
        logger.error(f"Extraction failed for {company_name}: {e}")
        return {
            "confirmed_name": company_name,
            "confirmed_domain": company_domain,
            "signals": [],
        }


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
