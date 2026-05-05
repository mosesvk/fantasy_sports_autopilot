"""
SQLAlchemy ORM models for fantasy_db.

Tables: players, player_stats, lineups, lineup_players.
"""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Player(Base):
    """Master player list from Sleeper NFL players feed."""

    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sleeper_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    position: Mapped[str] = mapped_column(String(16))
    team: Mapped[str | None] = mapped_column(String(8), nullable=True)

    stats: Mapped[list["PlayerStat"]] = relationship(
        "PlayerStat", back_populates="player"
    )
    lineup_entries: Mapped[list["LineupPlayer"]] = relationship(
        "LineupPlayer", back_populates="player"
    )


class PlayerStat(Base):
    """Weekly stats and projections per player."""

    __tablename__ = "player_stats"
    __table_args__ = (
        UniqueConstraint("player_id", "week", "season", name="uq_player_week_season"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    week: Mapped[int] = mapped_column(Integer)
    season: Mapped[int] = mapped_column(Integer)
    points: Mapped[float | None] = mapped_column(Float, nullable=True)
    projected_points: Mapped[float | None] = mapped_column(Float, nullable=True)
    projections: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    player: Mapped["Player"] = relationship("Player", back_populates="stats")


class Lineup(Base):
    """Header row for an optimized weekly lineup."""

    __tablename__ = "lineups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week: Mapped[int] = mapped_column(Integer, index=True)
    season: Mapped[int] = mapped_column(Integer, index=True)
    sport: Mapped[str] = mapped_column(String(16), default="nfl")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    players: Mapped[list["LineupPlayer"]] = relationship(
        "LineupPlayer", back_populates="lineup", cascade="all, delete-orphan"
    )


class LineupPlayer(Base):
    """Players selected for a lineup with slot and projected points."""

    __tablename__ = "lineup_players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lineup_id: Mapped[int] = mapped_column(ForeignKey("lineups.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    slot: Mapped[str] = mapped_column(String(32))
    projected_points: Mapped[float | None] = mapped_column(Float, nullable=True)

    lineup: Mapped["Lineup"] = relationship("Lineup", back_populates="players")
    player: Mapped["Player"] = relationship("Player", back_populates="lineup_entries")
