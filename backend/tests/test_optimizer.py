"""Integration-style test for greedy lineup optimizer."""

import sys
from collections import Counter
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Session

_BACKEND = Path(__file__).resolve().parent.parent
_LAMBDA = _BACKEND / "lambda"
sys.path.insert(0, str(_BACKEND))
sys.path.insert(0, str(_LAMBDA))

import lineup_optimizer as opt  # noqa: E402
from app.database import Base  # noqa: E402
from app.models import Player, PlayerStat  # noqa: E402


def _add_player(session: Session, sleeper_id: str, name: str, position: str, points: float) -> None:
    """Insert one player and matching weekly projection."""
    player = Player(
        sleeper_id=sleeper_id,
        name=name,
        position=position,
        team="TST",
    )
    session.add(player)
    session.flush()
    session.add(
        PlayerStat(
            player_id=player.id,
            week=18,
            season=2025,
            points=None,
            projected_points=points,
            projections={"pts_ppr": points},
        )
    )


def test_optimize_lineup_with_sqlite_has_expected_starters() -> None:
    """Optimizer returns complete 9-slot lineup and positive total projection."""
    # SQLite cannot compile PostgreSQL JSONB, so swap type for tests.
    PlayerStat.__table__.c.projections.type = JSON()

    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        _add_player(session, "qb1", "QB One", "QB", 24.0)
        _add_player(session, "rb1", "RB One", "RB", 21.0)
        _add_player(session, "rb2", "RB Two", "RB", 20.0)
        _add_player(session, "rb3", "RB Three", "RB", 18.0)
        _add_player(session, "wr1", "WR One", "WR", 19.0)
        _add_player(session, "wr2", "WR Two", "WR", 17.0)
        _add_player(session, "wr3", "WR Three", "WR", 16.0)
        _add_player(session, "te1", "TE One", "TE", 14.0)
        _add_player(session, "k1", "K One", "K", 9.0)
        _add_player(session, "def1", "DEF One", "DEF", 8.0)
        session.commit()

        result = opt.optimize_lineup(session, season=2025, week=18)

    assert len(result["starters"]) == 9
    assert result["total_projected_points"] > 0

    slots = [starter["slot"] for starter in result["starters"]]
    counts = Counter(slots)
    assert counts["QB"] == 1
    assert counts["RB1"] == 1
    assert counts["RB2"] == 1
    assert counts["WR1"] == 1
    assert counts["WR2"] == 1
    assert counts["TE"] == 1
    assert counts["FLEX"] == 1
    assert counts["K"] == 1
    assert counts["DEF"] == 1
