"""UDP telemetry receiver"""
import asyncio
from typing import Callable, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from f1_24_telemetry.listener import TelemetryListener


class UDPTelemetryReceiver:
    """Receives and processes F1 24 UDP telemetry packets"""

    def __init__(self, host: str = "", port: int = 20777):
        """
        Initialize UDP receiver

        Args:
            host: Host IP to bind to (empty string for all interfaces)
            port: UDP port to listen on (default: 20777)
        """
        # Use 0.0.0.0 for all interfaces if host is empty
        self.host = host if host else "0.0.0.0"
        self.port = port
        self.running = False
        self.listener: Optional[TelemetryListener] = None
        self.executor: Optional[ThreadPoolExecutor] = None
        self.packet_callbacks = []
        self.stats = {
            "packets_received": 0,
            "packets_parsed": 0,
            "parse_errors": 0,
            "started_at": None
        }

    def add_packet_callback(self, callback: Callable):
        """
        Add a callback function to be called when a packet is received

        Args:
            callback: Async function that takes (packet_type, packet_data)
        """
        self.packet_callbacks.append(callback)

    def remove_packet_callback(self, callback: Callable):
        """Remove a packet callback"""
        if callback in self.packet_callbacks:
            self.packet_callbacks.remove(callback)

    async def start(self):
        """Start the UDP receiver"""
        if self.running:
            return

        try:
            # Create thread pool executor for running blocking TelemetryListener
            self.executor = ThreadPoolExecutor(max_workers=1)

            # Create TelemetryListener instance in thread pool
            loop = asyncio.get_event_loop()
            self.listener = await loop.run_in_executor(
                self.executor,
                lambda: TelemetryListener(host=self.host, port=self.port)
            )

            self.running = True
            self.stats["started_at"] = datetime.now()
            print(f"UDP receiver started on {self.host}:{self.port}")

            # Start receiving loop
            asyncio.create_task(self._receive_loop())

        except Exception as e:
            print(f"Error starting UDP receiver: {e}")
            raise

    async def stop(self):
        """Stop the UDP receiver"""
        self.running = False
        if self.executor:
            self.executor.shutdown(wait=False)
            self.executor = None
        self.listener = None
        print("UDP receiver stopped")

    async def _receive_loop(self):
        """Main receive loop - polls TelemetryListener for packets"""
        loop = asyncio.get_event_loop()

        while self.running and self.listener and self.executor:
            try:
                # Get packet from listener in thread pool (since listener.get() blocks)
                packet = await loop.run_in_executor(
                    self.executor,
                    self.listener.get
                )

                if packet is not None:
                    self.stats["packets_received"] += 1

                    # Process packet
                    asyncio.create_task(self._process_packet(packet))

            except asyncio.CancelledError:
                break
            except Exception as e:
                if self.running:
                    print(f"Error receiving packet: {e}")
                await asyncio.sleep(0.001)

    async def _process_packet(self, packet):
        """Process a received packet"""
        try:
            # Get packet header to determine type
            header = getattr(packet, "header", None) or getattr(packet, "m_header", None)

            if header is None:
                self.stats["parse_errors"] += 1
                return

            # Get packet ID
            packet_id = getattr(header, "packet_id", None) or getattr(header, "m_packetId", None)

            if packet_id is None:
                self.stats["parse_errors"] += 1
                return

            self.stats["packets_parsed"] += 1

            # Call all registered callbacks
            for callback in self.packet_callbacks:
                try:
                    await callback(packet_id, packet)
                except Exception as e:
                    print(f"Error in packet callback: {e}")

        except Exception as e:
            self.stats["parse_errors"] += 1
            print(f"Error processing packet: {e}")

    def get_stats(self) -> dict:
        """Get receiver statistics"""
        stats = self.stats.copy()
        if stats["started_at"]:
            uptime = (datetime.now() - stats["started_at"]).total_seconds()
            stats["uptime_seconds"] = uptime
            if uptime > 0:
                stats["packets_per_second"] = stats["packets_received"] / uptime
        return stats
