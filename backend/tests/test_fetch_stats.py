"""Tests for Sleeper projection/stats ingestion."""

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

_LAMBDA = Path(__file__).resolve().parent.parent / "lambda"
sys.path.insert(0, str(_LAMBDA))

import fetch_stats as fetch_stats  # noqa: E402


def _mock_response(payload: dict) -> MagicMock:
    """Build a fake requests response object with json() + raise_for_status()."""
    response = MagicMock()
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


def test_fetch_weekly_projections_returns_positive_count() -> None:
    """fetch_weekly_projections returns > 0 when API payloads are valid."""
    session = MagicMock()
    select_result = MagicMock()
    select_result.all.return_value = [("123", 1)]
    session.execute.side_effect = [
        select_result,
        None,
    ]

    projections_payload = {"123": {"pts_ppr": "16.4"}}
    stats_payload = {"123": {"pts_ppr": "14.0"}}

    with (
        patch.object(fetch_stats, "_sleep_rate_limit", return_value=None),
        patch.object(
            fetch_stats,
            "requests",
        ) as requests_mock,
        patch.object(fetch_stats, "pg_insert") as pg_insert_mock,
    ):
        requests_mock.get.side_effect = [
            _mock_response(projections_payload),
            _mock_response(stats_payload),
        ]

        stmt = MagicMock()
        stmt.values.return_value = stmt
        stmt.on_conflict_do_update.return_value = stmt
        stmt.excluded.points = "points"
        stmt.excluded.projected_points = "projected_points"
        stmt.excluded.projections = "projections"
        pg_insert_mock.return_value = stmt

        count = fetch_stats.fetch_weekly_projections(session, season=2025, week=18)

    assert isinstance(count, int)
    assert count > 0
    session.commit.assert_called_once()
