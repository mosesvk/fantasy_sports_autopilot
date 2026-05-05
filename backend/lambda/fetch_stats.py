"""
Sleeper API integration: NFL players and weekly projections/stats.

Uses READ-ONLY public endpoints (no auth).
Note: Full fantasy stats/projections use the `regular` season path segment.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import requests
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models import Player, PlayerStat

logger = logging.getLogger(__name__)

SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app/v1")
REQUEST_DELAY_S = 0.5


def _sleep_rate_limit() -> None:
    """Avoid Sleeper rate limits (recommended ~1000/min; we throttle conservatively)."""
    time.sleep(REQUEST_DELAY_S)


def _get_json(url: str) -> Any:
    """GET JSON with basic error handling."""
    _sleep_rate_limit()
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    return resp.json()


def fetch_all_players(session: Session) -> int:
    """
    Fetch all NFL players from Sleeper and upsert into `players`.

    @param {Session} session SQLAlchemy session
    @returns {int} Number of rows upserted (insert + update counted as upserts attempted)
    """
    url = f"{SLEEPER_BASE}/players/nfl"
    data = _get_json(url)
    if not isinstance(data, dict):
        logger.error("Unexpected players payload type: %s", type(data))
        return 0

    count = 0
    fantasy_relevant = {"QB", "RB", "WR", "TE", "K", "DEF"}
    for sleeper_id, payload in data.items():
        if not isinstance(payload, dict):
            continue
        if payload.get("active") is False:
            continue
        pos = payload.get("position") or ""
        if pos not in fantasy_relevant:
            continue
        name = payload.get("full_name") or (
            f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip()
            or str(sleeper_id)
        )
        team = payload.get("team")

        existing = session.scalar(
            select(Player).where(Player.sleeper_id == str(sleeper_id))
        )
        if existing:
            existing.name = name
            existing.position = pos
            existing.team = team
        else:
            session.add(
                Player(
                    sleeper_id=str(sleeper_id),
                    name=name,
                    position=pos,
                    team=team,
                )
            )
        count += 1

    session.commit()
    return count


def _extract_pts_ppr(stats_blob: dict[str, Any] | None) -> float | None:
    """Pull PPR fantasy points from Sleeper stats/projection dict."""
    if not stats_blob:
        return None
    raw = stats_blob.get("pts_ppr")
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def fetch_weekly_projections(session: Session, season: int, week: int) -> int:
    """
    Fetch weekly projections (pts_ppr) and stats for one NFL regular-season week.

    Upserts into `player_stats` keyed by (player_id, week, season).

    @param {Session} session SQLAlchemy session
    @param {int} season NFL season year (e.g. 2025)
    @param {int} week Fantasy week number
    @returns {int} Approximate count of player_stat rows written/updated
    """
    proj_url = f"{SLEEPER_BASE}/projections/nfl/regular/{season}/{week}"
    stats_url = f"{SLEEPER_BASE}/stats/nfl/regular/{season}/{week}"

    projections_raw = _get_json(proj_url)
    stats_raw = _get_json(stats_url)

    if not isinstance(projections_raw, dict) or not isinstance(stats_raw, dict):
        logger.error("Unexpected projections/stats shape")
        return 0

    # Map sleeper_id -> DB Player.id
    sleeper_rows = session.execute(select(Player.sleeper_id, Player.id)).all()
    sleeper_to_pk = {str(sid): pk for sid, pk in sleeper_rows}

    upsert_count = 0
    all_ids = set(projections_raw.keys()) | set(stats_raw.keys())

    for sleeper_id in all_ids:
        pk = sleeper_to_pk.get(str(sleeper_id))
        if pk is None:
            continue

        proj_blob = projections_raw.get(sleeper_id)
        stat_blob = stats_raw.get(sleeper_id)
        if not isinstance(proj_blob, dict):
            proj_blob = {}
        if not isinstance(stat_blob, dict):
            stat_blob = {}

        projected_points = _extract_pts_ppr(proj_blob)
        actual_points = _extract_pts_ppr(stat_blob)

        row = {
            "player_id": pk,
            "week": week,
            "season": season,
            "points": actual_points,
            "projected_points": projected_points,
            "projections": proj_blob or None,
        }

        stmt = pg_insert(PlayerStat).values(**row)
        stmt = stmt.on_conflict_do_update(
            index_elements=["player_id", "week", "season"],
            set_={
                "points": stmt.excluded.points,
                "projected_points": stmt.excluded.projected_points,
                "projections": stmt.excluded.projections,
            },
        )
        session.execute(stmt)
        upsert_count += 1

    session.commit()
    return upsert_count
