"""NFL scoreboard proxy: fetches live scores and normalizes them for the React app."""

from __future__ import annotations

import logging
from datetime import datetime

import requests
from fastapi import APIRouter, HTTPException, Path, Query

from app.schemas import (
    NflChampionshipRowOut,
    NflChampionshipsOut,
    NflGameDetailOut,
    NflScoreboardOut,
    NflStandingsOut,
    NflTeamScheduleOut,
)
from app.services.nfl_championships import build_championships_list
from app.services.nfl_game_detail import fetch_espn_game_summary_raw, normalize_game_detail
from app.services.nfl_scoreboard import fetch_espn_scoreboard_raw, normalize_scoreboard_response
from app.services.nfl_standings import fetch_espn_standings_raw, normalize_standings_response
from app.services.nfl_team_schedule import fetch_team_schedule_raw, normalize_team_schedule

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/nfl", tags=["nfl"])

_NFL_HISTORY_START = 2020
_NFL_SEASON_MAX = datetime.now().year + 1


@router.get("/scoreboard", response_model=NflScoreboardOut)
def get_nfl_scoreboard(
    week: int = Query(..., ge=1, le=22, description="Schedule week (regular season 1–18)"),
    season: int = Query(..., ge=_NFL_HISTORY_START, le=_NFL_SEASON_MAX, description="League season year"),
    seasontype: int = Query(
        2,
        ge=1,
        le=4,
        description="ESPN season type: 1 preseason, 2 regular, 3 postseason, 4 offseason",
    ),
) -> NflScoreboardOut:
    """
    Return a normalized NFL scoreboard for the given week.

    Data is sourced from the public ESPN site API by default (see NFL_SCOREBOARD_BASE_URL).
    """
    try:
        raw = fetch_espn_scoreboard_raw(season=season, week=week, seasontype=seasontype)
    except requests.HTTPError as exc:
        logger.warning("Scoreboard upstream HTTP error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Could not load scoreboard from provider (HTTP error).",
        ) from exc
    except requests.RequestException as exc:
        logger.warning("Scoreboard upstream request failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Could not load scoreboard from provider (network error).",
        ) from exc

    payload = normalize_scoreboard_response(
        raw,
        season=season,
        week=week,
        seasontype=seasontype,
    )
    return NflScoreboardOut.model_validate(payload)


@router.get("/games/{game_id}/detail", response_model=NflGameDetailOut)
def get_nfl_game_detail(
    game_id: str = Path(..., min_length=4, max_length=32, description="ESPN event id"),
) -> NflGameDetailOut:
    """
    Return normalized box score and play-by-play for a single game.

    Used by the Scores tab modals instead of embedding ESPN Gamecast.
    """
    if not game_id.isdigit():
        raise HTTPException(status_code=400, detail="game_id must be numeric.")
    try:
        raw = fetch_espn_game_summary_raw(game_id=game_id)
    except requests.HTTPError as exc:
        logger.warning("Game detail upstream HTTP error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Could not load game detail from provider (HTTP error).",
        ) from exc
    except requests.RequestException as exc:
        logger.warning("Game detail upstream request failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Could not load game detail from provider (network error).",
        ) from exc

    payload = normalize_game_detail(raw, game_id=game_id)
    return NflGameDetailOut.model_validate(payload)


@router.get("/standings", response_model=NflStandingsOut)
def get_nfl_standings(
    season: int = Query(..., ge=_NFL_HISTORY_START, le=_NFL_SEASON_MAX),
    seasontype: int = Query(
        2,
        ge=1,
        le=4,
        description="2 regular season, 3 postseason (playoff field)",
    ),
) -> NflStandingsOut:
    """Live standings from ESPN (regular or postseason)."""
    try:
        raw = fetch_espn_standings_raw(season=season, seasontype=seasontype)
    except requests.HTTPError as exc:
        logger.warning("Standings upstream HTTP error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not load standings (HTTP error).") from exc
    except requests.RequestException as exc:
        logger.warning("Standings upstream failed: %s", exc)
        raise HTTPException(status_code=502, detail="Could not load standings (network error).") from exc
    payload = normalize_standings_response(raw, season=season, seasontype=seasontype)
    return NflStandingsOut.model_validate(payload)


@router.get("/championships", response_model=NflChampionshipsOut)
def get_nfl_championships(
    from_season: int = Query(_NFL_HISTORY_START, ge=1990, le=_NFL_SEASON_MAX),
    to_season: int | None = Query(None, ge=1990, le=_NFL_SEASON_MAX),
) -> NflChampionshipsOut:
    """
    Super Bowl champions by league season (tries ESPN, falls back to verified rows).

    Seasons are ordered newest-first. Range is inclusive.
    """
    end = to_season if to_season is not None else _NFL_SEASON_MAX
    if from_season > end:
        raise HTTPException(status_code=400, detail="from_season must be <= to_season.")
    rows = build_championships_list(from_season=from_season, to_season=end)
    validated = [NflChampionshipRowOut.model_validate(x) for x in rows]
    return NflChampionshipsOut(seasons=validated)


@router.get("/teams/{team_abbr}/schedule", response_model=NflTeamScheduleOut)
def get_nfl_team_schedule(
    team_abbr: str = Path(..., min_length=2, max_length=4),
    season: int = Query(..., ge=_NFL_HISTORY_START, le=_NFL_SEASON_MAX),
) -> NflTeamScheduleOut:
    """Full season schedule for one team (ESPN)."""
    abbr = team_abbr.strip().upper()
    try:
        raw = fetch_team_schedule_raw(team_abbr=abbr, season=season)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except requests.HTTPError as exc:
        logger.warning("Team schedule HTTP error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not load team schedule (HTTP error).") from exc
    except requests.RequestException as exc:
        logger.warning("Team schedule request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Could not load team schedule (network error).") from exc
    payload = normalize_team_schedule(raw, team_abbr=abbr, season=season)
    return NflTeamScheduleOut.model_validate(payload)
