"""
Fetch and normalize NFL scoreboard payloads from the public ESPN site API.

ESPN does not publish a supported public contract; this integration may break if
their JSON shape changes. Override NFL_SCOREBOARD_BASE_URL to point at a proxy
or another provider that returns the same raw shape, or replace this module.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests

_EASTERN = ZoneInfo("America/New_York")


def fetch_espn_scoreboard_raw(
    *,
    season: int,
    week: int,
    seasontype: int = 2,
    timeout: float = 20.0,
) -> dict[str, Any]:
    """
    Request the raw ESPN scoreboard JSON for a season week.

    :param season: League year (e.g. 2025).
    :param week: Schedule week (regular season 1–18).
    :param seasontype: ESPN season type (1 preseason, 2 regular, 3 postseason).
    :param timeout: HTTP timeout in seconds.
    :returns: Parsed JSON object.
    :raises requests.HTTPError: When the upstream response is not successful.
    :raises requests.RequestException: On network errors.
    """
    base = os.getenv(
        "NFL_SCOREBOARD_BASE_URL",
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    )
    params = {"seasontype": seasontype, "week": week, "year": season}
    response = requests.get(base, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _format_calendar_date(dt: datetime) -> str:
    """Long US-style date in Eastern time, e.g. 'Thursday, November 20, 2025'."""
    return f"{dt.strftime('%A, %B')} {dt.day}, {dt.year}"


def _extract_week_strip(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Build week selector entries from ESPN league calendar (regular season)."""
    leagues = raw.get("leagues") or []
    if not leagues:
        return []
    calendar = leagues[0].get("calendar") or []
    for block in calendar:
        if block.get("label") == "Regular Season":
            out: list[dict[str, Any]] = []
            for entry in block.get("entries") or []:
                try:
                    wk = int(entry.get("value", "0"))
                except (TypeError, ValueError):
                    continue
                detail = (entry.get("detail") or "").strip()
                out.append(
                    {
                        "week": wk,
                        "label": f"WEEK {wk}",
                        "range": detail.upper().replace("–", "-") if detail else "",
                    },
                )
            return out
    return []


def _team_abbr_by_id(competitors: list[dict[str, Any]], team_id: str | None) -> str:
    if not team_id:
        return ""
    for c in competitors:
        tid = str((c.get("team") or {}).get("id", ""))
        if tid == str(team_id):
            return str((c.get("team") or {}).get("abbreviation") or "")
    return ""


def _parse_linescores(competitor: dict[str, Any]) -> tuple[list[int], int]:
    """Return per-period points (ordered 1..n) and ESPN-reported total score."""
    linescores = competitor.get("linescores") or []
    by_period: dict[int, int] = {}
    for cell in linescores:
        try:
            p = int(cell.get("period", 0))
            val = int(float(cell.get("value", 0)))
        except (TypeError, ValueError):
            continue
        if p > 0:
            by_period[p] = val
    if not by_period:
        try:
            total_only = int(competitor.get("score", 0))
        except (TypeError, ValueError):
            total_only = 0
        return [0, 0, 0, 0], total_only
    max_p = max(by_period)
    q = [by_period.get(i, 0) for i in range(1, max_p + 1)]
    try:
        total = int(competitor.get("score", sum(q)))
    except (TypeError, ValueError):
        total = sum(q)
    return q, total


def _record_lines(competitor: dict[str, Any]) -> tuple[str, str]:
    """Overall record and '2-3 Away' style split line."""
    records = competitor.get("records") or []
    overall = ""
    split_summary = ""
    split_label = ""
    for r in records:
        t = r.get("type")
        if t == "total":
            overall = str(r.get("summary") or "")
        ha = competitor.get("homeAway")
        if ha == "home" and t == "home":
            split_summary = str(r.get("summary") or "")
            split_label = "Home"
        if ha == "away" and t == "road":
            split_summary = str(r.get("summary") or "")
            split_label = "Away"
    split_part = f"{split_summary} {split_label}".strip() if split_summary else ""
    return overall, split_part


def _game_status(competition: dict[str, Any], away_q: list[int], home_q: list[int]) -> str:
    st = (competition.get("status") or {}).get("type") or {}
    detail = str(st.get("shortDetail") or st.get("description") or "Scheduled")
    completed = bool(st.get("completed"))
    max_len = max(len(away_q), len(home_q))
    if completed and max_len > 4 and "OT" not in detail.upper():
        return "FINAL/OT"
    return detail.upper()


def _headline_pair(competition: dict[str, Any], event_name: str) -> tuple[str, str]:
    for h in competition.get("headlines") or []:
        if h.get("type") == "Recap":
            headline = str(h.get("shortLinkText") or h.get("headline") or "").strip()
            summary = str(h.get("description") or "").strip().lstrip("— ").strip()
            return headline or event_name, summary
    return event_name, ""


def _pick_leader_detail(
    leaders_blocks: list[dict[str, Any]],
    key: str,
    competitors: list[dict[str, Any]],
) -> dict[str, Any]:
    for block in leaders_blocks:
        if block.get("name") != key:
            continue
        leaders = block.get("leaders") or []
        if not leaders:
            break
        entry = leaders[0]
        athlete = entry.get("athlete") or {}
        team_id = str((athlete.get("team") or {}).get("id") or (entry.get("team") or {}).get("id") or "")
        abbr = _team_abbr_by_id(competitors, team_id)
        pos = str((athlete.get("position") or {}).get("abbreviation") or "")
        jersey = str(athlete.get("jersey") or "").strip()
        short = str(athlete.get("shortName") or athlete.get("displayName") or "—")
        dv = str(entry.get("displayValue") or "")
        jersey_part = f"#{jersey} " if jersey else ""
        detail = f"{short} {pos} {jersey_part}{abbr} | {dv}".replace("  ", " ").strip()
        raw_aid = athlete.get("id")
        aid = str(raw_aid).strip() if raw_aid is not None else ""
        return {"name": short, "detail": detail, "espn_athlete_id": aid or None}
    return {"name": "—", "detail": "—", "espn_athlete_id": None}


def _normalize_game(event: dict[str, Any]) -> dict[str, Any] | None:
    competitions = event.get("competitions") or []
    if not competitions:
        return None
    competition = competitions[0]
    competitors = competition.get("competitors") or []
    if len(competitors) < 2:
        return None
    by_ha: dict[str, dict[str, Any]] = {}
    for c in competitors:
        ha = c.get("homeAway")
        if ha in ("home", "away"):
            by_ha[str(ha)] = c
    away_c = by_ha.get("away")
    home_c = by_ha.get("home")
    if not away_c or not home_c:
        return None

    away_team = away_c.get("team") or {}
    home_team = home_c.get("team") or {}
    away_abbr = str(away_team.get("abbreviation") or "")
    home_abbr = str(home_team.get("abbreviation") or "")

    away_q, away_total = _parse_linescores(away_c)
    home_q, home_total = _parse_linescores(home_c)

    away_rec, away_split = _record_lines(away_c)
    home_rec, home_split = _record_lines(home_c)

    # Pad quarter columns so both rows align for the UI
    max_q = max(len(away_q), len(home_q))
    away_q = away_q + [0] * (max_q - len(away_q))
    home_q = home_q + [0] * (max_q - len(home_q))

    status = _game_status(competition, away_q, home_q)
    headline, summary = _headline_pair(competition, str(event.get("name") or "Game"))

    leaders_raw = competition.get("leaders") or []
    performers = {
        "passing": _pick_leader_detail(leaders_raw, "passingYards", competitors),
        "rushing": _pick_leader_detail(leaders_raw, "rushingYards", competitors),
        "receiving": _pick_leader_detail(leaders_raw, "receivingYards", competitors),
    }

    venue_obj = competition.get("venue") or {}
    venue_full = str(venue_obj.get("fullName") or "").strip()
    event_label = str(event.get("shortName") or event.get("name") or "").strip()

    game_id = str(event.get("id") or "").strip()
    if not game_id:
        return None

    return {
        "game_id": game_id,
        "status": status,
        "away": {
            "abbr": away_abbr,
            "record": away_rec,
            "split": away_split,
            "score": {"q": away_q, "total": away_total},
        },
        "home": {
            "abbr": home_abbr,
            "record": home_rec,
            "split": home_split,
            "score": {"q": home_q, "total": home_total},
        },
        "headline": headline,
        "summary": summary,
        "performers": performers,
        "venue": venue_full,
        "event_name": event_label,
    }


def normalize_scoreboard_response(
    raw: dict[str, Any],
    *,
    season: int,
    week: int,
    seasontype: int,
) -> dict[str, Any]:
    """
    Turn raw ESPN JSON into the LineupOS scoreboard DTO.

    :param raw: Parsed ESPN scoreboard payload.
    :param season: Requested season year echoed back.
    :param week: Requested week echoed back.
    :param seasontype: ESPN season type echoed back.
    :returns: Dict matching NflScoreboardOut.
    """
    week_strip = _extract_week_strip(raw)
    events = list(raw.get("events") or [])

    def sort_key(ev: dict[str, Any]) -> datetime:
        comps = ev.get("competitions") or []
        if not comps:
            return datetime.min.replace(tzinfo=_EASTERN)
        raw_date = str(comps[0].get("date") or ev.get("date") or "")
        try:
            return datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(_EASTERN)
        except ValueError:
            return datetime.min.replace(tzinfo=_EASTERN)

    events.sort(key=sort_key)

    days_map: dict[str, dict[str, Any]] = {}
    day_order: list[str] = []
    for event in events:
        comps = event.get("competitions") or []
        raw_date = str(comps[0].get("date") or event.get("date") or "") if comps else str(event.get("date") or "")
        try:
            dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(_EASTERN)
        except ValueError:
            continue
        key = dt.date().isoformat()
        if key not in days_map:
            days_map[key] = {"date_label": _format_calendar_date(dt), "games": []}
            day_order.append(key)
        game = _normalize_game(event)
        if game:
            days_map[key]["games"].append(game)

    days = [{"date_label": days_map[k]["date_label"], "games": days_map[k]["games"]} for k in day_order]

    return {
        "season": season,
        "week": week,
        "seasontype": seasontype,
        "week_strip": week_strip,
        "days": days,
        "source": "espn",
    }
