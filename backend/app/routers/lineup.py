"""Routes for lineup endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Lineup, LineupPlayer
from app.schemas import LineupDetailOut, LineupPlayerOut

router = APIRouter(prefix="/api/lineup", tags=["lineup"])


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
    """Return the latest lineup row for a specific season and fantasy week."""
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
