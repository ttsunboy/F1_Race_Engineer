"""Pit stop loss-time reference table (F1 官方 Strategy Guide, 2024 全 24 站).

数据来源: F1 官网每站 "STRATEGY GUIDE / PIRELLI STRATEGY GUIDE" 文章内的
官方 "Pit Lane Loss Time" 图 (media.formula1.com 原图, 逐张图像识别读取)。
文章 URL 与图片 URL 见 backend/scripts/pit_loss_official_2024.json 和
PIT_LOSS_SOURCES.md。

规则 (官方定义):
- 绿旗: 官方绿旗进站损失秒数
- SC 与 VSC: 官方图为同一值 (官方把 SC/VSC 合并, 不再用比例折算)
- 之前的 0.43x/0.83x 比例推算已作废

结构: 键 = utils/enums.py TRACK_IDS 显示名, 值 = {"green", "sc", "ds"},
其中 ds(VSC 桶) = sc (官方同值)。Short 布局 = 对应主站值; 无官方数据的
非日历站 (Paul Ricard/Hockenheim/Sochi/Hanoi/Portimão) = 典型兜底值。
"""
from typing import Dict, Optional

CONDITIONS = ("green", "sc", "ds")

# 未知/无官方数据赛道兜底
DEFAULT_LOSS = {"green": 21.5, "sc": 11.0, "ds": 11.0}

PIT_LOSS_TABLE: Dict[str, Dict[str, float]] = {
    # --- 2024 日历 24 站: F1 官方 Strategy Guide Pit Lane Loss Time ---
    "Sakhir (Bahrain)": {"green": 23.2, "sc": 13.0, "ds": 13.0},
    "Jeddah": {"green": 20.0, "sc": 11.0, "ds": 11.0},
    "Melbourne": {"green": 20.0, "sc": 13.5, "ds": 13.5},
    "Suzuka": {"green": 22.5, "sc": 10.0, "ds": 10.0},
    "Shanghai": {"green": 23.0, "sc": 15.0, "ds": 15.0},
    "Miami": {"green": 17.0, "sc": 9.0, "ds": 9.0},
    "Imola": {"green": 26.5, "sc": 16.5, "ds": 16.5},
    "Monaco": {"green": 19.2, "sc": 12.0, "ds": 12.0},
    "Montreal": {"green": 18.5, "sc": 9.5, "ds": 9.5},
    "Catalunya": {"green": 22.5, "sc": 12.5, "ds": 12.5},
    "Austria": {"green": 20.0, "sc": 9.0, "ds": 9.0},
    "Silverstone": {"green": 20.0, "sc": 9.0, "ds": 9.0},
    "Hungaroring": {"green": 20.5, "sc": 11.5, "ds": 11.5},
    "Spa": {"green": 18.5, "sc": 11.0, "ds": 11.0},
    "Zandvoort": {"green": 21.5, "sc": 15.5, "ds": 15.5},
    "Monza": {"green": 23.0, "sc": 15.0, "ds": 15.0},
    "Azerbaijan": {"green": 20.5, "sc": 11.0, "ds": 11.0},
    "Singapore": {"green": 28.5, "sc": 15.0, "ds": 15.0},
    "Texas": {"green": 20.0, "sc": 14.0, "ds": 14.0},
    "Mexico": {"green": 22.0, "sc": 12.0, "ds": 12.0},
    "Brazil": {"green": 21.0, "sc": 11.0, "ds": 11.0},
    "Las Vegas": {"green": 21.0, "sc": 13.5, "ds": 13.5},
    "Losail": {"green": 26.5, "sc": 15.5, "ds": 15.5},
    "Abu Dhabi": {"green": 22.0, "sc": 15.0, "ds": 15.0},

    # --- Short 布局: 对应主站值 ---
    "Sakhir Short": {"green": 23.2, "sc": 13.0, "ds": 13.0},
    "Silverstone Short": {"green": 20.0, "sc": 9.0, "ds": 9.0},
    "Texas Short": {"green": 20.0, "sc": 14.0, "ds": 14.0},
    "Suzuka Short": {"green": 22.5, "sc": 10.0, "ds": 10.0},

    # --- 无官方数据的非日历站: 典型兜底值 ---
    "Paul Ricard": DEFAULT_LOSS,
    "Hockenheim": DEFAULT_LOSS,
    "Sochi": DEFAULT_LOSS,
    "Hanoi": DEFAULT_LOSS,
    "Portimão": DEFAULT_LOSS,
}


def condition_from_safety_car_status(status) -> str:
    if status == 1:
        return "sc"
    if status == 2:
        return "ds"
    return "green"


class PitLossService:
    """内置固定进站损失表 (F1 官方 Strategy Guide 2024, 只读)."""

    def loss_ms(self, track_id: Optional[str], condition: str) -> float:
        """返回该站该条件下的进站损失 (毫秒)."""
        row = PIT_LOSS_TABLE.get(track_id or "", DEFAULT_LOSS)
        return round(row.get(condition, DEFAULT_LOSS[condition]) * 1000)

    def stats(self, track_id: Optional[str]) -> Dict[str, dict]:
        """{condition: {loss_ms: float}} - 三种条件分开。"""
        return {c: {"loss_ms": self.loss_ms(track_id, c)} for c in CONDITIONS}
