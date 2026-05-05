"""Routes for player listing and stats history."""

import os
from datetime import UTC, datetime, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Player, PlayerStat
from app.schemas import PlayerOut, PlayerStatHistory, PlayerStatsDetailOut

router = APIRouter(prefix="/api/players", tags=["players"])
SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app/v1")
SLEEPER_CACHE_TTL = timedelta(hours=6)
_sleeper_players_cache: dict[str, dict] = {}
_sleeper_players_cached_at: datetime | None = None


def _get_sleeper_players_map() -> dict[str, dict]:
    """Fetch and cache Sleeper player payloads keyed by sleeper_id."""
    global _sleeper_players_cache
    global _sleeper_players_cached_at

    if (
        _sleeper_players_cached_at is not None
        and datetime.now(UTC) - _sleeper_players_cached_at < SLEEPER_CACHE_TTL
        and _sleeper_players_cache
    ):
        return _sleeper_players_cache

    response = requests.get(f"{SLEEPER_BASE}/players/nfl", timeout=60)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        return {}

    _sleeper_players_cache = {
        str(sleeper_id): player_data
        for sleeper_id, player_data in payload.items()
        if isinstance(player_data, dict)
    }
    _sleeper_players_cached_at = datetime.now(UTC)
    return _sleeper_players_cache


@router.get("", response_model=list[PlayerOut])
def list_players(
    position: str | None = Query(default=None, description="Filter by position (QB, RB, ...)"),
    season: int | None = Query(default=None, description="Optional season filter for projections"),
    week: int | None = Query(default=None, description="Optional week filter for projections"),
    db: Session = Depends(get_db),
) -> list[PlayerOut]:
    """List players with optional position filter."""
    latest_projected_points = (
        select(PlayerStat.projected_points)
        .where(PlayerStat.player_id == Player.id)
        .where(PlayerStat.projected_points.is_not(None))
        .order_by(PlayerStat.season.desc(), PlayerStat.week.desc(), PlayerStat.id.desc())
        .limit(1)
        .scalar_subquery()
    )

    requested_week_projected_points = (
        select(PlayerStat.projected_points)
        .where(PlayerStat.player_id == Player.id)
        .where(PlayerStat.season == season, PlayerStat.week == week)
        .order_by(PlayerStat.id.desc())
        .limit(1)
        .scalar_subquery()
    )

    projected_points = (
        func.coalesce(requested_week_projected_points, latest_projected_points)
        if season is not None and week is not None
        else latest_projected_points
    )

    q = select(Player, projected_points.label("projected_points"))
    if position:
        q = q.where(Player.position == position.upper())
    q = q.order_by(Player.name)
    rows = db.execute(q).all()
    return [
        PlayerOut(
            id=player.id,
            sleeper_id=player.sleeper_id,
            name=player.name,
            position=player.position,
            team=player.team,
            projected_points=projected_points,
        )
        for player, projected_points in rows
    ]


@router.get("/{player_id}/stats", response_model=PlayerStatsDetailOut)
def player_stats(player_id: int, db: Session = Depends(get_db)) -> PlayerStatsDetailOut:
    """Weekly stats and projections history for a single player."""
    pl = db.get(Player, player_id)
    if not pl:
        raise HTTPException(status_code=404, detail="Player not found")
    rows = db.scalars(
        select(PlayerStat)
        .where(PlayerStat.player_id == player_id)
        .order_by(PlayerStat.season, PlayerStat.week)
    ).all()
    sleeper_profile = _get_sleeper_players_map().get(pl.sleeper_id, {})
    return PlayerStatsDetailOut(
        player=PlayerOut(
            id=pl.id,
            sleeper_id=pl.sleeper_id,
            name=pl.name,
            position=pl.position,
            team=pl.team,
            projected_points=rows[-1].projected_points if rows else None,
            college=sleeper_profile.get("college"),
            years_exp=(
                int(sleeper_profile["years_exp"])
                if sleeper_profile.get("years_exp") not in (None, "")
                else None
            ),
            age=(
                int(sleeper_profile["age"])
                if sleeper_profile.get("age") not in (None, "")
                else None
            ),
            injury_status=sleeper_profile.get("injury_status"),
        ),
        stats=[
            PlayerStatHistory(
                week=s.week,
                season=s.season,
                points=s.points,
                projected_points=s.projected_points,
            )
            for s in rows
        ],
    )
