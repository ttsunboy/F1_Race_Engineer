"""Track length collector: 从真实遥测抓取每条赛道的 track_length, 持久化到 JSON.

这是临时采集模块(一次性), 等所有赛道长度攒齐并硬编码进 TRACK_LENGTHS 后即可删除.
行为:
  - 只记录 track_length > 0 的包 (skip F1 World 元数据清零/0)
  - 按 track_id 累计, 同一 id 多个长度用 Counter 统计
  - 持久化到 backend/data/track_lengths_collected.json
  - 不干预主流程, 纯旁路监听
"""
import json
import os
import threading
from collections import Counter
from typing import Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'data')
OUT_FILE = os.path.join(DATA_DIR, 'track_lengths_collected.json')

_lock = threading.Lock()
_registry = {}            # {track_id: Counter(length)}
_name_by_id = {}          # {track_id: name}


def _load_existing():
    """加载已存在的采集数据(若之前跑过)"""
    try:
        if os.path.exists(OUT_FILE):
            with open(OUT_FILE, 'r', encoding='utf-8') as f:
                raw = json.load(f)
            result = {}
            for tid_str, info in raw.items():
                c = Counter()
                for length, count in info.get('variants', {}).items():
                    c[int(length)] = count
                if c:
                    result[int(tid_str)] = c
            return result
    except Exception:
        pass
    return {}


_registry = _load_existing()


def record(track_id, track_length) -> Optional[dict]:
    """记录一条遥测的轨道长度 (仅当非零). 返回 None 或该 track 的最新统计摘要."""
    if track_length in (None, 0):
        return None
    try:
        tid = int(track_id)
    except (TypeError, ValueError):
        return None

    with _lock:
        _registry.setdefault(tid, Counter())[int(track_length)] += 1
        try:
            _name_by_id[tid] = track_id.name
        except Exception:
            _name_by_id.setdefault(tid, str(track_id))

        counter = _registry[tid]
        top_len, top_cnt = counter.most_common(1)[0]
        return {
            "track_id": tid,
            "name": _name_by_id.get(tid, "UNKNOWN_{}".format(tid)),
            "length": top_len,
            "samples": top_cnt,
            "variants": dict(counter),
        }


def snapshot() -> dict:
    """当前所有已采集的赛道长度 (按 track_id 排序)"""
    with _lock:
        return _snapshot_locked()


def _snapshot_locked() -> dict:
    result = {}
    for tid, counter in sorted(_registry.items()):
        top_len, top_cnt = counter.most_common(1)[0]
        result[str(tid)] = {
            "name": _name_by_id.get(tid, "UNKNOWN_{}".format(tid)),
            "length": top_len,
            "samples": top_cnt,
            "variants": dict(counter),
        }
    return result


def save() -> bool:
    """把当前采集数据持久化到 OUT_FILE"""
    try:
        with _lock:
            data = _snapshot_locked()
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(OUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False


def summary() -> str:
    """人类可读摘要"""
    lines = ["=== 赛道长度采集统计 ==="]
    with _lock:
        if not _registry:
            lines.append("(暂无数据, 需游戏发送遥测)")
            return chr(10).join(lines)
        for tid, counter in sorted(_registry.items()):
            top_len, top_cnt = counter.most_common(1)[0]
            name = _name_by_id.get(tid, "UNKNOWN_{}".format(tid))
            lines.append("  {0:>2} {1:<18} length={2} sample={3} variants={4}".format(
                tid, name, top_len, top_cnt, dict(counter)))
    lines.append("保存: {}".format(OUT_FILE))
    return chr(10).join(lines)
