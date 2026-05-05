"""
Greedy fantasy lineup optimizer for standard PPR-style roster.

Roster: QB×1, RB×2, WR×2, TE×1, FLEX (RB/WR/TE)×1, K×1, DEF×1
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Lineup, LineupPlayer, Player, PlayerStat

logger = logging.getLogger(__name__)

FLEX_POSITIONS = frozenset({"RB", "WR", "TE"})


@dataclass
class ScoredPlayer:
    """Player row with projected points for optimizer."""

    player_pk: int
    sleeper_id: str
    name: str
    position: str
    projected_points: float


def _load_scored_players(
    session: Session, season: int, week: int
) -> list[ScoredPlayer]:
    """Load players with non-null projected_points for the given week."""
    rows = session.execute(
        select(
            Player.id,
            Player.sleeper_id,
            Player.name,
            Player.position,
            PlayerStat.projected_points,
        )
        .join(PlayerStat, PlayerStat.player_id == Player.id)
        .where(
            PlayerStat.season == season,
            PlayerStat.week == week,
            PlayerStat.projected_points.is_not(None),
        )
    ).all()

    out: list[ScoredPlayer] = []
    for pid, sid, name, pos, pp in rows:
        if pos not in ("QB", "RB", "WR", "TE", "K", "DEF"):
            continue
        out.append(
            ScoredPlayer(
                player_pk=pid,
                sleeper_id=str(sid),
                name=name,
                position=pos,
                projected_points=float(pp),
            )
        )
    return sorted(out, key=lambda x: x.projected_points, reverse=True)


def optimize_lineup(session: Session, season: int, week: int) -> dict[str, Any]:
    """
    Build the best greedy standard roster for PPR projected points.

    @param {Session} session DB session
    @param {int} season NFL season
    @param {int} week Fantasy week
    @returns {dict} Lineup detail including starters and metadata
    """
    scored = _load_scored_players(session, season, week)
    by_pos: dict[str, list[ScoredPlayer]] = {
        "QB": [],
        "RB": [],
        "WR": [],
        "TE": [],
        "K": [],
        "DEF": [],
    }
    for sp in scored:
        if sp.position in by_pos:
            by_pos[sp.position].append(sp)
    for pos in by_pos:
        by_pos[pos].sort(key=lambda x: x.projected_points, reverse=True)

    used: set[int] = set()
    starters: list[tuple[str, ScoredPlayer]] = []

    def take_slot(slot: str, pool: list[ScoredPlayer]) -> ScoredPlayer | None:
        for p in pool:
            if p.player_pk not in used:
                used.add(p.player_pk)
                starters.append((slot, p))
                return p
        return None

    take_slot("QB", by_pos["QB"])
    take_slot("RB1", by_pos["RB"])
    take_slot("RB2", by_pos["RB"])
    take_slot("WR1", by_pos["WR"])
    take_slot("WR2", by_pos["WR"])
    take_slot("TE", by_pos["TE"])

    flex_pool = [p for p in scored if p.position in FLEX_POSITIONS and p.player_pk not in used]
    flex_pool.sort(key=lambda x: x.projected_points, reverse=True)
    take_slot("FLEX", flex_pool)

    take_slot("K", by_pos["K"])
    take_slot("DEF", by_pos["DEF"])

    lineup = Lineup(week=week, season=season, sport="nfl")
    session.add(lineup)
    session.flush()

    result_starters: list[dict[str, Any]] = []
    for slot, pl in starters:
        session.add(
            LineupPlayer(
                lineup_id=lineup.id,
                player_id=pl.player_pk,
                slot=slot,
                projected_points=pl.projected_points,
            )
        )
        result_starters.append(
            {
                "slot": slot,
                "player_id": pl.player_pk,
                "sleeper_id": pl.sleeper_id,
                "name": pl.name,
                "position": pl.position,
                "projected_points": pl.projected_points,
            }
        )

    session.commit()

    total_proj = sum(s["projected_points"] for s in result_starters if s.get("projected_points"))

    return {
        "lineup_id": lineup.id,
        "season": season,
        "week": week,
        "starters": result_starters,
        "total_projected_points": total_proj,
    }
