"""
Populate `players` from Sleeper (full NFL master list).
"""

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))
LAMBDA = BACKEND / "lambda"
sys.path.insert(0, str(LAMBDA))

from app.database import SessionLocal  # noqa: E402
from fetch_stats import fetch_all_players  # noqa: E402


def main() -> None:
    """Fetch Sleeper players into Postgres."""
    db = SessionLocal()
    try:
        n = fetch_all_players(db)
        print(f"Upserted {n} fantasy-relevant players.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
