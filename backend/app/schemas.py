"""Pydantic schemas for API responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LineupPlayerOut(BaseModel):
    """Single starter slot with player metadata."""

    slot: str
    player_id: int
    sleeper_id: str
    name: str
    position: str
    team: str | None = None
    projected_points: float | None = None


class LineupDetailOut(BaseModel):
    """Full lineup record with nested starters."""

    lineup_id: int
    week: int
    season: int
    sport: str = "nfl"
    created_at: datetime | None = None
    starters: list[LineupPlayerOut] = Field(default_factory=list)
    total_projected_points: float | None = None


class PlayerOut(BaseModel):
    """Player summary."""

    id: int
    sleeper_id: str
    name: str
    position: str
    team: str | None = None
    projected_points: float | None = None
    college: str | None = None
    years_exp: int | None = None
    age: int | None = None
    injury_status: str | None = None
    is_retired: bool = False


class PlayerStatHistory(BaseModel):
    """Weekly stat row."""

    week: int
    season: int
    points: float | None = None
    projected_points: float | None = None
    actual_stats: dict[str, Any] | None = None


class PlayerStatsDetailOut(BaseModel):
    """Stats history for one player."""

    player: PlayerOut
    stats: list[PlayerStatHistory]


class LeaderColumnOut(BaseModel):
    """Column metadata for a leaders table."""

    key: str
    label: str
    numeric: bool = False


class PlayerLeadersOut(BaseModel):
    """Aggregated season leaders payload."""

    category: str
    title: str
    main_tab: str
    columns: list[LeaderColumnOut]
    rows: list[dict[str, str | int | float | bool | None]]


# --- NFL scoreboard (ESPN-backed via backend proxy) ---


class NflScoreLineOut(BaseModel):
    """Quarter-by-quarter points and total for one team."""

    q: list[int]
    total: int


class NflScoreboardTeamSideOut(BaseModel):
    """One side of a game with record strings and scoring."""

    abbr: str
    record: str
    split: str
    score: NflScoreLineOut


class NflPerformerLineOut(BaseModel):
    """Single leader line on the scorecard."""

    name: str
    detail: str
    espn_athlete_id: str | None = None


class NflPerformersOut(BaseModel):
    """Passing, rushing, and receiving leaders for a completed game."""

    passing: NflPerformerLineOut
    rushing: NflPerformerLineOut
    receiving: NflPerformerLineOut


class NflScoreboardGameOut(BaseModel):
    """Normalized game suitable for the dashboard scoreboard card."""

    game_id: str
    status: str
    away: NflScoreboardTeamSideOut
    home: NflScoreboardTeamSideOut
    headline: str
    summary: str
    performers: NflPerformersOut
    venue: str = ""
    event_name: str = ""


class NflWeekStripItemOut(BaseModel):
    """One entry in the horizontal week selector."""

    week: int
    label: str
    range: str


class NflScoreboardDayOut(BaseModel):
    """Games grouped under one calendar heading."""

    date_label: str
    games: list[NflScoreboardGameOut]


class NflScoreboardOut(BaseModel):
    """Full scoreboard response for a requested NFL week."""

    season: int
    week: int
    seasontype: int
    week_strip: list[NflWeekStripItemOut]
    days: list[NflScoreboardDayOut]
    source: str = "espn"


class NflBoxStatRowOut(BaseModel):
    """One player row in a box score stat grid."""

    player: str
    jersey: str = ""
    values: list[str]


class NflBoxStatTableOut(BaseModel):
    """One category (e.g. passing) for a team."""

    title: str
    columns: list[str]
    rows: list[NflBoxStatRowOut]


class NflBoxTeamOut(BaseModel):
    """All stat tables for one team."""

    team_abbr: str
    tables: list[NflBoxStatTableOut]


class NflPlayByPlayItemOut(BaseModel):
    """Single play in chronological order."""

    period: int | None = None
    clock: str = ""
    short_type: str = ""
    description: str
    away_score: int | None = None
    home_score: int | None = None
    scoring_play: bool = False


class NflGameDetailOut(BaseModel):
    """Box score and play-by-play for one game (in-app views)."""

    game_id: str
    away_abbr: str
    home_abbr: str
    status: str
    box_score: list[NflBoxTeamOut]
    play_by_play: list[NflPlayByPlayItemOut]


class NflStandingRowOut(BaseModel):
    """One team row aligned with the Rankings tab tables."""

    abbr: str
    status: str = ""
    w: int
    l: int
    t: int = 0
    pct: float
    home: str
    away: str
    div: str
    conf: str
    pf: int
    pa: int
    strk: str
    conference: str
    division: str
    playoff_seed: int | None = None


class NflStandingsOut(BaseModel):
    """Full standings payload for a season and season type."""

    season: int
    seasontype: int
    entries: list[NflStandingRowOut]


class NflChampionshipRowOut(BaseModel):
    """Super Bowl result for one league season."""

    season: int
    champion: str
    runner_up: str
    champion_abbr: str
    runner_up_abbr: str
    source: str = "fallback"


class NflChampionshipsOut(BaseModel):
    """Championship history list (newest season first)."""

    seasons: list[NflChampionshipRowOut]


class NflTeamScheduleRowOut(BaseModel):
    """One game row on the team schedule grid."""

    week_label: str
    date_label: str
    opponent_abbr: str
    home: bool
    result: str
    wl_record: str
    hi_pass: str = "—"
    hi_rush: str = "—"


class NflTeamScheduleOut(BaseModel):
    """Team schedule for one league year."""

    season: int
    team_abbr: str
    team_name: str
    rows: list[NflTeamScheduleRowOut]
