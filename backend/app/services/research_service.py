"""
B2B Sales Intelligence Research Service

Model:  Gemini (grounded search with fallback chain) → Claude Sonnet (9-section JSON)
"""

import json
import logging
from .claude_client import client as claude_client, CLAUDE_MODEL
from .gemini_client import _generate_with_fallback, _extract_json_from_text

logger = logging.getLogger(__name__)

_ANALYST_SYSTEM = (
    "You are a world-class B2B sales intelligence analyst, SDR strategist, ABM expert, "
    "and marketing consultant. You produce highly specific, actionable intelligence reports "
    "grounded in real company data. Every recommendation must be tied to the specific company, "
    "not generic advice. You always return valid JSON with no markdown fences."
)


# ── Gemini grounded search ────────────────────────────────────────────────────

def _gemini_search(query: str) -> str:
    """Grounded search with model fallback chain; returns natural language text."""
    text = _generate_with_fallback(query, grounded=True)
    return text[:9000] if text else ""


def _claude_knowledge_research(company_name: str, company_domain: str) -> str:
    """Fallback: use Claude's training knowledge when Gemini is fully rate-limited."""
    logger.warning(f"Gemini unavailable — falling back to Claude knowledge for {company_name}")
    prompt = (
        f"Provide comprehensive B2B sales intelligence on {company_name} (domain: {company_domain}).\n\n"
        "Include:\n"
        "1. Company overview, business model, products/services, revenue estimate, employee count\n"
        "2. Geographic presence, strategic priorities, recent known news/events\n"
        "3. Funding history / public listing status\n"
        "4. Known technology and CRM stack\n"
        "5. Leadership team: CEO, CTO, CFO, CRO, VP Sales, VP Marketing (names and titles)\n"
        "6. Competitive landscape and likely CRM buying signals\n"
        "7. Digital transformation or technology modernisation initiatives\n\n"
        "Be specific. Use real facts you know. Do not hallucinate URLs."
    )
    try:
        resp = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text
    except Exception as e:
        logger.error(f"Claude knowledge fallback failed for {company_name}: {e}")
        return ""


def _gather_intelligence(company_name: str, company_domain: str) -> str:
    """
    Run 3 sequential Gemini Search-grounded queries and concatenate results.
    Sequential to avoid hammering rate limits simultaneously.
    Falls back to Claude training knowledge if Gemini is fully unavailable.
    """
    queries = [
        (
            f"Comprehensive research on {company_name} (website: {company_domain}): "
            f"company overview, business model, products/services, revenue estimates, "
            f"employee headcount, geographic presence, strategic priorities, recent news 2024-2025, "
            f"funding/investor history, CRM and technology stack, digital transformation initiatives."
        ),
        (
            f"Research {company_name} leadership team and hiring activity: "
            f"CEO, CTO, CFO, CRO, VP Sales, VP Marketing, Head of Customer Success, RevOps/Sales Ops leaders — "
            f"include full names and LinkedIn profile URLs where available. "
            f"Also: job postings on LinkedIn or Indeed for CRM admin, Salesforce, HubSpot, "
            f"digital transformation, revenue operations roles 2024-2025."
        ),
        (
            f"Research {company_name} competitive landscape and CRM buying signals: "
            f"current CRM platform in use, G2/Capterra/TrustRadius reviews mentioning their CRM, "
            f"competitor CRM vendors likely pitching them (Salesforce, HubSpot, Microsoft Dynamics, Zoho, etc.), "
            f"recent trigger events (funding, M&A, leadership change, rapid growth), "
            f"customer complaints about their current CRM, similar companies that recently migrated CRM 2024-2025."
        ),
    ]

    parts = []
    for q in queries:
        text = _gemini_search(q)
        if text:
            parts.append(text)

    if not parts:
        # All Gemini calls failed — use Claude's training knowledge
        fallback = _claude_knowledge_research(company_name, company_domain)
        if fallback:
            parts.append(fallback)

    combined = "\n\n=====\n\n".join(parts)
    logger.info(f"Research gathered: {len(combined):,} chars for {company_name}")
    return combined


# ── Claude structured section generators ─────────────────────────────────────

def _claude(prompt: str, max_tokens: int = 7500) -> dict:
    try:
        resp = claude_client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=_ANALYST_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = resp.content[0].text
        raw = _extract_json_from_text(raw_text)
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Claude JSON parse error: {e} | raw preview: {raw_text[:400] if 'raw_text' in dir() else 'N/A'}")
        return {}
    except Exception as e:
        logger.error(f"Claude generation failed: {type(e).__name__}: {e}")
        return {}


def _section_1(company_name: str, research: str) -> dict:
    """Company intelligence — kept separate to stay within output token limits."""
    return _claude(f"""Using this research on {company_name}, produce the company intelligence section.

RESEARCH:
{research[:9000]}

Return JSON (no fences):
{{
  "company_intelligence": {{
    "overview": "2–3 paragraph overview specific to {company_name}",
    "business_model": "How {company_name} makes money",
    "products_services": ["Product/service 1", "Product/service 2"],
    "industry": "Industry",
    "market_segment": "Enterprise/Mid-market/SMB etc.",
    "revenue_estimate": "Revenue range with basis",
    "employee_count": "Headcount or range",
    "geographic_presence": ["Country/region 1", "Region 2"],
    "recent_news": [
      {{"headline": "Specific headline", "date": "Month Year", "relevance": "Why this matters for a CRM sale"}}
    ],
    "funding_history": "Specific funding rounds or 'Bootstrapped' or 'Public (TICKER)'",
    "strategic_priorities": ["Priority 1 with evidence", "Priority 2", "Priority 3"],
    "tech_stack": {{
      "crm": "Detected CRM or most likely CRM",
      "marketing_automation": "Tool if known",
      "other_tools": ["Tool 1", "Tool 2"]
    }},
    "hiring_trends": ["Specific trend with example roles", "Trend 2"]
  }}
}}""", max_tokens=4000)


def _sections_2_3(company_name: str, research: str) -> dict:
    """Stakeholders + competitive landscape — separate call to stay within token limits."""
    return _claude(f"""Using this research on {company_name}, produce stakeholder mapping and competitive landscape.

RESEARCH:
{research[:9000]}

Return JSON (no fences):
{{
  "stakeholder_mapping": [
    {{
      "name": "Real name if found, else 'Likely [Title]'",
      "role": "Exact title",
      "linkedin_url": "Full LinkedIn URL or null",
      "relevance": "Why they are the key decision-maker for our CRM solution",
      "pain_points": ["Specific pain 1", "Pain 2", "Pain 3"],
      "outreach_angle": "Best personalized hook for this specific person"
    }}
  ],
  "competitive_landscape": {{
    "current_crm": "Detected or likely CRM platform",
    "current_crm_weaknesses": ["Specific weakness of their current CRM relevant to {company_name}"],
    "competing_crm_vendors_pitching": ["Vendor likely pitching them 1", "Vendor 2"],
    "direct_business_competitors": ["Their industry competitor 1", "Competitor 2"],
    "crm_migration_examples_in_industry": ["Similar company that migrated + from/to"],
    "competitor_positioning_gaps": ["Gap we can exploit 1", "Gap 2"]
  }}
}}""", max_tokens=7000)


def _sections_4_5(company_name: str, research: str) -> dict:
    return _claude(f"""Using this web-grounded research on {company_name}, produce sections 4–5.

RESEARCH:
{research[:11000]}

Return JSON (no fences):
{{
  "sales_opportunity": {{
    "why_now": "Specific, evidence-backed reason {company_name} needs CRM now",
    "buying_signals": ["Signal 1 with specific evidence", "Signal 2", "Signal 3"],
    "trigger_events": ["Event 1 with date/context", "Event 2"],
    "growth_indicators": ["Indicator 1", "Indicator 2"],
    "sales_cycle_challenges": ["Challenge 1 with mitigation", "Challenge 2"],
    "deal_size_estimate": "$ range (e.g. '$80K–$200K ARR') based on headcount/segment",
    "conversion_probability": "High/Medium/Low — with specific reasoning",
    "recommended_entry_point": "Best department/persona to start with and why"
  }},
  "abm_strategy": {{
    "target_personas": [
      {{
        "role": "Specific title",
        "messaging": "Persona-specific message referencing {company_name} context",
        "hook": "Personalized hook using a real data point about {company_name}"
      }}
    ],
    "messaging_themes": ["Theme 1 tied to their specific pain", "Theme 2", "Theme 3"],
    "pain_point_positioning": "How to position our CRM against their detected specific pains",
    "content_recommendations": [
      {{"type": "Blog/Whitepaper/Case Study", "title": "Specific title", "rationale": "Why for {company_name}"}}
    ],
    "campaign_ideas": [
      {{
        "name": "Campaign name",
        "description": "Specific description referencing {company_name}",
        "channel": "LinkedIn/Email/Event/Ads",
        "kpi": "Expected outcome"
      }}
    ],
    "retargeting_strategy": "Specific retargeting approach for {company_name} stakeholders",
    "event_opportunities": ["Specific industry event they likely attend", "Event 2"],
    "partnership_opportunities": ["Partner type with rationale specific to {company_name}"]
  }}
}}""")


def _section_6(company_name: str, research: str, crm: str, industry: str) -> dict:
    """Outreach strategy — email sequence + LinkedIn + call script."""
    return _claude(f"""Using this research on {company_name} (Industry: {industry}, Current CRM: {crm}), write the outreach strategy.

RESEARCH:
{research[:8000]}

Return JSON (no fences):
{{
  "outreach_strategy": {{
    "email_sequence": [
      {{
        "email_number": 1,
        "timing": "Day 1 — cold intro",
        "subject": "Compelling subject referencing {company_name} or {industry} pain",
        "body": "Full personalized email body (150–200 words). Must reference specific {company_name} context, not generic.",
        "personalization_note": "What to verify/customize before sending",
        "objection_preempt": "One objection this email anticipates",
        "cta": "Specific CTA"
      }},
      {{
        "email_number": 2,
        "timing": "Day 4 — value add",
        "subject": "Subject",
        "body": "Value-add email sharing a specific insight relevant to {industry}",
        "personalization_note": "Customization note",
        "objection_preempt": "Objection",
        "cta": "CTA"
      }},
      {{
        "email_number": 3,
        "timing": "Day 9 — social proof",
        "subject": "Subject",
        "body": "Similar company story or case study relevant to {industry}",
        "personalization_note": "Customization note",
        "objection_preempt": "Objection",
        "cta": "CTA"
      }},
      {{
        "email_number": 4,
        "timing": "Day 16 — trigger-based",
        "subject": "Subject referencing a specific {company_name} news/event",
        "body": "Trigger-based email referencing a recent {company_name} announcement or initiative",
        "personalization_note": "Customization note",
        "objection_preempt": "Objection",
        "cta": "CTA"
      }},
      {{
        "email_number": 5,
        "timing": "Day 25 — breakup",
        "subject": "Final touch subject",
        "body": "Break-up or last-touch email with a different angle or strong final ask",
        "personalization_note": "Customization note",
        "objection_preempt": "Objection",
        "cta": "CTA"
      }}
    ],
    "linkedin_strategy": {{
      "connection_request": "Personalized note <300 chars referencing {company_name} or shared context",
      "first_message": "First message after connecting <300 chars with specific hook",
      "follow_up_sequence": [
        "Day 4: Specific follow-up text",
        "Day 10: Value-add text referencing {industry} insight",
        "Day 18: Content share or trigger-based message"
      ],
      "content_topics_to_engage_on": ["Topic 1 they likely post about", "Topic 2", "Topic 3"],
      "warm_up_plan": "How to warm up {company_name} stakeholders before outreach"
    }},
    "call_strategy": {{
      "opener": "Specific discovery call opener referencing {company_name} — not generic",
      "qualification_questions": [
        "Q1: About their current CRM situation",
        "Q2: About pain points with {crm}",
        "Q3: About decision-making process",
        "Q4: About timeline and urgency",
        "Q5: About budget authority (MEDDIC-style)"
      ],
      "objection_handling": [
        {{"objection": "We're satisfied with {crm}", "response": "Specific response using {crm} weakness"}},
        {{"objection": "No budget this quarter", "response": "Specific ROI-based response"}},
        {{"objection": "We're evaluating Salesforce/HubSpot", "response": "Specific differentiation response"}},
        {{"objection": "Too busy right now", "response": "Specific timing response"}}
      ],
      "meeting_booking_script": "Full script to book discovery call — specific to {company_name} context"
    }}
  }}
}}""", max_tokens=6000)


def _sections_7_9(company_name: str, research: str, crm: str, industry: str) -> dict:
    """Content recommendations + competitive battlecard + executive summary."""
    return _claude(f"""Using this research on {company_name} (Industry: {industry}, Current CRM: {crm}), produce sections 7–9.

RESEARCH:
{research[:8000]}

Return JSON (no fences):
{{
  "content_recommendations": {{
    "blog_topics": [
      {{"title": "Specific blog title", "rationale": "Why relevant to {company_name} in {industry}"}},
      {{"title": "Title 2", "rationale": "Rationale 2"}},
      {{"title": "Title 3", "rationale": "Rationale 3"}}
    ],
    "whitepaper_ideas": [
      {{"title": "Whitepaper title", "angle": "Specific angle for {industry}", "target_persona": "Who reads it"}}
    ],
    "case_study_recommendations": [
      {{"type": "Company profile similar to {company_name}", "outcome": "What result to highlight", "relevance": "Why this resonates"}}
    ],
    "industry_insights_to_share": ["Specific insight 1", "Insight 2"],
    "thought_leadership_angles": [
      {{"topic": "Executive topic", "hook": "Why {company_name} executives care about this"}}
    ]
  }},
  "competitive_battlecard": [
    {{
      "competitor": "{crm} or main competing CRM",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Specific weakness from reviews", "Weakness 2", "Weakness 3"],
      "common_customer_complaints": ["Real complaint from G2/Capterra", "Complaint 2"],
      "our_positioning_against_them": "How our CRM beats them for {company_name}",
      "counter_messaging": ["Specific counter message 1", "Counter message 2"]
    }},
    {{
      "competitor": "Second most likely CRM competitor",
      "strengths": ["Strength 1"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "common_customer_complaints": ["Complaint 1"],
      "our_positioning_against_them": "Positioning for {company_name}",
      "counter_messaging": ["Counter message 1"]
    }}
  ],
  "executive_summary": {{
    "top_5_insights": [
      "Insight 1 — most important, specific to {company_name} with evidence",
      "Insight 2",
      "Insight 3",
      "Insight 4",
      "Insight 5"
    ],
    "biggest_opportunity": "The single clearest opportunity with {company_name} and why now",
    "biggest_risk": "The biggest obstacle or risk in this account and how to mitigate",
    "recommended_next_action": "The one specific action to take in the next 48 hours",
    "thirty_day_plan": [
      "Week 1: Specific actions with targets",
      "Week 2: Specific actions",
      "Week 3: Specific actions",
      "Week 4: Specific actions and review"
    ]
  }}
}}""", max_tokens=7000)


# ── Public entry point ────────────────────────────────────────────────────────

def generate_research_report(
    company_name: str,
    company_domain: str,
    progress_callback=None,
) -> dict:
    """
    Generate a 9-section B2B sales intelligence report.

    Research model:  Gemini 2.5 Flash + Google Search Grounding (real-time web data)
    Analysis model:  Claude Sonnet (structured JSON, section-by-section)
    """
    def _progress(msg: str, pct: int):
        logger.info(f"[{pct:3d}%] {msg}")
        if progress_callback:
            progress_callback(msg, pct)

    _progress("Searching with Gemini 2.5 Flash + Google Search Grounding…", 5)
    research = _gather_intelligence(company_name, company_domain)
    if not research.strip():
        raise ValueError(f"No research data returned for '{company_name}'")

    _progress("Generating company intelligence…", 20)
    s1 = _section_1(company_name, research)

    _progress("Mapping stakeholders & competitive landscape…", 35)
    s2_3 = _sections_2_3(company_name, research)

    _progress("Building sales opportunity analysis & ABM strategy…", 52)
    s4_5 = _sections_4_5(company_name, research)

    crm = s1.get("company_intelligence", {}).get("tech_stack", {}).get("crm", "their current CRM")
    industry = s1.get("company_intelligence", {}).get("industry", "their industry")

    _progress("Writing outreach email sequence, LinkedIn & call scripts…", 68)
    s6 = _section_6(company_name, research, crm, industry)

    _progress("Building content plan, battlecard & executive summary…", 84)
    s7_9 = _sections_7_9(company_name, research, crm, industry)

    _progress("Report complete", 100)

    return {
        **s1,
        **s2_3,
        **s4_5,
        **s6,
        **s7_9,
        "_meta": {
            "company_name": company_name,
            "company_domain": company_domain,
            "research_model": "gemini-2.5-flash → 2.0-flash → 2.0-flash-lite (with grounding fallback)",
            "analysis_model": CLAUDE_MODEL,
        },
    }
