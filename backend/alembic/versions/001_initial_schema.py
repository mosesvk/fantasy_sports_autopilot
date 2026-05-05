"""Initial schema: players, player_stats, lineups, lineup_players.

Revision ID: 001_initial
Revises:
Create Date: 2026-05-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "players",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sleeper_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("position", sa.String(length=16), nullable=False),
        sa.Column("team", sa.String(length=8), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sleeper_id"),
    )
    op.create_index(op.f("ix_players_sleeper_id"), "players", ["sleeper_id"], unique=False)

    op.create_table(
        "lineups",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("week", sa.Integer(), nullable=False),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("sport", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_lineups_season"), "lineups", ["season"], unique=False)
    op.create_index(op.f("ix_lineups_week"), "lineups", ["week"], unique=False)

    op.create_table(
        "player_stats",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("week", sa.Integer(), nullable=False),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("points", sa.Float(), nullable=True),
        sa.Column("projected_points", sa.Float(), nullable=True),
        sa.Column("projections", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "player_id", "week", "season", name="uq_player_week_season"
        ),
    )
    op.create_index(
        op.f("ix_player_stats_player_id"), "player_stats", ["player_id"], unique=False
    )

    op.create_table(
        "lineup_players",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("lineup_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("slot", sa.String(length=32), nullable=False),
        sa.Column("projected_points", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["lineup_id"], ["lineups.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_lineup_players_lineup_id"),
        "lineup_players",
        ["lineup_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lineup_players_player_id"),
        "lineup_players",
        ["player_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_lineup_players_player_id"), table_name="lineup_players")
    op.drop_index(op.f("ix_lineup_players_lineup_id"), table_name="lineup_players")
    op.drop_table("lineup_players")
    op.drop_index(op.f("ix_player_stats_player_id"), table_name="player_stats")
    op.drop_table("player_stats")
    op.drop_index(op.f("ix_lineups_week"), table_name="lineups")
    op.drop_index(op.f("ix_lineups_season"), table_name="lineups")
    op.drop_table("lineups")
    op.drop_index(op.f("ix_players_sleeper_id"), table_name="players")
    op.drop_table("players")
