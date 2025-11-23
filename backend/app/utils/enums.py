"""F1 24 Telemetry Enum Mappings"""

# Session Types
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
    10: "Sprint Shootout 1",
    11: "Sprint Shootout 2",
    12: "Sprint Shootout 3",
    13: "Short Sprint Shootout",
    14: "One-Shot Sprint Shootout",
    15: "Race",
    16: "Race 2",
    17: "Race 3",
    18: "Time Trial"
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
    20: "Azerbaijan",
    21: "Sakhir Short",
    22: "Silverstone Short",
    23: "Texas Short",
    24: "Suzuka Short",
    25: "Hanoi",
    26: "Zandvoort",
    27: "Imola",
    28: "Portimão",
    29: "Jeddah",
    30: "Miami",
    31: "Las Vegas",
    32: "Losail",
}

# Weather Conditions
WEATHER = {
    0: "Clear",
    1: "Light Cloud",
    2: "Overcast",
    3: "Light Rain",
    4: "Heavy Rain",
    5: "Storm"
}

# Team IDs
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
    94: "Alfa Romeo 2020"
}

# Pit Status
PIT_STATUS = {
    0: "None",
    1: "Pitting",
    2: "In Pit Area"
}

# Sector
SECTOR = {
    0: "Sector 1",
    1: "Sector 2",
    2: "Sector 3"
}

# Driver Status
DRIVER_STATUS = {
    0: "In Garage",
    1: "Flying Lap",
    2: "In Lap",
    3: "Out Lap",
    4: "On Track"
}

# Result Status
RESULT_STATUS = {
    0: "Invalid",
    1: "Inactive",
    2: "Active",
    3: "Finished",
    4: "Did Not Finish",
    5: "Disqualified",
    6: "Not Classified",
    7: "Retired"
}

# Tyre Compounds (Visual)
TYRE_COMPOUNDS = {
    0: "Soft",
    1: "Medium",
    2: "Hard",
    3: "Inter",
    4: "Wet",
    7: "Inter",
    8: "Wet",
    9: "Dry",
    10: "Wet",
    11: "Super Soft",
    12: "Soft",
    13: "Medium",
    14: "Hard",
    15: "Wet",
    16: "C5",
    17: "C4",
    18: "C3",
    19: "C2",
    20: "C1",
    21: "C0"
}

# DRS Status
DRS_STATUS = {
    0: "Not Available",
    1: "Available",
    -1: "Unknown"
}

# DRS Allowed
DRS_ALLOWED = {
    0: "Not Allowed",
    1: "Allowed",
    -1: "Unknown"
}

# ERS Deploy Mode
ERS_DEPLOY_MODE = {
    0: "None",
    1: "Medium",
    2: "Hotlap",
    3: "Overtake"
}

# Fuel Mix
FUEL_MIX = {
    0: "Lean",
    1: "Standard",
    2: "Rich",
    3: "Max"
}


def format_enum(value, enum_dict):
    """Format an enum value to readable text"""
    if value is None:
        return "Unknown"

    # Handle string numbers
    if isinstance(value, str):
        try:
            value = int(value)
        except (ValueError, TypeError):
            return value

    # Handle enum objects with name attribute
    if hasattr(value, 'name'):
        return value.name

    # Look up in dictionary
    return enum_dict.get(value, str(value))
