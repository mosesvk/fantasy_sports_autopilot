"""
PostgreSQL connection via SQLAlchemy (sync engine + session).
Reads DATABASE_URL from environment (.env via python-dotenv).
"""

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://fantasyuser:localpassword@localhost:5432/fantasy_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_player_stats_actual_stats_column() -> None:
    """
    Ensure `player_stats.actual_stats` exists for local/dev environments.

    This keeps API reads resilient when code has advanced but an existing local
    database has not yet had the latest migration applied.
    """
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                ALTER TABLE player_stats
                ADD COLUMN IF NOT EXISTS actual_stats JSONB
                """
            )
        )


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session.

    @yields {Session} SQLAlchemy session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
