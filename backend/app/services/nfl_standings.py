"""
Live NFL standings from ESPN v2 API (regular or postseason).
"""

from __future__ import annotations

import os
from typing import Any

import requests

from app.data.nfl_team_divisions import TEAM_DIVISION


def fetch_espn_standings_raw(
    *,
    season: int,
    seasontype: int = 2,
    timeout: float = 20.0,
) -> dict[str, Any]:
    """
    Load raw ESPN standings JSON.

    :param season: League year (e.g. 2024).
    :param seasontype: 2 regular season, 3 postseason.
    """
    base = os.getenv(
        "NFL_STANDINGS_BASE_URL",
        "https://site.api.espn.com/apis/v2/sports/football/nfl/standings",
    )
    response = requests.get(base, params={"season": season, "seasontype": seasontype}, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _stat_map(entry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(s.get("name")): s for s in entry.get("stats") or []}


def _disp(sm: dict[str, dict[str, Any]], key: str, default: str = "") -> str:
    s = sm.get(key)
    if not s:
        return default
    return str(s.get("displayValue") or default)


def _int_disp(sm: dict[str, dict[str, Any]], key: str, default: int = 0) -> int:
    s = sm.get(key)
    if not s:
        return default
    try:
        return int(float(s.get("value", 0)))
    except (TypeError, ValueError):
        return default


def _float_val(sm: dict[str, dict[str, Any]], key: str, default: float = 0.0) -> float:
    s = sm.get(key)
    if not s:
        return default
    try:
        return float(s.get("value", 0))
    except (TypeError, ValueError):
        return default


def _normalize_entry(entry: dict[str, Any], conference: str) -> dict[str, Any]:
    team = entry.get("team") or {}
    abbr = str(team.get("abbreviation") or "").strip()
    sm = _stat_map(entry)
    conf_meta, div_label = TEAM_DIVISION.get(abbr, ("", "UNKNOWN"))
    if conf_meta and conf_meta != conference:
        # trust API conference for this entry
        pass
    w = _int_disp(sm, "wins")
    l = _int_disp(sm, "losses")
    t = _int_disp(sm, "ties")
    pct = _float_val(sm, "winPercent")
    pf = _int_disp(sm, "pointsFor")
    pa = _int_disp(sm, "pointsAgainst")
    seed = _int_disp(sm, "playoffSeed", 0)
    return {
        "abbr": abbr,
        "status": _disp(sm, "clincher", "").strip(),
        "w": w,
        "l": l,
        "t": t,
        "pct": pct,
        "home": _disp(sm, "Home", "—"),
        "away": _disp(sm, "Road", "—"),
        "div": _disp(sm, "divisionRecord", _disp(sm, "vs. Div.", "—")),
        "conf": _disp(sm, "vs. Conf.", "—"),
        "pf": pf,
        "pa": pa,
        "strk": _disp(sm, "streak", "—"),
        "conference": conference,
        "division": div_label if div_label != "UNKNOWN" else "—",
        "playoff_seed": seed if seed > 0 else None,
    }


def normalize_standings_response(raw: dict[str, Any], *, season: int, seasontype: int) -> dict[str, Any]:
    """Flatten conference entries into a single list of standing rows."""
    rows: list[dict[str, Any]] = []
    for conf_block in raw.get("children") or []:
        conf_name = str(conf_block.get("abbreviation") or conf_block.get("name") or "")[:3].upper()
        if conf_name not in ("AFC", "NFC"):
            continue
        st = conf_block.get("standings") or {}
        for entry in st.get("entries") or []:
            rows.append(_normalize_entry(entry, conf_name))
    return {"season": season, "seasontype": seasontype, "entries": rows}
