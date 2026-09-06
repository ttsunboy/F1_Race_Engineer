"""F1 24 Telemetry Enum Mappings"""

# Session Types (Aligned with F1 24)
SESSION_TYPES = {
    0: "Unknown",
    1: "Practice 1",
    2: "Practice 2",
    3: "Practice 3",
    4: "Short Practice",
    5: "Qualifying 1",
    6: "Qualifying 2",
    7: "Qualifying 3",
    8: "Short Qualifying",
    9: "One-Shot Qualifying",
    # F1 24/25 protocol: sprint shootout session values live between qualifying and race.
    # Captured weather-forecast samples from the real game include future-session ids 15=Race,
    # so the old 10=Race mapping was stale and caused forecast/session labels to drift.
    10: "Sprint Shootout 1",
    11: "Sprint Shootout 2",
    12: "Sprint Shootout 3",
    13: "Short Sprint Shootout",
    14: "One-Shot Sprint Shootout",
    15: "Race",
    16: "Race 2",
    17: "Race 3",
    18: "Time Trial",
}

# Track IDs
TRACK_IDS = {
    0: "Melbourne",
    1: "Paul Ricard",
    2: "Shanghai",
    3: "Sakhir (Bahrain)",
    4: "Catalunya",
    5: "Monaco",
    6: "Montreal",
    7: "Silverstone",
    8: "Hockenheim",
    9: "Hungaroring",
    10: "Spa",
    11: "Monza",
    12: "Singapore",
    13: "Suzuka",
    14: "Abu Dhabi",
    15: "Texas",
    16: "Brazil",
    17: "Austria",
    18: "Sochi",
    19: "Mexico",
    20: "Baku",
    21: "Sakhir Short",
    22: "Silverstone Short",
    23: "Texas Short",
    24: "Suzuka Short",
    25: "Hanoi",
    26: "Zandvoort",
    27: "Imola",
    28: "Portimao",
    29: "Jeddah",
    30: "Miami",
    31: "Las Vegas",
    32: "Losail",
}

# Track lengths from in-game telemetry when available; otherwise temporary placeholders.
# Used only as fallback when F1 World session metadata is zeroed.
TRACK_LENGTHS = {
    0: 5300,
    2: 5451,
    3: 5412,
    6: 4361,
    7: 5891,
    10: 7004,
    11: 5793,
    13: 5807,
    31: 6201,
}

WEATHER = {
    0: "Clear",
    1: "Light Cloud",
    2: "Overcast",
    3: "Light Rain",
    4: "Heavy Rain",
    5: "Storm",
}

TEAMS = {
    0: "Mercedes",
    1: "Ferrari",
    2: "Red Bull Racing",
    3: "Williams",
    4: "Aston Martin",
    5: "Alpine",
    6: "RB",
    7: "Haas",
    8: "McLaren",
    9: "Sauber",
    85: "Mercedes 2020",
    86: "Ferrari 2020",
    87: "Red Bull 2020",
    88: "Williams 2020",
    89: "Racing Point 2020",
    90: "Renault 2020",
    91: "AlphaTauri 2020",
    92: "Haas 2020",
    93: "McLaren 2020",
    94: "Alfa Romeo 2020",
}

PIT_STATUS = {
    0: "None",
    1: "Pitting",
    2: "In Pit Area",
}

SECTOR = {
    0: "Sector 1",
    1: "Sector 2",
    2: "Sector 3",
}

DRIVER_STATUS = {
    0: "In Garage",
    1: "Flying Lap",
    2: "In Lap",
    3: "Out Lap",
    4: "On Track",
}

RESULT_STATUS = {
    0: "Invalid",
    1: "Inactive",
    2: "Active",
    3: "Finished",
    4: "Did Not Finish",
    5: "Disqualified",
    6: "Not Classified",
    7: "Retired",
}

TYRE_COMPOUNDS = {
    16: "SOFT",
    17: "MEDIUM",
    18: "HARD",
    7: "INTER",
    8: "WET",
}

DRS_STATUS = {
    0: "Off",
    1: "On",
}

DRS_ALLOWED = {
    0: "Not Allowed",
    1: "Allowed",
}

ERS_DEPLOY_MODE = {
    0: "None",
    1: "Medium",
    2: "Hotlap",
    3: "Overtake",
}

FUEL_MIX = {
    0: "Lean",
    1: "Standard",
    2: "Rich",
    3: "Max",
}


def format_enum(value, enum_map):
    """Safely map an enum numeric value to a human string."""
    return enum_map.get(value, str(value) if value is not None else "Unknown")
