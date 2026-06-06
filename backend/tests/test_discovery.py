import pytest
from app.services.discovery import _normalize_domain
from app.services.gemini_client import _is_excluded, SIGNAL_QUERIES


def test_normalize_domain_strips_www():
    assert _normalize_domain("www.acme.com") == "acme.com"


def test_normalize_domain_lowercases():
    assert _normalize_domain("Acme.COM") == "acme.com"


def test_normalize_domain_strips_trailing_slash():
    assert _normalize_domain("acme.com/") == "acme.com"


def test_exclusion_filter_academic():
    assert _is_excluded("This is a university case study on CRM")
    assert _is_excluded("Student thesis about Salesforce")
    assert _is_excluded("Research paper on CRM implementation")


def test_exclusion_filter_passes_enterprise():
    assert not _is_excluded("Acme Corp is hiring a CRM Administrator")
    assert not _is_excluded("Company evaluating Salesforce alternatives")


def test_signal_queries_cover_all_types():
    required = {"job_posting", "competitor_dissatisfaction", "news", "review_site", "web_discussion"}
    assert required == set(SIGNAL_QUERIES.keys())


def test_each_signal_type_has_queries():
    for signal_type, queries in SIGNAL_QUERIES.items():
        assert len(queries) >= 1, f"{signal_type} must have at least one query"
