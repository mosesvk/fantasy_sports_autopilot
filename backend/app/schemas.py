"""Pydantic schemas for API responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class LineupPlayerOut(BaseModel):
    """Single starter slot with player metadata."""

    slot: str
    player_id: int
    sleeper_id: str
    name: str
    position: str
    team: str | None = None
    projected_points: float | None = None


class LineupDetailOut(BaseModel):
    """Full lineup record with nested starters."""

    lineup_id: int
    week: int
    season: int
    sport: str = "nfl"
    created_at: datetime | None = None
    starters: list[LineupPlayerOut] = Field(default_factory=list)
    total_projected_points: float | None = None


class PlayerOut(BaseModel):
    """Player summary."""

    id: int
    sleeper_id: str
    name: str
    position: str
    team: str | None = None
    projected_points: float | None = None


class PlayerStatHistory(BaseModel):
    """Weekly stat row."""

    week: int
    season: int
    points: float | None = None
    projected_points: float | None = None


class PlayerStatsDetailOut(BaseModel):
    """Stats history for one player."""

    player: PlayerOut
    stats: list[PlayerStatHistory]
