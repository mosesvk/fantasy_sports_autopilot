"""Static NFL team metadata (division alignment) used when normalizing ESPN standings."""

# Abbreviation -> (conference, division label matching UI, e.g. "NFC WEST")
TEAM_DIVISION: dict[str, tuple[str, str]] = {}
for conf, divisions in (
    (
        "AFC",
        (
            ("AFC EAST", ("BUF", "MIA", "NE", "NYJ")),
            ("AFC NORTH", ("BAL", "CIN", "CLE", "PIT")),
            ("AFC SOUTH", ("HOU", "IND", "JAX", "TEN")),
            ("AFC WEST", ("DEN", "KC", "LV", "LAC")),
        ),
    ),
    (
        "NFC",
        (
            ("NFC EAST", ("DAL", "NYG", "PHI", "WSH")),
            ("NFC NORTH", ("CHI", "DET", "GB", "MIN")),
            ("NFC SOUTH", ("ATL", "CAR", "NO", "TB")),
            ("NFC WEST", ("ARI", "LAR", "SF", "SEA")),
        ),
    ),
):
    for div_label, teams in divisions:
        for abbr in teams:
            TEAM_DIVISION[abbr] = (conf, div_label)
