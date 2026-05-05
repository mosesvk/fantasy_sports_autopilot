"""
PostgreSQL connection via SQLAlchemy (sync engine + session).
Reads DATABASE_URL from environment (.env via python-dotenv).
"""

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://fantasyuser:localpassword@localhost:5432/fantasy_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


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
