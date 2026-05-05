"""Routes for lineup endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Lineup, LineupPlayer, Player
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
                name=pl.name,
                position=pl.position,
                projected_points=lp.projected_points,
            )
        )
    return LineupDetailOut(
        lineup_id=lineup.id,
        week=lineup.week,
        season=lineup.season,
        sport=lineup.sport,
        created_at=lineup.created_at,
        starters=starters,
    )


@router.get("/current", response_model=LineupDetailOut)
def get_current_lineup(db: Session = Depends(get_db)) -> LineupDetailOut:
    """Return the most recent stored lineup (by season desc, week desc, id desc)."""
    lineup = db.scalars(
        select(Lineup)
        .options(joinedload(Lineup.players).joinedload(LineupPlayer.player))
        .order_by(Lineup.season.desc(), Lineup.week.desc(), Lineup.id.desc())
        .limit(1)
    ).first()
    if not lineup:
        raise HTTPException(status_code=404, detail="No lineup found")
    return _lineup_to_detail(lineup)


@router.get("/{week}", response_model=LineupDetailOut)
def get_lineup_by_week(week: int, db: Session = Depends(get_db)) -> LineupDetailOut:
    """Return the latest lineup row for a specific fantasy week."""
    lineup = db.scalars(
        select(Lineup)
        .options(joinedload(Lineup.players).joinedload(LineupPlayer.player))
        .where(Lineup.week == week)
        .order_by(Lineup.season.desc(), Lineup.id.desc())
        .limit(1)
    ).first()
    if not lineup:
        raise HTTPException(status_code=404, detail=f"No lineup for week {week}")
    return _lineup_to_detail(lineup)
