"""Routes for player listing and stats history."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Player, PlayerStat
from app.schemas import PlayerOut, PlayerStatHistory, PlayerStatsDetailOut

router = APIRouter(prefix="/api/players", tags=["players"])


@router.get("", response_model=list[PlayerOut])
def list_players(
    position: str | None = Query(default=None, description="Filter by position (QB, RB, ...)"),
    db: Session = Depends(get_db),
) -> list[PlayerOut]:
    """List players with optional position filter."""
    q = select(Player)
    if position:
        q = q.where(Player.position == position.upper())
    q = q.order_by(Player.name)
    rows = db.scalars(q).all()
    return [
        PlayerOut(
            id=r.id,
            sleeper_id=r.sleeper_id,
            name=r.name,
            position=r.position,
            team=r.team,
        )
        for r in rows
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
    return PlayerStatsDetailOut(
        player=PlayerOut(
            id=pl.id,
            sleeper_id=pl.sleeper_id,
            name=pl.name,
            position=pl.position,
            team=pl.team,
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
