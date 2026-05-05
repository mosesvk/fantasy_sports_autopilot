"""Unit tests for greedy lineup optimizer."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

_BACKEND = Path(__file__).resolve().parent.parent
_LAMBDA = _BACKEND / "lambda"
sys.path.insert(0, str(_BACKEND))
sys.path.insert(0, str(_LAMBDA))

import lineup_optimizer as opt  # noqa: E402

ScoredPlayer = opt.ScoredPlayer
optimize_lineup = opt.optimize_lineup


def test_optimize_lineup_builds_slots() -> None:
    """Optimizer selects starters under standard roster rules."""
    session = MagicMock()
    players = [
        ScoredPlayer(1, "a", "QB1", "QB", 20),
        ScoredPlayer(2, "b", "RB1", "RB", 18),
        ScoredPlayer(3, "c", "RB2", "RB", 17),
        ScoredPlayer(4, "d", "WR1", "WR", 16),
        ScoredPlayer(5, "e", "WR2", "WR", 15),
        ScoredPlayer(6, "f", "TE1", "TE", 14),
        ScoredPlayer(7, "g", "RB3", "RB", 13),
        ScoredPlayer(8, "h", "K1", "K", 9),
        ScoredPlayer(9, "i", "D1", "DEF", 8),
    ]

    def fake_load(_session, _season, _week):
        return players

    opt._load_scored_players = fake_load  # type: ignore[assignment]

    result = optimize_lineup(session, 2025, 10)
    slots = [s["slot"] for s in result["starters"]]
    assert slots == ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "K", "DEF"]
    flex = next(s for s in result["starters"] if s["slot"] == "FLEX")
    assert flex["name"] == "RB3"
