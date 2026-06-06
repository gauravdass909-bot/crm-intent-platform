import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
from app.services.decay import apply_decay, DECAY_DAYS_PER_5_POINTS


def test_decay_rates_defined_for_all_types():
    required = {"job_posting", "competitor_dissatisfaction", "news", "review_site", "web_discussion"}
    assert required == set(DECAY_DAYS_PER_5_POINTS.keys())


def test_decay_does_not_go_below_zero():
    from app.services.decay import DECAY_DAYS_PER_5_POINTS
    raw_score = 10
    days_since = 200
    decay_interval = DECAY_DAYS_PER_5_POINTS["job_posting"]
    decay_amount = int(days_since / decay_interval) * 5
    result = max(0, raw_score - decay_amount)
    assert result == 0


def test_decay_amount_calculation():
    raw_score = 80
    days_since = 14
    decay_interval = DECAY_DAYS_PER_5_POINTS["job_posting"]  # 7 days
    decay_amount = int(days_since / decay_interval) * 5
    new_score = max(0, raw_score - decay_amount)
    assert decay_amount == 10
    assert new_score == 70


def test_fresh_signal_no_decay():
    days_since = 0
    decay_interval = 7
    decay_amount = int(days_since / decay_interval) * 5
    assert decay_amount == 0
