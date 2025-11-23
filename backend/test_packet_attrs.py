"""Quick test to inspect packet attribute names"""
from f1_24_telemetry.listener import TelemetryListener
import time

listener = TelemetryListener(host="0.0.0.0", port=20777)
print("Listening for packets... Start F1 24 game if not running.")

packet_types_seen = set()

for _ in range(100):  # Check first 100 packets
    packet = listener.get()
    if packet is not None:
        packet_type = type(packet).__name__
        if packet_type not in packet_types_seen:
            packet_types_seen.add(packet_type)
            print(f"\n{packet_type}:")
            print(f"  Attributes: {[a for a in dir(packet) if not a.startswith('_')][:10]}")

            # Check header specifically
            if hasattr(packet, 'header'):
                print(f"  Has 'header' attribute")
            if hasattr(packet, 'm_header'):
                print(f"  Has 'm_header' attribute")

    time.sleep(0.01)

print(f"\nSeen {len(packet_types_seen)} packet types")
