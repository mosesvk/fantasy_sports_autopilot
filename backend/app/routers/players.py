"""Routes for player listing and stats history."""

import os
import threading
import logging
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from typing import Any

import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from tenacity import (
    RetryCallState,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from app.database import get_db
from app.models import Player, PlayerStat
from app.schemas import LeaderColumnOut, PlayerLeadersOut, PlayerOut, PlayerStatHistory, PlayerStatsDetailOut

router = APIRouter(prefix="/api/players", tags=["players"])
logger = logging.getLogger(__name__)
SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app/v1")
SLEEPER_CACHE_TTL = timedelta(hours=6)
_sleeper_players_cache: dict[str, dict] = {}
_sleeper_players_cached_at: datetime | None = None
_weekly_stats_cache: dict[str, dict] = {}
_weekly_stats_cached_at: dict[str, datetime] = {}
_week_stats_lock = threading.Lock()

PLAYER_HISTORY_START_SEASON = 2020
PLAYER_HISTORY_MAX_SEASON = 2035
# Sleeper soft-throttles bursty traffic; 4 workers keeps history fetches fast
# while reducing the chance of getting blocked or heavily delayed.
PLAYER_HISTORY_FETCH_WORKERS = int(os.getenv("PLAYER_HISTORY_FETCH_WORKERS", "4"))

# Sleeper still marks some clearly retired players as Active with no NFL team; supplement with ids.
_RETIRED_ACTIVE_EXTRA_IDS: frozenset[str] = frozenset(
    {
        "515",  # Rob Gronkowski
        "947",  # Julio Jones
        "536",  # Antonio Brown
        "856",  # J.J. Watt
        "147",  # DeSean Jackson
        "538",  # Emmanuel Sanders
    }
)

_RETIRED_IR_STATUSES: frozenset[str] = frozenset(
    {
        "Injured Reserve",
        "Physically Unable to Perform",
        "Non Football Injury",
    }
)

TEAM_CONFERENCE_MAP = {
    "ARI": "NFC",
    "ATL": "NFC",
    "BAL": "AFC",
    "BUF": "AFC",
    "CAR": "NFC",
    "CHI": "NFC",
    "CIN": "AFC",
    "CLE": "AFC",
    "DAL": "NFC",
    "DEN": "AFC",
    "DET": "NFC",
    "GB": "NFC",
    "HOU": "AFC",
    "IND": "AFC",
    "JAX": "AFC",
    "KC": "AFC",
    "LAC": "AFC",
    "LAR": "NFC",
    "LV": "AFC",
    "MIA": "AFC",
    "MIN": "NFC",
    "NE": "AFC",
    "NO": "NFC",
    "NYG": "NFC",
    "NYJ": "AFC",
    "PHI": "NFC",
    "PIT": "AFC",
    "SEA": "NFC",
    "SF": "NFC",
    "TB": "NFC",
    "TEN": "AFC",
    "WSH": "NFC",
}

LEADER_CATEGORY_CONFIG = {
    "passing": {
        "title": "Passing",
        "main_tab": "Offense",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "completions", "label": "CMP", "numeric": True},
            {"key": "attempts", "label": "ATT", "numeric": True},
            {"key": "completionPct", "label": "CMP%", "numeric": True},
            {"key": "yards", "label": "YDS", "numeric": True},
            {"key": "yardsPerGame", "label": "YDS/G", "numeric": True},
            {"key": "touchdowns", "label": "TD", "numeric": True},
            {"key": "interceptions", "label": "INT", "numeric": True},
        ],
        "sort_key": "yards",
        "position_filter": {"QB"},
    },
    "rushing": {
        "title": "Rushing",
        "main_tab": "Offense",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "attempts", "label": "ATT", "numeric": True},
            {"key": "yards", "label": "YDS", "numeric": True},
            {"key": "yardsPerCarry", "label": "AVG", "numeric": True},
            {"key": "yardsPerGame", "label": "YDS/G", "numeric": True},
            {"key": "longest", "label": "LNG", "numeric": True},
            {"key": "touchdowns", "label": "TD", "numeric": True},
        ],
        "sort_key": "yards",
    },
    "receiving": {
        "title": "Receiving",
        "main_tab": "Offense",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "receptions", "label": "REC", "numeric": True},
            {"key": "targets", "label": "TGTS", "numeric": True},
            {"key": "yards", "label": "YDS", "numeric": True},
            {"key": "yardsPerCatch", "label": "AVG", "numeric": True},
            {"key": "yardsPerGame", "label": "YDS/G", "numeric": True},
            {"key": "touchdowns", "label": "TD", "numeric": True},
        ],
        "sort_key": "yards",
    },
    "tackles": {
        "title": "Tackles",
        "main_tab": "Defense",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "solo", "label": "SOLO", "numeric": True},
            {"key": "assists", "label": "AST", "numeric": True},
            {"key": "tackles", "label": "TOT", "numeric": True},
            {"key": "tacklesForLoss", "label": "TFL", "numeric": True},
        ],
        "sort_key": "tackles",
    },
    "sacks": {
        "title": "Sacks",
        "main_tab": "Defense",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "sacks", "label": "SACK", "numeric": True},
            {"key": "forcedFumbles", "label": "FF", "numeric": True},
            {"key": "tacklesForLoss", "label": "TFL", "numeric": True},
            {"key": "qbHits", "label": "QBH", "numeric": True},
        ],
        "sort_key": "sacks",
    },
    "interceptions": {
        "title": "Interceptions",
        "main_tab": "Defense",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "interceptions", "label": "INT", "numeric": True},
            {"key": "passesDefended", "label": "PD", "numeric": True},
            {"key": "returnYards", "label": "RET YDS", "numeric": True},
            {"key": "touchdowns", "label": "TD", "numeric": True},
        ],
        "sort_key": "interceptions",
    },
    "touchdowns": {
        "title": "Touchdowns",
        "main_tab": "Scoring",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "touchdowns", "label": "TD", "numeric": True},
            {"key": "points", "label": "PTS", "numeric": True},
        ],
        "sort_key": "touchdowns",
    },
    "returning": {
        "title": "Returning",
        "main_tab": "Special Teams",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "position", "label": "POS", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "returns", "label": "RET", "numeric": True},
            {"key": "returnYards", "label": "YDS", "numeric": True},
            {"key": "returnAvg", "label": "AVG", "numeric": True},
            {"key": "touchdowns", "label": "TD", "numeric": True},
        ],
        "sort_key": "returnYards",
    },
    "kicking": {
        "title": "Kicking",
        "main_tab": "Special Teams",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "team", "label": "TEAM", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "fgMade", "label": "FGM", "numeric": True},
            {"key": "fgAttempts", "label": "FGA", "numeric": True},
            {"key": "fgPct", "label": "FG%", "numeric": True},
            {"key": "xpMade", "label": "XPM", "numeric": True},
            {"key": "points", "label": "PTS", "numeric": True},
        ],
        "sort_key": "points",
        "position_filter": {"K"},
    },
    "punting": {
        "title": "Punting",
        "main_tab": "Special Teams",
        "columns": [
            {"key": "rank", "label": "RK", "numeric": True},
            {"key": "player", "label": "NAME", "numeric": False},
            {"key": "team", "label": "TEAM", "numeric": False},
            {"key": "gamesPlayed", "label": "GP", "numeric": True},
            {"key": "punts", "label": "PNT", "numeric": True},
            {"key": "yards", "label": "YDS", "numeric": True},
            {"key": "average", "label": "AVG", "numeric": True},
            {"key": "inside20", "label": "IN20", "numeric": True},
        ],
        "sort_key": "yards",
    },
}

_CATEGORY_AGGREGATORS = {
    "passing": {
        "completions": "pass_cmp",
        "attempts": "pass_att",
        "yards": "pass_yd",
        "touchdowns": "pass_td",
        "interceptions": "pass_int",
    },
    "rushing": {
        "attempts": "rush_att",
        "yards": "rush_yd",
        "touchdowns": "rush_td",
        "longest": "rush_long",
    },
    "receiving": {
        "receptions": "rec",
        "targets": "rec_tgt",
        "yards": "rec_yd",
        "touchdowns": "rec_td",
    },
    "tackles": {
        "solo": ("idp_tkl_solo", "def_st_tkl_solo"),
        "assists": ("idp_tkl_ast", "def_st_tkl_ast"),
        "tackles": ("idp_tkl", "def_st_tkl"),
        "tacklesForLoss": ("idp_tkl_loss", "def_st_tkl_loss"),
    },
    "sacks": {
        "sacks": ("idp_sack", "def_st_sack"),
        "forcedFumbles": ("idp_ff", "def_st_ff"),
        "tacklesForLoss": ("idp_tkl_loss", "def_st_tkl_loss"),
        "qbHits": ("idp_qb_hit", "def_st_hit_qb"),
    },
    "interceptions": {
        "interceptions": ("idp_int", "def_st_int"),
        "passesDefended": ("idp_pass_def", "def_st_pd"),
        "returnYards": ("idp_int_ret_yd", "def_st_int_yd"),
        "touchdowns": ("idp_def_td", "def_st_td"),
    },
    "touchdowns": {
        "touchdowns": "td",
        "points": "pts_ppr",
    },
    "returning": {
        "returns": "st_kr",
        "returnYards": "st_kr_yd",
        "touchdowns": "st_td",
    },
    "kicking": {
        "fgMade": "fgm",
        "fgAttempts": "fga",
        "xpMade": "xpm",
        "points": "pts_std",
    },
    "punting": {
        "punts": "st_punt",
        "yards": "st_punt_yd",
        "inside20": "st_punt_in20",
    },
}


def _is_retryable_sleeper_exception(exc: BaseException) -> bool:
    """Retry Sleeper calls on timeout or selected transient HTTP statuses."""
    if isinstance(exc, requests.Timeout):
        return True
    if isinstance(exc, requests.HTTPError):
        status_code = exc.response.status_code if exc.response is not None else None
        return status_code in {429, 500, 502, 503}
    return False


def _retry_url_from_state(retry_state: RetryCallState) -> str:
    """Best-effort URL extraction for retry logs."""
    fn_name = retry_state.fn.__name__ if retry_state.fn is not None else ""
    if fn_name == "_get_sleeper_players_map":
        return f"{SLEEPER_BASE}/players/nfl"
    if fn_name == "_fetch_week_stats" and len(retry_state.args) >= 3:
        season_type, season, week = retry_state.args[:3]
        return f"{SLEEPER_BASE}/stats/nfl/{season_type}/{season}/{week}"
    return "unknown-url"


def _log_retry_attempt(retry_state: RetryCallState) -> None:
    """Log each retry attempt with URL and attempt number."""
    logger.warning(
        "Retrying Sleeper request url=%s attempt=%s",
        _retry_url_from_state(retry_state),
        retry_state.attempt_number,
    )


@retry(
    retry=retry_if_exception(_is_retryable_sleeper_exception),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    stop=stop_after_attempt(3),
    before_sleep=_log_retry_attempt,
    reraise=True,
)
def _get_sleeper_players_map() -> dict[str, dict]:
    """Fetch and cache Sleeper player payloads keyed by sleeper_id."""
    global _sleeper_players_cache
    global _sleeper_players_cached_at

    if (
        _sleeper_players_cached_at is not None
        and datetime.now(UTC) - _sleeper_players_cached_at < SLEEPER_CACHE_TTL
        and _sleeper_players_cache
    ):
        return _sleeper_players_cache

    response = requests.get(f"{SLEEPER_BASE}/players/nfl", timeout=60)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        return {}

    _sleeper_players_cache = {
        str(sleeper_id): player_data
        for sleeper_id, player_data in payload.items()
        if isinstance(player_data, dict)
    }
    _sleeper_players_cached_at = datetime.now(UTC)
    return _sleeper_players_cache


def _to_float(value: object) -> float:
    """Convert API values to float safely."""
    try:
        if value is None or value == "":
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _parse_int_field(raw: object) -> int | None:
    """Parse Sleeper numeric fields that may arrive as str or int."""
    if raw in (None, ""):
        return None
    try:
        return int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _sleeper_profile_team_missing(profile: dict) -> bool:
    """True when Sleeper has no current NFL team on the player profile."""
    team = profile.get("team")
    return team in (None, "")


def _sleeper_player_is_retired(sleeper_id: str, profile: dict | None) -> bool:
    """
    Infer whether a player should be shown as retired (not a free agent).

    Sleeper often leaves notable retirees as status Active with null team; we use
    status, veteran heuristics, and a small id override list.
    """
    sid = str(sleeper_id).strip()
    if not profile or not isinstance(profile, dict):
        return sid in _RETIRED_ACTIVE_EXTRA_IDS

    status = profile.get("status") or ""
    if status == "Inactive":
        return True

    if status in _RETIRED_IR_STATUSES and _sleeper_profile_team_missing(profile):
        age = _parse_int_field(profile.get("age"))
        years_exp = _parse_int_field(profile.get("years_exp"))
        if (
            years_exp is not None
            and years_exp >= 8
            and age is not None
            and age >= 28
        ):
            return True

    if not _sleeper_profile_team_missing(profile):
        return False

    if sid in _RETIRED_ACTIVE_EXTRA_IDS:
        return True

    age = _parse_int_field(profile.get("age"))
    years_exp = _parse_int_field(profile.get("years_exp"))
    if age is None or years_exp is None:
        return False
    if years_exp >= 15 and age >= 37:
        return True
    if years_exp >= 12 and age >= 42:
        return True
    return False


@retry(
    retry=retry_if_exception(_is_retryable_sleeper_exception),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    stop=stop_after_attempt(3),
    before_sleep=_log_retry_attempt,
    reraise=True,
)
def _fetch_week_stats(season_type: str, season: int, week: int) -> dict[str, dict]:
    """Fetch and cache one week of Sleeper stats."""
    cache_key = f"{season_type}:{season}:{week}"
    with _week_stats_lock:
        cached_at = _weekly_stats_cached_at.get(cache_key)
        if (
            cached_at is not None
            and datetime.now(UTC) - cached_at < SLEEPER_CACHE_TTL
            and cache_key in _weekly_stats_cache
        ):
            return _weekly_stats_cache[cache_key]

    response = requests.get(
        f"{SLEEPER_BASE}/stats/nfl/{season_type}/{season}/{week}",
        timeout=60,
    )
    if response.status_code == 404:
        payload: dict = {}
    else:
        response.raise_for_status()
        raw = response.json()
        payload = raw if isinstance(raw, dict) else {}

    with _week_stats_lock:
        cached_at = _weekly_stats_cached_at.get(cache_key)
        if (
            cached_at is not None
            and datetime.now(UTC) - cached_at < SLEEPER_CACHE_TTL
            and cache_key in _weekly_stats_cache
        ):
            return _weekly_stats_cache[cache_key]
        _weekly_stats_cache[cache_key] = payload
        _weekly_stats_cached_at[cache_key] = datetime.now(UTC)
        return payload


def _history_season_end_year() -> int:
    """Upper bound NFL season year for history pulls (calendar year label)."""
    return min(datetime.now(UTC).year, PLAYER_HISTORY_MAX_SEASON)


def _json_safe_stat_blob(blob: dict) -> dict[str, Any]:
    """Strip Sleeper weekly blob to JSON-serializable primitives for API responses."""
    skip_prefixes = ("pos_rank_",)
    out: dict[str, Any] = {}
    for k, v in blob.items():
        if any(k.startswith(p) for p in skip_prefixes):
            continue
        if v is None:
            continue
        if isinstance(v, bool):
            out[k] = v
        elif isinstance(v, str):
            out[k] = v
        elif isinstance(v, (int, float)):
            out[k] = float(v)
    return out


def _fetch_single_week_player_blob(
    task: tuple[str, str, int, int],
) -> tuple[int, int, dict[str, Any] | None]:
    """Load one week payload and return this player's stat blob if present."""
    season_type, sid, season, week = task
    payload = _fetch_week_stats(season_type, season, week)
    if not isinstance(payload, dict):
        return season, week, None
    blob = payload.get(sid)
    if not isinstance(blob, dict) or not blob:
        return season, week, None
    return season, week, blob


def _sleeper_weekly_player_stat_history(sleeper_id: str) -> list[PlayerStatHistory]:
    """
    Build 2020–present weekly rows from Sleeper NFL stats (actual_stats), merged later with DB projections.

    Uses the shared week cache and parallel HTTP fetches; first load can take a few seconds cold.
    """
    sid = str(sleeper_id).strip()
    end_y = _history_season_end_year()
    tasks: list[tuple[str, str, int, int]] = [
        ("regular", sid, season, week)
        for season in range(PLAYER_HISTORY_START_SEASON, end_y + 1)
        for week in range(1, 19)
    ]
    with ThreadPoolExecutor(max_workers=PLAYER_HISTORY_FETCH_WORKERS) as pool:
        raw = list(pool.map(_fetch_single_week_player_blob, tasks))

    out: list[PlayerStatHistory] = []
    for season, week, blob in raw:
        if not blob:
            continue
        pts_raw = blob.get("pts_ppr")
        pts: float | None
        if pts_raw in (None, ""):
            pts = None
        else:
            try:
                pts = float(pts_raw)
            except (TypeError, ValueError):
                pts = None
        out.append(
            PlayerStatHistory(
                season=season,
                week=week,
                points=pts,
                projected_points=None,
                actual_stats=_json_safe_stat_blob(blob),
            )
        )
    return out


def _season_weeks_for_split(split: str) -> tuple[str, range]:
    """Map split selection to Sleeper season type and week range."""
    if split == "postseason":
        return "post", range(1, 6)
    return "regular", range(1, 19)


def _aggregate_player_category(
    stats_by_week: list[dict],
    category: str,
) -> dict[str, float]:
    """Aggregate all numeric stats needed for one category."""
    fields = _CATEGORY_AGGREGATORS.get(category, {})
    totals = {field: 0.0 for field in fields}
    games_played = 0
    for week_stats in stats_by_week:
        if not week_stats:
            continue
        games_played += 1
        for field, source_key in fields.items():
            source_keys = (
                source_key if isinstance(source_key, tuple) else (source_key,)
            )
            totals[field] += _to_float(
                next((week_stats.get(key) for key in source_keys if key in week_stats), None)
            )

    totals["gamesPlayed"] = float(games_played)
    return totals


def _build_leader_row(
    category: str,
    sleeper_id: str,
    player_profile: dict,
    aggregated: dict[str, float],
    season_team: str | None,
) -> dict[str, str | int | float | None]:
    """Build a normalized leaders row from aggregated totals."""
    team = season_team or player_profile.get("team")
    player = player_profile.get("full_name") or (
        f"{player_profile.get('first_name', '')} {player_profile.get('last_name', '')}".strip()
    )
    row: dict[str, str | int | float | bool | None] = {
        "player": player,
        "team": team,
        "position": player_profile.get("position"),
        "gamesPlayed": int(aggregated.get("gamesPlayed", 0)),
        "sleeperId": sleeper_id,
        "isRetired": _sleeper_player_is_retired(sleeper_id, player_profile),
    }
    row.update(aggregated)

    # Derived metrics.
    if category == "passing":
        attempts = _to_float(row.get("attempts"))
        yards = _to_float(row.get("yards"))
        games = max(_to_float(row.get("gamesPlayed")), 1.0)
        row["completionPct"] = round((_to_float(row.get("completions")) / attempts) * 100, 1) if attempts else 0
        row["yardsPerGame"] = round(yards / games, 1)
    if category == "rushing":
        attempts = _to_float(row.get("attempts"))
        yards = _to_float(row.get("yards"))
        games = max(_to_float(row.get("gamesPlayed")), 1.0)
        row["yardsPerCarry"] = round(yards / attempts, 1) if attempts else 0
        row["yardsPerGame"] = round(yards / games, 1)
    if category == "receiving":
        receptions = _to_float(row.get("receptions"))
        yards = _to_float(row.get("yards"))
        games = max(_to_float(row.get("gamesPlayed")), 1.0)
        row["yardsPerCatch"] = round(yards / receptions, 1) if receptions else 0
        row["yardsPerGame"] = round(yards / games, 1)
    if category == "returning":
        returns = _to_float(row.get("returns"))
        row["returnAvg"] = round(_to_float(row.get("returnYards")) / returns, 1) if returns else 0
    if category == "kicking":
        attempts = _to_float(row.get("fgAttempts"))
        row["fgPct"] = round((_to_float(row.get("fgMade")) / attempts) * 100, 1) if attempts else 0
    if category == "punting":
        punts = _to_float(row.get("punts"))
        row["average"] = round(_to_float(row.get("yards")) / punts, 1) if punts else 0

    return row


def _resolve_season_team(stats_by_week: list[dict], fallback_team: str | None) -> str | None:
    """Pick the most representative team code from weekly stat blobs."""
    candidates: list[str] = []
    for week_stats in stats_by_week:
        if not isinstance(week_stats, dict):
            continue
        raw_team = (
            week_stats.get("team")
            or week_stats.get("team_abbr")
            or week_stats.get("teamAbbr")
            or week_stats.get("player_team")
        )
        if not raw_team:
            continue
        team = str(raw_team).strip().upper()
        if team:
            candidates.append(team)
    if not candidates:
        return fallback_team
    return Counter(candidates).most_common(1)[0][0]


@router.get("", response_model=list[PlayerOut])
def list_players(
    position: str | None = Query(default=None, description="Filter by position (QB, RB, ...)"),
    season: int | None = Query(default=None, description="Optional season filter for projections"),
    week: int | None = Query(default=None, description="Optional week filter for projections"),
    db: Session = Depends(get_db),
) -> list[PlayerOut]:
    """List players with optional position filter."""
    latest_projected_points = (
        select(PlayerStat.projected_points)
        .where(PlayerStat.player_id == Player.id)
        .where(PlayerStat.projected_points.is_not(None))
        .order_by(PlayerStat.season.desc(), PlayerStat.week.desc(), PlayerStat.id.desc())
        .limit(1)
        .scalar_subquery()
    )

    requested_week_projected_points = (
        select(PlayerStat.projected_points)
        .where(PlayerStat.player_id == Player.id)
        .where(PlayerStat.season == season, PlayerStat.week == week)
        .order_by(PlayerStat.id.desc())
        .limit(1)
        .scalar_subquery()
    )

    projected_points = (
        func.coalesce(requested_week_projected_points, latest_projected_points)
        if season is not None and week is not None
        else latest_projected_points
    )

    q = select(Player, projected_points.label("projected_points"))
    if position:
        q = q.where(Player.position == position.upper())
    q = q.order_by(Player.name)
    rows = db.execute(q).all()
    players_map = _get_sleeper_players_map()
    out: list[PlayerOut] = []
    for player, projected_points in rows:
        sp = players_map.get(str(player.sleeper_id))
        fresh_team = sp.get("team") if sp else None
        team = (
            fresh_team
            if fresh_team not in (None, "")
            else player.team
        )
        out.append(
            PlayerOut(
                id=player.id,
                sleeper_id=player.sleeper_id,
                name=player.name,
                position=player.position,
                team=team,
                projected_points=projected_points,
                is_retired=_sleeper_player_is_retired(player.sleeper_id, sp),
            )
        )
    return out


def _player_profile_out(pl: Player, stat_rows: list[PlayerStat]) -> PlayerOut:
    """Build PlayerOut with Sleeper enrichment for stats responses."""
    sleeper_profile = _get_sleeper_players_map().get(pl.sleeper_id, {})
    fresh_team = sleeper_profile.get("team") if sleeper_profile else None
    team = (
        fresh_team
        if fresh_team not in (None, "")
        else pl.team
    )
    return PlayerOut(
        id=pl.id,
        sleeper_id=pl.sleeper_id,
        name=pl.name,
        position=pl.position,
        team=team,
        projected_points=stat_rows[-1].projected_points if stat_rows else None,
        college=sleeper_profile.get("college"),
        years_exp=(
            int(sleeper_profile["years_exp"])
            if sleeper_profile.get("years_exp") not in (None, "")
            else None
        ),
        age=(
            int(sleeper_profile["age"])
            if sleeper_profile.get("age") not in (None, "")
            else None
        ),
        injury_status=sleeper_profile.get("injury_status"),
        is_retired=_sleeper_player_is_retired(pl.sleeper_id, sleeper_profile),
    )


def _has_cached_actual_stats_for_current_season(stat_rows: list[PlayerStat]) -> bool:
    """Whether DB already has Sleeper actual stats for the current season."""
    current_season = _history_season_end_year()
    return any(
        row.season == current_season and row.actual_stats is not None
        for row in stat_rows
    )


def _upsert_actual_stats_history(
    db: Session, player_id: int, sleeper_hist: list[PlayerStatHistory]
) -> None:
    """Store Sleeper actual_stats in player_stats for future cache hits."""
    for item in sleeper_hist:
        if item.actual_stats is None:
            continue
        stmt = pg_insert(PlayerStat).values(
            player_id=player_id,
            season=item.season,
            week=item.week,
            actual_stats=item.actual_stats,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["player_id", "week", "season"],
            set_={"actual_stats": stmt.excluded.actual_stats},
        )
        db.execute(stmt)
    db.commit()


def _player_stats_detail_out(db: Session, pl: Player) -> PlayerStatsDetailOut:
    """Load weekly stat rows and return the standard stats detail payload."""
    stat_rows = db.scalars(
        select(PlayerStat)
        .where(PlayerStat.player_id == pl.id)
        .order_by(PlayerStat.season, PlayerStat.week)
    ).all()
    db_map = {(r.season, r.week): r for r in stat_rows}

    if _has_cached_actual_stats_for_current_season(stat_rows):
        merged_stats = [
            PlayerStatHistory(
                week=s.week,
                season=s.season,
                points=s.points,
                projected_points=s.projected_points,
                actual_stats=s.actual_stats,
            )
            for s in stat_rows
        ]
        return PlayerStatsDetailOut(
            player=_player_profile_out(pl, stat_rows),
            stats=merged_stats,
        )

    merged_stats: list[PlayerStatHistory] = []
    try:
        sleeper_hist = _sleeper_weekly_player_stat_history(pl.sleeper_id)
    except (requests.RequestException, OSError, ValueError):
        sleeper_hist = []

    if sleeper_hist:
        _upsert_actual_stats_history(db, pl.id, sleeper_hist)
        refreshed_rows = db.scalars(
            select(PlayerStat)
            .where(PlayerStat.player_id == pl.id)
            .order_by(PlayerStat.season, PlayerStat.week)
        ).all()
        db_map = {(r.season, r.week): r for r in refreshed_rows}
        stat_rows = refreshed_rows
        for sh in sleeper_hist:
            db_r = db_map.get((sh.season, sh.week))
            merged_stats.append(
                PlayerStatHistory(
                    season=sh.season,
                    week=sh.week,
                    points=sh.points if sh.points is not None else (db_r.points if db_r else None),
                    projected_points=db_r.projected_points if db_r else sh.projected_points,
                    actual_stats=(db_r.actual_stats if db_r else sh.actual_stats),
                )
            )
    else:
        merged_stats = [
            PlayerStatHistory(
                week=s.week,
                season=s.season,
                points=s.points,
                projected_points=s.projected_points,
                actual_stats=s.actual_stats,
            )
            for s in stat_rows
        ]

    return PlayerStatsDetailOut(
        player=_player_profile_out(pl, stat_rows),
        stats=merged_stats,
    )


def _ensure_player_for_sleeper(db: Session, sleeper_id: str) -> Player:
    """Return an existing Player row or create one from the Sleeper players map."""
    normalized = str(sleeper_id).strip()
    if not normalized:
        raise HTTPException(status_code=404, detail="Player not found")

    pl = db.scalar(select(Player).where(Player.sleeper_id == normalized))
    if pl:
        return pl

    profile = _get_sleeper_players_map().get(normalized)
    if not profile or not isinstance(profile, dict) or profile.get("active") is False:
        raise HTTPException(status_code=404, detail="Player not found")

    pos = profile.get("position") or ""
    name = profile.get("full_name") or (
        f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        or normalized
    )
    team = profile.get("team")
    pl = Player(
        sleeper_id=normalized,
        name=name,
        position=pos,
        team=team,
    )
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return pl


@router.get("/sleeper/{sleeper_id}/stats", response_model=PlayerStatsDetailOut)
def player_stats_by_sleeper(sleeper_id: str, db: Session = Depends(get_db)) -> PlayerStatsDetailOut:
    """Weekly stats for a player resolved by Sleeper id (creates DB row if missing)."""
    pl = _ensure_player_for_sleeper(db, sleeper_id)
    return _player_stats_detail_out(db, pl)


@router.get("/{player_id}/stats", response_model=PlayerStatsDetailOut)
def player_stats(player_id: int, db: Session = Depends(get_db)) -> PlayerStatsDetailOut:
    """Weekly stats and projections history for a single player."""
    pl = db.get(Player, player_id)
    if not pl:
        raise HTTPException(status_code=404, detail="Player not found")
    return _player_stats_detail_out(db, pl)


@router.get("/season-leaders", response_model=PlayerLeadersOut)
def season_leaders(
    category: str = Query(default="passing"),
    season: int | None = Query(
        default=None,
        ge=PLAYER_HISTORY_START_SEASON,
        le=PLAYER_HISTORY_MAX_SEASON,
    ),
    split: str = Query(default="regular", pattern="^(regular|postseason)$"),
    conference: str = Query(default="all", pattern="^(all|afc|nfc)$"),
) -> PlayerLeadersOut:
    """Aggregate season leaders from Sleeper weekly stats for selected category."""
    season_year = season if season is not None else date.today().year
    normalized_category = category.lower()
    if normalized_category not in LEADER_CATEGORY_CONFIG:
        raise HTTPException(status_code=400, detail="Unsupported leaders category")

    season_type, week_range = _season_weeks_for_split(split)
    config = LEADER_CATEGORY_CONFIG[normalized_category]
    players_map = _get_sleeper_players_map()

    weekly_stats_by_sleeper: dict[str, list[dict]] = {}
    for week in week_range:
        weekly_payload = _fetch_week_stats(season_type, season_year, week)
        for sleeper_id, stat_blob in weekly_payload.items():
            if not isinstance(stat_blob, dict):
                continue
            weekly_stats_by_sleeper.setdefault(str(sleeper_id), []).append(stat_blob)

    rows: list[dict[str, str | int | float | None]] = []
    for sleeper_id, stats_by_week in weekly_stats_by_sleeper.items():
        profile = players_map.get(sleeper_id)
        if not profile or profile.get("active") is False:
            continue
        position_filter = config.get("position_filter")
        if position_filter and profile.get("position") not in position_filter:
            continue
        team = profile.get("team")
        aggregated = _aggregate_player_category(stats_by_week, normalized_category)
        sort_key = config["sort_key"]
        if _to_float(aggregated.get(sort_key)) <= 0:
            continue
        season_team = _resolve_season_team(stats_by_week, team)
        if conference != "all" and TEAM_CONFERENCE_MAP.get(season_team) != conference.upper():
            continue
        rows.append(
            _build_leader_row(
                normalized_category,
                sleeper_id,
                profile,
                aggregated,
                season_team,
            )
        )

    sort_key = config["sort_key"]
    rows.sort(key=lambda row: _to_float(row.get(sort_key)), reverse=True)
    top_rows = rows[:25]
    ranked_rows = [{**row, "rank": index + 1} for index, row in enumerate(top_rows)]
    columns = [LeaderColumnOut(**column) for column in config["columns"]]

    return PlayerLeadersOut(
        category=normalized_category,
        title=config["title"],
        main_tab=config["main_tab"],
        columns=columns,
        rows=ranked_rows,
    )
