"""Race recap service - generates and stores race recaps"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path


class RaceRecapService:
    """Generates race recaps and manages race history"""

    def __init__(self, storage_dir: str = "race_history"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.current_race_data = {
            "session_info": {},
            "position_changes": {},  # Track position changes throughout race
            "lap_leaders": [],  # Track who led each lap
            "fastest_laps": {},  # Track fastest lap for each driver
            "overtakes": [],  # Track overtake events
        }
        self.race_started = False
        self.race_ended = False

    def start_race_tracking(self, session_data: dict):
        """Initialize race tracking when a race session starts"""
        self.race_started = True
        self.race_ended = False
        self.current_race_data = {
            "session_info": {
                "track": session_data.get("track_id", "Unknown"),
                "session_type": session_data.get("session_type", "Unknown"),
                "total_laps": session_data.get("total_laps", 0),
                "started_at": datetime.now().isoformat(),
                "weather": session_data.get("weather", "Unknown"),
                "track_temp": session_data.get("track_temperature", 0),
                "air_temp": session_data.get("air_temperature", 0),
            },
            "position_changes": {},
            "lap_leaders": [],
            "fastest_laps": {},
            "overtakes": [],
            "starting_grid": {},
        }

    def track_position_change(self, lap: int, car_index: int, old_position: int, new_position: int, driver_name: str):
        """Track when a driver changes position"""
        if old_position != new_position and old_position > 0 and new_position > 0:
            change = {
                "lap": lap,
                "driver": driver_name,
                "from": old_position,
                "to": new_position,
                "gained": old_position - new_position
            }

            if car_index not in self.current_race_data["position_changes"]:
                self.current_race_data["position_changes"][car_index] = []
            self.current_race_data["position_changes"][car_index].append(change)

            # Track overtakes (position improvements)
            if new_position < old_position:
                self.current_race_data["overtakes"].append(change)

    def track_lap_leader(self, lap: int, car_index: int, driver_name: str):
        """Track who's leading each lap"""
        if not self.current_race_data["lap_leaders"] or self.current_race_data["lap_leaders"][-1]["car_index"] != car_index:
            self.current_race_data["lap_leaders"].append({
                "lap": lap,
                "car_index": car_index,
                "driver": driver_name
            })

    def track_fastest_lap(self, car_index: int, driver_name: str, lap_time: int, lap_num: int):
        """Track fastest lap times"""
        if lap_time > 0:
            if car_index not in self.current_race_data["fastest_laps"] or lap_time < self.current_race_data["fastest_laps"][car_index]["time"]:
                self.current_race_data["fastest_laps"][car_index] = {
                    "driver": driver_name,
                    "time": lap_time,
                    "lap": lap_num
                }

    def set_starting_grid(self, starting_grid: dict):
        """Store starting grid positions"""
        self.current_race_data["starting_grid"] = starting_grid

    def is_sprint_race(self, session_type: str) -> bool:
        """Determine if this is a sprint race"""
        return "sprint" in session_type.lower()

    def calculate_points(self, position: int, is_sprint: bool, has_fastest_lap: bool = False) -> int:
        """Calculate points based on finishing position"""
        if is_sprint:
            sprint_points = {1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1}
            return sprint_points.get(position, 0)
        else:
            race_points = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
            points = race_points.get(position, 0)
            # Fastest lap bonus (only if in top 10)
            if has_fastest_lap and position <= 10:
                points += 1
            return points

    def generate_race_story(self, final_results: List[dict], lap_history: dict) -> List[str]:
        """Generate a narrative race story from the data"""
        story = []

        # Race start
        if self.current_race_data.get("starting_grid"):
            pole_sitter = None
            for idx, pos in self.current_race_data["starting_grid"].items():
                if pos == 1:
                    driver = final_results[0]["driver_name"] if final_results else "Unknown"
                    for result in final_results:
                        if result["car_index"] == int(idx):
                            pole_sitter = result["driver_name"]
                            break
            if pole_sitter:
                story.append(f"🏁 {pole_sitter} started from pole position")

        # Race lead changes
        if len(self.current_race_data["lap_leaders"]) > 1:
            story.append(f"🔄 The lead changed hands {len(self.current_race_data['lap_leaders']) - 1} times")

        # Major overtakes
        biggest_overtakes = sorted(self.current_race_data["overtakes"], key=lambda x: x["gained"], reverse=True)[:3]
        for overtake in biggest_overtakes:
            if overtake["gained"] >= 3:
                story.append(f"💨 {overtake['driver']} made a great move on lap {overtake['lap']}, climbing from P{overtake['from']} to P{overtake['to']}")

        # Fastest lap
        if self.current_race_data["fastest_laps"]:
            fastest = min(self.current_race_data["fastest_laps"].values(), key=lambda x: x["time"])
            fastest_time = fastest["time"] / 1000
            story.append(f"⚡ {fastest['driver']} set the fastest lap of {fastest_time:.3f}s on lap {fastest['lap']}")

        # Winner
        if final_results:
            winner = final_results[0]
            story.append(f"🏆 {winner['driver_name']} took the victory!")

            # Podium
            if len(final_results) >= 3:
                story.append(f"🥈 {final_results[1]['driver_name']} finished in second")
                story.append(f"🥉 {final_results[2]['driver_name']} completed the podium")

        return story

    def generate_recap(self, session_data: dict, final_results: List[dict], participants: dict, lap_history: dict) -> dict:
        """Generate a complete race recap"""
        is_sprint = self.is_sprint_race(session_data.get("session_type", ""))

        # Find fastest lap overall
        fastest_lap_driver = None
        fastest_lap_time = float('inf')

        if self.current_race_data["fastest_laps"]:
            fastest_entry = min(self.current_race_data["fastest_laps"].values(), key=lambda x: x["time"])
            fastest_lap_driver = fastest_entry["driver"]
            fastest_lap_time = fastest_entry["time"]

        # Process final results with points
        results_with_points = []
        for result in final_results:
            driver_name = result.get("driver_name", "Unknown")
            position = result.get("position", 0)
            has_fastest = driver_name == fastest_lap_driver

            points = self.calculate_points(position, is_sprint, has_fastest)

            # Get driver's lap history
            driver_laps = lap_history.get(result["car_index"], [])

            # Calculate position changes
            start_pos = self.current_race_data["starting_grid"].get(result["car_index"], position)
            positions_gained = start_pos - position

            results_with_points.append({
                "position": position,
                "driver_name": driver_name,
                "team": result.get("team", "Unknown"),
                "points": points,
                "fastest_lap": has_fastest,
                "total_laps": len(driver_laps),
                "best_lap": min([lap["time_ms"] for lap in driver_laps]) if driver_laps else 0,
                "positions_gained": positions_gained,
                "car_index": result["car_index"],
            })

        # Generate race story
        story = self.generate_race_story(final_results, lap_history)

        recap = {
            "id": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "timestamp": datetime.now().isoformat(),
            "session_info": self.current_race_data["session_info"],
            "is_sprint": is_sprint,
            "results": sorted(results_with_points, key=lambda x: x["position"]),
            "fastest_lap": {
                "driver": fastest_lap_driver,
                "time": fastest_lap_time,
            } if fastest_lap_driver else None,
            "race_story": story,
            "statistics": {
                "total_overtakes": len(self.current_race_data["overtakes"]),
                "lead_changes": len(self.current_race_data["lap_leaders"]) - 1 if self.current_race_data["lap_leaders"] else 0,
                "total_laps": session_data.get("total_laps", 0),
            },
            "lap_history": lap_history,
        }

        return recap

    def save_recap(self, recap: dict) -> str:
        """Save race recap to disk"""
        filename = f"race_{recap['id']}.json"
        filepath = self.storage_dir / filename

        with open(filepath, 'w') as f:
            json.dump(recap, f, indent=2)

        return str(filepath)

    def get_all_races(self) -> List[dict]:
        """Get summary of all saved races"""
        races = []

        for filepath in sorted(self.storage_dir.glob("race_*.json"), reverse=True):
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    # Return summary info
                    races.append({
                        "id": data["id"],
                        "timestamp": data["timestamp"],
                        "track": data["session_info"].get("track", "Unknown"),
                        "session_type": data["session_info"].get("session_type", "Unknown"),
                        "is_sprint": data.get("is_sprint", False),
                        "winner": data["results"][0]["driver_name"] if data["results"] else "Unknown",
                        "total_laps": data["statistics"].get("total_laps", 0),
                    })
            except Exception as e:
                print(f"Error loading race {filepath}: {e}")

        return races

    def get_race_recap(self, race_id: str) -> Optional[dict]:
        """Get full recap for a specific race"""
        filepath = self.storage_dir / f"race_{race_id}.json"

        if not filepath.exists():
            return None

        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading race recap: {e}")
            return None

    def reset_session(self):
        """Reset current race tracking for a new session"""
        self.race_started = False
        self.race_ended = False
        self.current_race_data = {
            "session_info": {},
            "position_changes": {},
            "lap_leaders": [],
            "fastest_laps": {},
            "overtakes": [],
            "starting_grid": {},
        }
