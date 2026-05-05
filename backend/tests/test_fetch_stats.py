"""Tests for Sleeper fetch helpers."""

import sys
from pathlib import Path

_LAMBDA = Path(__file__).resolve().parent.parent / "lambda"
sys.path.insert(0, str(_LAMBDA))

import fetch_stats as fetch_stats  # noqa: E402

_extract_pts_ppr = fetch_stats._extract_pts_ppr


def test_extract_pts_ppr() -> None:
    """Parse pts_ppr from Sleeper blob."""
    assert _extract_pts_ppr({"pts_ppr": "12.5"}) == 12.5
    assert _extract_pts_ppr({"pts_ppr": 3}) == 3.0
    assert _extract_pts_ppr({}) is None
