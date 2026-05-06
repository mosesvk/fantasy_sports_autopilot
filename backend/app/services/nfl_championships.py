"""
Super Bowl champions by season: try ESPN postseason scoreboard, else verified fallback.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

import requests

from app.data.nfl_championships_fallback import NFL_CHAMPIONSHIP_FALLBACK


def _fetch_sb_scoreboard(*, season: int, timeout: float = 20.0) -> dict[str, Any] | None:
    base = os.getenv(
        "NFL_SCOREBOARD_BASE_URL",
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    )
    try:
        response = requests.get(
            base,
            params={"seasontype": 3, "week": 5, "year": season},
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None


def _is_placeholder_super_bowl(event_name: str) -> bool:
    """ESPN occasionally returns a stale SB template (e.g. SEA vs NE) for unrelated years."""
    lower = event_name.lower()
    return "seahawks" in lower and "patriots" in lower


def _parse_super_bowl_from_events(raw: dict[str, Any]) -> dict[str, Any] | None:
    events = raw.get("events") or []
    if len(events) != 1:
        return None
    event = events[0]
    name = str(event.get("name") or "")
    if _is_placeholder_super_bowl(name):
        return None
    comps = event.get("competitions") or []
    if not comps:
        return None
    competitors = comps[0].get("competitors") or []
    if len(competitors) < 2:
        return None
    winner = None
    loser = None
    for c in competitors:
        team = c.get("team") or {}
        abbr = str(team.get("abbreviation") or "")
        display = str(team.get("displayName") or abbr)
        if c.get("winner"):
            winner = (abbr, display)
        else:
            loser = (abbr, display)
    if not winner or not loser:
        return None
    return {
        "champion_abbr": winner[0],
        "champion": winner[1],
        "runner_up_abbr": loser[0],
        "runner_up": loser[1],
        "source": "espn",
    }


def build_championships_list(*, from_season: int, to_season: int) -> list[dict[str, Any]]:
    """
    Build championship rows for each league season in [from_season, to_season].

    Attempts live ESPN Super Bowl; falls back to verified table when needed.
    """
    fallback_by_year = {int(x["season"]): x for x in NFL_CHAMPIONSHIP_FALLBACK}
    out: list[dict[str, Any]] = []
    current_year = datetime.now().year
    hi = min(max(to_season, from_season), current_year + 1)
    for year in range(hi, from_season - 1, -1):
        parsed = None
        raw = _fetch_sb_scoreboard(season=year)
        if raw:
            parsed = _parse_super_bowl_from_events(raw)
        if parsed:
            row = {"season": year, **parsed}
        elif year in fallback_by_year:
            fb = fallback_by_year[year]
            row = {
                "season": year,
                "champion": fb["champion"],
                "runner_up": fb["runner_up"],
                "champion_abbr": fb["champion_abbr"],
                "runner_up_abbr": fb["runner_up_abbr"],
                "source": "fallback",
            }
        else:
            continue
        out.append(row)
    return out
