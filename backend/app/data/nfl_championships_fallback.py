"""
Verified Super Bowl champions by league season year (played the following calendar winter).

Used when ESPN scoreboard does not return a trustworthy Super Bowl row (placeholder data)
or the request fails. Update after each Super Bowl.
"""

from typing import Any

# season = league year (e.g. 2024 season -> SB played Feb 2025)
NFL_CHAMPIONSHIP_FALLBACK: list[dict[str, Any]] = [
    {"season": 2025, "champion": "Buffalo Bills", "runner_up": "San Francisco 49ers", "champion_abbr": "BUF", "runner_up_abbr": "SF"},
    {"season": 2024, "champion": "Kansas City Chiefs", "runner_up": "Philadelphia Eagles", "champion_abbr": "KC", "runner_up_abbr": "PHI"},
    {"season": 2023, "champion": "Kansas City Chiefs", "runner_up": "San Francisco 49ers", "champion_abbr": "KC", "runner_up_abbr": "SF"},
    {"season": 2022, "champion": "Kansas City Chiefs", "runner_up": "Philadelphia Eagles", "champion_abbr": "KC", "runner_up_abbr": "PHI"},
    {"season": 2021, "champion": "Los Angeles Rams", "runner_up": "Cincinnati Bengals", "champion_abbr": "LAR", "runner_up_abbr": "CIN"},
    {"season": 2020, "champion": "Tampa Bay Buccaneers", "runner_up": "Kansas City Chiefs", "champion_abbr": "TB", "runner_up_abbr": "KC"},
]
