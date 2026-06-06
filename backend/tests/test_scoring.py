import pytest
from app.services.scoring import _buying_stage_from_score, SIGNAL_TYPE_WEIGHTS


def test_buying_stage_decision_ready():
    assert _buying_stage_from_score(90) == "Decision-Ready"
    assert _buying_stage_from_score(86) == "Decision-Ready"
    assert _buying_stage_from_score(100) == "Decision-Ready"


def test_buying_stage_evaluation():
    assert _buying_stage_from_score(61) == "Evaluation"
    assert _buying_stage_from_score(75) == "Evaluation"
    assert _buying_stage_from_score(85) == "Evaluation"


def test_buying_stage_research():
    assert _buying_stage_from_score(31) == "Research"
    assert _buying_stage_from_score(50) == "Research"
    assert _buying_stage_from_score(60) == "Research"


def test_buying_stage_awareness():
    assert _buying_stage_from_score(0) == "Awareness"
    assert _buying_stage_from_score(15) == "Awareness"
    assert _buying_stage_from_score(30) == "Awareness"


def test_signal_weights_cover_all_types():
    required_types = {"job_posting", "competitor_dissatisfaction", "news", "review_site", "web_discussion"}
    assert required_types == set(SIGNAL_TYPE_WEIGHTS.keys())


def test_signal_weights_sum_to_100():
    assert sum(SIGNAL_TYPE_WEIGHTS.values()) == 100
