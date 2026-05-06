"""
Normalize ESPN NFL game summary (box score + play-by-play) for the dashboard.

Paired with GET /api/nfl/games/{game_id}/detail. Data source is the public
site.api.espn.com summary endpoint unless NFL_GAME_SUMMARY_BASE_URL is set.
"""

from __future__ import annotations

import os
from typing import Any

import requests


def fetch_espn_game_summary_raw(*, game_id: str, timeout: float = 25.0) -> dict[str, Any]:
    """
    Load the raw ESPN summary JSON for one event id.

    :param game_id: ESPN event id (e.g. 401772946).
    :param timeout: HTTP timeout in seconds.
    :returns: Parsed JSON.
    :raises requests.HTTPError: Non-success HTTP status.
    :raises requests.RequestException: Network failure.
    """
    base = os.getenv(
        "NFL_GAME_SUMMARY_BASE_URL",
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary",
    )
    response = requests.get(base, params={"event": game_id}, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _header_matchup(raw: dict[str, Any]) -> tuple[str, str, str]:
    """Away abbr, home abbr, status text from summary header."""
    header = raw.get("header") or {}
    comps = header.get("competitions") or []
    if not comps:
        return "", "", ""
    comp = comps[0]
    st = (comp.get("status") or {}).get("type") or {}
    status = str(st.get("shortDetail") or st.get("description") or "").strip()
    away = ""
    home = ""
    for c in comp.get("competitors") or []:
        team = c.get("team") or {}
        abbr = str(team.get("abbreviation") or "")
        ha = c.get("homeAway")
        if ha == "home":
            home = abbr
        elif ha == "away":
            away = abbr
    return away, home, status


def _normalize_box_score(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Player stat tables per team (passing, rushing, receiving, …)."""
    out: list[dict[str, Any]] = []
    box = raw.get("boxscore") or {}
    for side in box.get("players") or []:
        team = side.get("team") or {}
        abbr = str(team.get("abbreviation") or "")
        tables: list[dict[str, Any]] = []
        for cat in side.get("statistics") or []:
            athletes = cat.get("athletes") or []
            if not athletes:
                continue
            labels = [str(x) for x in (cat.get("labels") or [])]
            title = str(cat.get("name") or "Stats").strip().title()
            rows: list[dict[str, Any]] = []
            for a in athletes:
                athlete = a.get("athlete") or {}
                name = str(athlete.get("displayName") or "")
                jersey = str(athlete.get("jersey") or "").strip()
                stats_raw = a.get("stats") or []
                values = [str(v) for v in stats_raw]
                rows.append({"player": name, "jersey": jersey, "values": values})
            tables.append({"title": title, "columns": labels, "rows": rows})
        out.append({"team_abbr": abbr, "tables": tables})
    return out


def _normalize_play_by_play(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten drive plays in chronological order."""
    plays_out: list[dict[str, Any]] = []
    drives_block = raw.get("drives") or {}
    for drv in drives_block.get("previous") or []:
        for p in drv.get("plays") or []:
            period = p.get("period") or {}
            try:
                period_num = int(period.get("number")) if period.get("number") is not None else None
            except (TypeError, ValueError):
                period_num = None
            clock = str((p.get("clock") or {}).get("displayValue") or "").strip()
            ptype = p.get("type") or {}
            short_type = str(ptype.get("abbreviation") or ptype.get("text") or "").strip()
            text = str(p.get("text") or "").strip()
            try:
                away_s = int(p["awayScore"]) if p.get("awayScore") is not None else None
            except (TypeError, ValueError):
                away_s = None
            try:
                home_s = int(p["homeScore"]) if p.get("homeScore") is not None else None
            except (TypeError, ValueError):
                home_s = None
            plays_out.append(
                {
                    "period": period_num,
                    "clock": clock,
                    "short_type": short_type,
                    "description": text,
                    "away_score": away_s,
                    "home_score": home_s,
                    "scoring_play": bool(p.get("scoringPlay")),
                },
            )
    return plays_out


def normalize_game_detail(raw: dict[str, Any], *, game_id: str) -> dict[str, Any]:
    """
    Build the API DTO for one game detail response.

    :param raw: Parsed ESPN summary JSON.
    :param game_id: Event id echoed in the payload.
    :returns: Dict matching NflGameDetailOut.
    """
    away_abbr, home_abbr, status = _header_matchup(raw)
    return {
        "game_id": game_id,
        "away_abbr": away_abbr,
        "home_abbr": home_abbr,
        "status": status,
        "box_score": _normalize_box_score(raw),
        "play_by_play": _normalize_play_by_play(raw),
    }
