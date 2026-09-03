import time
import logging

logger = logging.getLogger('udp_receiver')
logger.setLevel(logging.DEBUG)

_last_log_times = {}

def log_limited(key: str, message: str, level: int = logging.WARNING, interval_seconds: float = 60.0):
    now = time.time()
    last = _last_log_times.get(key, 0.0)
    if now - last >= interval_seconds:
        _last_log_times[key] = now
        logger.log(level, message)
