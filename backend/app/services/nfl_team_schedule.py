"""
Team-specific NFL schedule from ESPN (full season + postseason games).
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests

_EASTERN = ZoneInfo("America/New_York")

_team_abbr_to_id_cache: dict[str, str] | None = None


def _fetch_team_id_map(*, timeout: float = 20.0) -> dict[str, str]:
    """Map team abbreviation -> ESPN numeric team id."""
    global _team_abbr_to_id_cache
    if _team_abbr_to_id_cache is not None:
        return _team_abbr_to_id_cache
    url = os.getenv(
        "NFL_TEAMS_LIST_URL",
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=32",
    )
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    raw = response.json()
    out: dict[str, str] = {}
    sports = raw.get("sports") or []
    if not sports:
        _team_abbr_to_id_cache = out
        return out
    teams = (sports[0].get("leagues") or [{}])[0].get("teams") or []
    for wrap in teams:
        team = wrap.get("team") or {}
        abbr = str(team.get("abbreviation") or "").strip()
        tid = str(team.get("id") or "").strip()
        if abbr and tid:
            out[abbr] = tid
    _team_abbr_to_id_cache = out
    return out


def fetch_team_schedule_raw(*, team_abbr: str, season: int, timeout: float = 25.0) -> dict[str, Any]:
    """Raw ESPN schedule payload for one team and season."""
    ids = _fetch_team_id_map(timeout=timeout)
    tid = ids.get(team_abbr.upper())
    if not tid:
        raise ValueError(f"Unknown team abbreviation: {team_abbr}")
    base = os.getenv(
        "NFL_TEAM_SCHEDULE_BASE_URL",
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams",
    )
    url = f"{base.rstrip('/')}/{tid}/schedule"
    response = requests.get(url, params={"season": season}, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _score_display(comp: dict[str, Any], side: dict[str, Any]) -> str:
    sc = side.get("score")
    if isinstance(sc, dict):
        return str(sc.get("displayValue") or "")
    if sc is None:
        return ""
    return str(sc)


def _format_long_date(iso_date: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00")).astimezone(_EASTERN)
    except ValueError:
        return iso_date
    return f"{dt.strftime('%a')}, {dt.strftime('%b')} {dt.day}, {dt.year}"


def normalize_team_schedule(raw: dict[str, Any], *, team_abbr: str, season: int) -> dict[str, Any]:
    """Normalize schedule events into table-friendly rows."""
    team_upper = team_abbr.upper()
    team_side = None
    rows: list[dict[str, Any]] = []
    for event in raw.get("events") or []:
        week_info = event.get("week") or {}
        try:
            week_num = int(week_info.get("number", 0))
        except (TypeError, ValueError):
            week_num = 0
        stype = event.get("seasonType") or {}
        stype_id = int(stype.get("id", 2) or 2)
        week_label = str(week_num) if stype_id == 2 else {3: "POST"}.get(stype_id, "POST")

        comps = event.get("competitions") or []
        if not comps:
            continue
        comp = comps[0]
        raw_date = str(comp.get("date") or event.get("date") or "")
        date_label = _format_long_date(raw_date) if raw_date else "—"

        competitors = comp.get("competitors") or []
        self_c = None
        opp_c = None
        for c in competitors:
            t = c.get("team") or {}
            if str(t.get("abbreviation", "")).upper() == team_upper:
                self_c = c
            else:
                opp_c = c
        if not self_c or not opp_c:
            continue
        opp = opp_c.get("team") or {}
        opp_abbr = str(opp.get("abbreviation") or "")
        is_home = self_c.get("homeAway") == "home"
        status = (comp.get("status") or {}).get("type") or {}
        completed = bool(status.get("completed"))
        won = bool(self_c.get("winner"))
        self_score = _score_display(comp, self_c)
        opp_score = _score_display(comp, opp_c)
        if completed:
            wl = "W" if won else "L"
            result = f"{wl} {self_score}-{opp_score}"
        else:
            result = str(status.get("shortDetail") or "Scheduled")

        record_after = "—"
        records = self_c.get("records") or []
        for rec in records:
            if rec.get("name") == "overall":
                record_after = str(rec.get("summary") or "—")
                break

        rows.append(
            {
                "week_label": week_label,
                "date_label": date_label,
                "opponent_abbr": opp_abbr,
                "home": is_home,
                "result": result,
                "wl_record": record_after,
                "hi_pass": "—",
                "hi_rush": "—",
            },
        )

    team_block = raw.get("team") or {}
    return {
        "season": season,
        "team_abbr": team_upper,
        "team_name": str(team_block.get("displayName") or team_upper),
        "rows": rows,
    }
