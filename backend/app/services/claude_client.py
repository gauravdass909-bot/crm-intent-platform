import json
import logging
from typing import Any
import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential
from ..config import settings

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

CLAUDE_MODEL = "claude-sonnet-4-6"

STAGE2_SYSTEM = """You are a B2B intent analyst specializing in enterprise CRM buying signals.
You analyze evidence about companies and determine their likelihood of entering a CRM buying cycle.
You always return valid JSON. You are precise, analytical, and base conclusions strictly on provided evidence."""

STAGE3_SYSTEM = """You are a senior B2B intent validation specialist.
You review intent scores produced by a junior analyst and validate their accuracy.
You check for contradictions, overscoring, and underscoring.
You always return valid JSON with your validated assessment."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=30))
def reason_intent(company_data: dict[str, Any], signals: list[dict[str, Any]]) -> dict[str, Any]:
    """Stage 2: Claude reasons about company intent and produces a score."""
    signals_text = json.dumps(signals, indent=2)

    prompt = f"""Analyze the following company and its detected CRM intent signals.

COMPANY PROFILE:
- Name: {company_data.get('confirmed_name', 'Unknown')}
- Domain: {company_data.get('confirmed_domain', 'Unknown')}
- Industry: {company_data.get('industry', 'Unknown')}
- Employee Count: {company_data.get('employee_count_estimate', 'Unknown')}
- Revenue Estimate: {company_data.get('revenue_estimate_usd', 'Unknown')}
- Headquarters: {company_data.get('headquarters_country', 'Unknown')}
- Currently Using: {company_data.get('detected_current_crm', 'Unknown')}

DETECTED SIGNALS:
{signals_text}

Based on this evidence, produce an intent assessment.

Score the company's CRM buying intent from 0-100:
- 0-30: Low (Awareness - weak or single signals)
- 31-60: Medium (Research - early-stage signals)
- 61-85: High (Evaluation - comparing vendors)
- 86-100: Very High (Decision-Ready - active selection)

Return a JSON object:
{{
  "raw_score": integer (0-100),
  "buying_stage": "Awareness"|"Research"|"Evaluation"|"Decision-Ready",
  "pain_points": [list of detected pain points, max 5],
  "intent_summary": string (2-3 sentences explaining the score),
  "outreach_message": string (a personalized LinkedIn/email message, 150-200 words, specific to detected signals and pain points),
  "firmographics": {{
    "industry": string or null,
    "employee_count": integer or null,
    "revenue_estimate_usd": integer or null,
    "headquarters_country": string or null,
    "headquarters_city": string or null
  }},
  "detected_crm": string or null,
  "scoring_rationale": string (explain which signals drove the score)
}}

Return ONLY valid JSON.
"""

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2000,
        system=STAGE2_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    result = json.loads(text)
    result["_input_tokens"] = response.usage.input_tokens
    result["_output_tokens"] = response.usage.output_tokens
    return result


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=30))
def validate_score(stage2_result: dict[str, Any], signals: list[dict[str, Any]]) -> dict[str, Any]:
    """Stage 3: Claude validates the Stage 2 score for consistency."""
    prompt = f"""A junior analyst produced this intent assessment. Validate it for accuracy.

STAGE 2 ASSESSMENT:
{json.dumps(stage2_result, indent=2)}

ORIGINAL SIGNALS:
{json.dumps(signals, indent=2)}

Validation checks:
1. Is the raw_score (0-100) consistent with the number and strength of signals?
2. Is the buying_stage label consistent with the score?
3. Are there any contradictory signals (e.g., company just signed a multi-year Salesforce contract)?
4. Is the score inflated without sufficient evidence, or underscored despite strong signals?
5. Is the confidence level appropriate?

Return a JSON object:
{{
  "validated_score": integer (0-100, your corrected score — keep original if correct),
  "score_adjustment": integer (positive = increased, negative = decreased, 0 = no change),
  "adjustment_reason": string or null (only if you changed the score),
  "confidence_level": "Low"|"Medium"|"High"|"Very High",
  "contradictory_signals": [list of any contradictions found],
  "validation_notes": string (1-2 sentences on overall assessment quality),
  "_input_tokens": 0,
  "_output_tokens": 0
}}

Return ONLY valid JSON.
"""

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1000,
        system=STAGE3_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    result = json.loads(text)
    result["_input_tokens"] = response.usage.input_tokens
    result["_output_tokens"] = response.usage.output_tokens
    return result
