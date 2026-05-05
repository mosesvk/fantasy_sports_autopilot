"""
AWS Lambda entry point: fetch Sleeper data then optimize lineup.

Configure handler as `handler.lambda_handler`.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

# Lambda zip layout: `app` package lives under backend root on PYTHONPATH.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_LAMBDA_DIR = Path(__file__).resolve().parent
for _p in (_BACKEND_ROOT, _LAMBDA_DIR):
    pstr = str(_p)
    if pstr not in sys.path:
        sys.path.insert(0, pstr)

import requests  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from fetch_stats import fetch_all_players, fetch_weekly_projections  # noqa: E402
from lineup_optimizer import optimize_lineup  # noqa: E402

logger = logging.getLogger()
logger.setLevel(logging.INFO)

SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app/v1")


def _get_nfl_state() -> tuple[int, int]:
    """
    Resolve season + fantasy week from Sleeper NFL state.

    @returns {[number, number]} Tuple of (season_year, week_number)
    """
    url = f"{SLEEPER_BASE}/state/nfl"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    season = int(data.get("season") or data.get("league_season") or os.getenv("NFL_SEASON", "2025"))
    week_raw = data.get("week")
    display_week = data.get("display_week")
    if isinstance(week_raw, int) and week_raw > 0:
        week = week_raw
    elif isinstance(display_week, int) and display_week > 0:
        week = display_week
    else:
        week = int(os.getenv("NFL_DEFAULT_WEEK", "1"))
    return season, week


def lambda_handler(event: dict | None, context: object | None) -> dict:
    """
    Lambda handler: pull weekly projections then write optimized lineup.

    @param {object | null} event EventBridge or manual payload (optional week/season overrides)
    @param {object | null} context Lambda context
    @returns {dict} API Gateway / Lambda HTTP-style response
    """
    try:
        season, week = _get_nfl_state()
        if event and isinstance(event, dict):
            if event.get("season") is not None:
                season = int(event["season"])
            if event.get("week") is not None:
                week = int(event["week"])

        db = SessionLocal()
        try:
            fetch_all_players(db)
            count = fetch_weekly_projections(db, season, week)
            lineup = optimize_lineup(db, season, week)
        finally:
            db.close()

        body = {
            "status": "success",
            "week": week,
            "season": season,
            "stats_upserts": count,
            "lineup": lineup,
        }
        return {"statusCode": 200, "body": json.dumps(body)}
    except Exception as exc:  # noqa: BLE001 — surface errors to CloudWatch
        logger.exception("Lambda failed: %s", exc)
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(exc)}),
        }
