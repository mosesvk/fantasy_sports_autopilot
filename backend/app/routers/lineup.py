"""Routes for lineup endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Lineup, LineupPlayer, Player, PlayerStat
from app.schemas import LineupDetailOut, LineupPlayerOut
from fetch_stats import fetch_weekly_projections
from lineup_optimizer import optimize_lineup

router = APIRouter(prefix="/api/lineup", tags=["lineup"])
logger = logging.getLogger(__name__)
REQUIRED_SLOT_COUNTS = {
    "QB": 1,
    "RB": 2,
    "WR": 2,
    "TE": 1,
    "K": 1,
    "DEF": 1,
}


def _lineup_to_detail(lineup: Lineup) -> LineupDetailOut:
    starters: list[LineupPlayerOut] = []
    for lp in lineup.players:
        pl = lp.player
        starters.append(
            LineupPlayerOut(
                slot=lp.slot,
                player_id=pl.id,
                sleeper_id=pl.sleeper_id,
                name=pl.name,
                position=pl.position,
                team=pl.team,
                projected_points=lp.projected_points,
            )
        )
    total = sum((s.projected_points or 0) for s in starters)
    return LineupDetailOut(
        lineup_id=lineup.id,
        week=lineup.week,
        season=lineup.season,
        sport=lineup.sport,
        created_at=lineup.created_at,
        starters=starters,
        total_projected_points=round(total, 2),
    )


def _has_required_projection_coverage(db: Session, season: int, week: int) -> bool:
    """Check whether a week has enough projected players to build a full lineup."""
    rows = db.execute(
        select(Player.position, func.count(func.distinct(Player.id)))
        .join(PlayerStat, PlayerStat.player_id == Player.id)
        .where(
            PlayerStat.season == season,
            PlayerStat.week == week,
            PlayerStat.projected_points.is_not(None),
            Player.position.in_(tuple(REQUIRED_SLOT_COUNTS.keys())),
        )
        .group_by(Player.position)
    ).all()
    counts_by_position = {position: count for position, count in rows}
    return all(
        counts_by_position.get(position, 0) >= required
        for position, required in REQUIRED_SLOT_COUNTS.items()
    )


def _refresh_week_projections(db: Session, season: int, week: int) -> None:
    """Fetch projections for one requested week to backfill missing historical data."""
    try:
        upserted = fetch_weekly_projections(db, season, week)
        logger.info(
            "Historical on-demand projection refresh completed",
            extra={"season": season, "week": week, "upserted": upserted},
        )
    except Exception:  # pragma: no cover - network and provider failures
        logger.exception(
            "Historical on-demand projection refresh failed for season=%s week=%s",
            season,
            week,
        )


@router.get("/current", response_model=LineupDetailOut)
def get_current_lineup(db: Session = Depends(get_db)) -> LineupDetailOut:
    """Return the most recent stored lineup (by season desc, week desc, id desc)."""
    lineup = db.scalars(
        select(Lineup)
        .options(joinedload(Lineup.players).joinedload(LineupPlayer.player))
        .where(Lineup.players.any())
        .order_by(Lineup.season.desc(), Lineup.week.desc(), Lineup.id.desc())
        .limit(1)
    ).first()
    if not lineup:
        raise HTTPException(status_code=404, detail="No lineup found")
    return _lineup_to_detail(lineup)


@router.get("/{season}/{week}", response_model=LineupDetailOut)
def get_lineup_by_week(
    season: int, week: int, db: Session = Depends(get_db)
) -> LineupDetailOut:
    """Return lineup for a specific season/week with on-demand historical backfill."""
    lineup = db.scalars(
        select(Lineup)
        .options(joinedload(Lineup.players).joinedload(LineupPlayer.player))
        .where(Lineup.season == season, Lineup.week == week)
        .order_by(Lineup.id.desc())
        .limit(1)
    ).first()
    if not lineup:
        if not _has_required_projection_coverage(db, season, week):
            _refresh_week_projections(db, season, week)

        if not _has_required_projection_coverage(db, season, week):
            raise HTTPException(
                status_code=404, detail=f"No lineup for season {season}, week {week}"
            )

        optimize_lineup(db, season, week)
        lineup = db.scalars(
            select(Lineup)
            .options(joinedload(Lineup.players).joinedload(LineupPlayer.player))
            .where(Lineup.season == season, Lineup.week == week)
            .order_by(Lineup.id.desc())
            .limit(1)
        ).first()
        if not lineup:
            raise HTTPException(
                status_code=404, detail=f"No lineup for season {season}, week {week}"
            )
    return _lineup_to_detail(lineup)
