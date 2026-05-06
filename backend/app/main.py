"""
FastAPI application: reads lineups and players from PostgreSQL.
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

load_dotenv()

# Allow manual trigger to import lambda helpers
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))
_LAMBDA = _BACKEND / "lambda"
if str(_LAMBDA) not in sys.path:
    sys.path.insert(0, str(_LAMBDA))

from app.database import get_db  # noqa: E402
from app.routers import lineup, nfl_scoreboard, players  # noqa: E402

app = FastAPI(title="LineupOS API", version="0.1.0")

cors_origins_raw = os.getenv("CORS_ORIGINS", "")
cors_origins = (
    [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
    if cors_origins_raw.strip()
    else ["http://localhost:5173", "http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lineup.router)
app.include_router(players.router)
app.include_router(nfl_scoreboard.router)


@app.get("/health")
def health() -> dict:
    """Health check for load balancers and monitoring."""
    return {"status": "ok"}


@app.post("/api/trigger")
def trigger_pipeline(db: Session = Depends(get_db)) -> dict:
    """
    Manually run fetch + optimize (mirrors Lambda behavior) for local testing.
    """
    import requests

    from fetch_stats import fetch_all_players, fetch_weekly_projections
    from lineup_optimizer import optimize_lineup

    base = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app/v1")
    state = requests.get(f"{base}/state/nfl", timeout=30).json()
    season = int(
        state.get("season")
        or state.get("league_season")
        or os.getenv("NFL_SEASON", "2025")
    )
    wk = state.get("week")
    display_week = state.get("display_week")
    if isinstance(wk, int) and wk > 0:
        week = wk
    elif isinstance(display_week, int) and display_week > 0:
        week = display_week
    else:
        week = int(os.getenv("NFL_DEFAULT_WEEK", "1"))

    # Offseason fallback
    season_type = state.get("season_type", "")
    if season_type in ("off", "pre") or week == 0:
        season = season - 1
        week = 18

    fetch_all_players(db)
    n = fetch_weekly_projections(db, season, week)
    result = optimize_lineup(db, season, week)
    return {
        "status": "success",
        "season": season,
        "week": week,
        "player_stats_upserts": n,
        "lineup": result,
    }
