"""F1 24 UDP packet type definitions"""
from enum import IntEnum


class PacketType(IntEnum):
    """Packet types in F1 24 telemetry"""
    MOTION = 0
    SESSION = 1
    LAP_DATA = 2
    EVENT = 3
    PARTICIPANTS = 4
    CAR_SETUPS = 5
    CAR_TELEMETRY = 6
    CAR_STATUS = 7
    FINAL_CLASSIFICATION = 8
    LOBBY_INFO = 9
    CAR_DAMAGE = 10
    SESSION_HISTORY = 11
    TYRE_SETS = 12
    MOTION_EX = 13


class SessionType(IntEnum):
    """Session types"""
    UNKNOWN = 0
    P1 = 1
    P2 = 2
    P3 = 3
    SHORT_P = 4
    Q1 = 5
    Q2 = 6
    Q3 = 7
    SHORT_Q = 8
    OSQ = 9
    RACE = 10
    RACE2 = 11
    RACE3 = 12
    TIME_TRIAL = 13


class Weather(IntEnum):
    """Weather conditions"""
    CLEAR = 0
    LIGHT_CLOUD = 1
    OVERCAST = 2
    LIGHT_RAIN = 3
    HEAVY_RAIN = 4
    STORM = 5


class TrackID(IntEnum):
    """Track identifiers"""
    MELBOURNE = 0
    PAUL_RICARD = 1
    SHANGHAI = 2
    SAKHIR = 3
    CATALUNYA = 4
    MONACO = 5
    MONTREAL = 6
    SILVERSTONE = 7
    HOCKENHEIM = 8
    HUNGARORING = 9
    SPA = 10
    MONZA = 11
    SINGAPORE = 12
    SUZUKA = 13
    ABU_DHABI = 14
    TEXAS = 15
    BRAZIL = 16
    AUSTRIA = 17
    SOCHI = 18
    MEXICO = 19
    BAKU = 20
    SAKHIR_SHORT = 21
    SILVERSTONE_SHORT = 22
    TEXAS_SHORT = 23
    SUZUKA_SHORT = 24
    HANOI = 25
    ZANDVOORT = 26
    IMOLA = 27
    PORTIMAO = 28
    JEDDAH = 29
    MIAMI = 30
    LAS_VEGAS = 31
    LOSAIL = 32


class DriverStatus(IntEnum):
    """Driver status"""
    IN_GARAGE = 0
    FLYING_LAP = 1
    IN_LAP = 2
    OUT_LAP = 3
    ON_TRACK = 4


class ResultStatus(IntEnum):
    """Result status"""
    INVALID = 0
    INACTIVE = 1
    ACTIVE = 2
    FINISHED = 3
    DNF = 4
    DSQ = 5
    NOT_CLASSIFIED = 6
    RETIRED = 7


class PitStatus(IntEnum):
    """Pit status"""
    NONE = 0
    PITTING = 1
    IN_PIT_AREA = 2


class Sector(IntEnum):
    """Track sector"""
    SECTOR1 = 0
    SECTOR2 = 1
    SECTOR3 = 2


class ActualTyreCompound(IntEnum):
    """Actual tire compounds"""
    C5 = 16
    C4 = 17
    C3 = 18
    C2 = 19
    C1 = 20
    INTER = 7
    WET = 8


class VisualTyreCompound(IntEnum):
    """Visual tire compounds"""
    SOFT = 16
    MEDIUM = 17
    HARD = 18
    INTER = 7
    WET = 8


class SurfaceType(IntEnum):
    """Surface types"""
    TARMAC = 0
    RUMBLE_STRIP = 1
    CONCRETE = 2
    ROCK = 3
    GRAVEL = 4
    MUD = 5
    SAND = 6
    GRASS = 7
    WATER = 8
    COBBLESTONE = 9
    METAL = 10
    RIDGED = 11


class FlagType(IntEnum):
    """Flag types"""
    NONE = 0
    GREEN = 1
    BLUE = 2
    YELLOW = 3
    RED = 4


class ERSDeployMode(IntEnum):
    """ERS deployment mode"""
    NONE = 0
    MEDIUM = 1
    HOTLAP = 2
    OVERTAKE = 3


class DRSStatus(IntEnum):
    """DRS status"""
    NOT_ALLOWED = 0
    ALLOWED = 1
    UNKNOWN = 2
    ACTIVE = 3


class TeamID(IntEnum):
    """Team identifiers"""
    MERCEDES = 0
    FERRARI = 1
    RED_BULL = 2
    WILLIAMS = 3
    ASTON_MARTIN = 4
    ALPINE = 5
    ALPHA_TAURI = 6
    HAAS = 7
    MCLAREN = 8
    ALFA_ROMEO = 9
