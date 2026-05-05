"""Routes for player listing and stats history."""

import os
from collections import Counter
from datetime import UTC, datetime, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Player, PlayerStat
from app.schemas import LeaderColumnOut, PlayerLeadersOut, PlayerOut, PlayerStatHistory, PlayerStatsDetailOut

router = APIRouter(prefix="/api/players", tags=["players"])
SLEEPER_BASE = os.getenv("SLEEPER_BASE_URL", "https://api.sleeper.app/v1")
SLEEPER_CACHE_TTL = timedelta(hours=6)
_sleeper_players_cache: dict[str, dict] = {}
_sleeper_players_cached_at: datetime | None = None
_weekly_stats_cache: dict[str, dict] = {}
_weekly_stats_cached_at: dict[str, datetime] = {}

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


def _fetch_week_stats(season_type: str, season: int, week: int) -> dict[str, dict]:
    """Fetch and cache one week of Sleeper stats."""
    cache_key = f"{season_type}:{season}:{week}"
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
        return {}
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        return {}
    _weekly_stats_cache[cache_key] = payload
    _weekly_stats_cached_at[cache_key] = datetime.now(UTC)
    return payload


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
    row: dict[str, str | int | float | None] = {
        "player": player,
        "team": team,
        "position": player_profile.get("position"),
        "gamesPlayed": int(aggregated.get("gamesPlayed", 0)),
        "sleeperId": sleeper_id,
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
    return [
        PlayerOut(
            id=player.id,
            sleeper_id=player.sleeper_id,
            name=player.name,
            position=player.position,
            team=player.team,
            projected_points=projected_points,
        )
        for player, projected_points in rows
    ]


def _player_profile_out(pl: Player, stat_rows: list[PlayerStat]) -> PlayerOut:
    """Build PlayerOut with Sleeper enrichment for stats responses."""
    sleeper_profile = _get_sleeper_players_map().get(pl.sleeper_id, {})
    return PlayerOut(
        id=pl.id,
        sleeper_id=pl.sleeper_id,
        name=pl.name,
        position=pl.position,
        team=pl.team,
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
    )


def _player_stats_detail_out(db: Session, pl: Player) -> PlayerStatsDetailOut:
    """Load weekly stat rows and return the standard stats detail payload."""
    stat_rows = db.scalars(
        select(PlayerStat)
        .where(PlayerStat.player_id == pl.id)
        .order_by(PlayerStat.season, PlayerStat.week)
    ).all()
    return PlayerStatsDetailOut(
        player=_player_profile_out(pl, stat_rows),
        stats=[
            PlayerStatHistory(
                week=s.week,
                season=s.season,
                points=s.points,
                projected_points=s.projected_points,
            )
            for s in stat_rows
        ],
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
    season: int = Query(default=2025, ge=2020, le=2035),
    split: str = Query(default="regular", pattern="^(regular|postseason)$"),
    conference: str = Query(default="all", pattern="^(all|afc|nfc)$"),
) -> PlayerLeadersOut:
    """Aggregate season leaders from Sleeper weekly stats for selected category."""
    normalized_category = category.lower()
    if normalized_category not in LEADER_CATEGORY_CONFIG:
        raise HTTPException(status_code=400, detail="Unsupported leaders category")

    season_type, week_range = _season_weeks_for_split(split)
    config = LEADER_CATEGORY_CONFIG[normalized_category]
    players_map = _get_sleeper_players_map()

    weekly_stats_by_sleeper: dict[str, list[dict]] = {}
    for week in week_range:
        weekly_payload = _fetch_week_stats(season_type, season, week)
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
