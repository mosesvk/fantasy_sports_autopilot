"""Tests for NFL game detail (box score / PBP) proxy."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.nfl_game_detail import normalize_game_detail


def test_normalize_game_detail_minimal() -> None:
    """Normalizer tolerates empty box/drives."""
    raw = {
        "header": {
            "competitions": [
                {
                    "status": {"type": {"shortDetail": "Final"}},
                    "competitors": [
                        {"homeAway": "away", "team": {"abbreviation": "BUF"}},
                        {"homeAway": "home", "team": {"abbreviation": "HOU"}},
                    ],
                },
            ],
        },
        "boxscore": {"players": []},
        "drives": {"previous": []},
    }
    out = normalize_game_detail(raw, game_id="401772946")
    assert out["game_id"] == "401772946"
    assert out["away_abbr"] == "BUF"
    assert out["home_abbr"] == "HOU"
    assert out["play_by_play"] == []


def test_game_detail_endpoint() -> None:
    """GET /api/nfl/games/{id}/detail returns JSON when upstream succeeds."""
    fake = {
        "header": {
            "competitions": [
                {
                    "status": {"type": {"shortDetail": "Final"}},
                    "competitors": [
                        {"homeAway": "away", "team": {"abbreviation": "BUF"}},
                        {"homeAway": "home", "team": {"abbreviation": "HOU"}},
                    ],
                },
            ],
        },
        "boxscore": {"players": []},
        "drives": {"previous": []},
    }

    def fake_fetch(*args, **kwargs):  # noqa: ANN001, ANN002
        return fake

    with patch("app.routers.nfl_scoreboard.fetch_espn_game_summary_raw", fake_fetch):
        client = TestClient(app)
        r = client.get("/api/nfl/games/401772946/detail")
    assert r.status_code == 200
    body = r.json()
    assert body["game_id"] == "401772946"
    assert body["away_abbr"] == "BUF"


def test_game_detail_rejects_non_numeric_id() -> None:
    """Non-numeric game ids are rejected."""
    client = TestClient(app)
    r = client.get("/api/nfl/games/abcd/detail")
    assert r.status_code == 400
