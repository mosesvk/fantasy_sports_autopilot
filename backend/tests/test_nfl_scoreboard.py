"""Tests for NFL scoreboard proxy and normalization."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.nfl_scoreboard import normalize_scoreboard_response


def test_normalize_scoreboard_empty_events() -> None:
    """Empty ESPN payload yields no game days."""
    raw = {"leagues": [], "events": []}
    out = normalize_scoreboard_response(raw, season=2025, week=12, seasontype=2)
    assert out["season"] == 2025
    assert out["week"] == 12
    assert out["days"] == []


def test_scoreboard_endpoint_uses_provider() -> None:
    """GET /api/nfl/scoreboard returns 200 when upstream succeeds."""
    fake_raw = {
        "leagues": [
            {
                "calendar": [
                    {
                        "label": "Regular Season",
                        "entries": [{"value": "12", "detail": "Nov 19-25"}],
                    },
                ],
            },
        ],
        "events": [],
    }

    def fake_fetch(*args, **kwargs):  # noqa: ANN001, ANN002
        return fake_raw

    with patch("app.routers.nfl_scoreboard.fetch_espn_scoreboard_raw", fake_fetch):
        client = TestClient(app)
        response = client.get("/api/nfl/scoreboard", params={"season": 2025, "week": 12})
    assert response.status_code == 200
    body = response.json()
    assert body["week"] == 12
    assert body["week_strip"][0]["week"] == 12
    assert body["days"] == []
