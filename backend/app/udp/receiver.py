"""UDP telemetry receiver"""
import asyncio
import socket
from typing import Callable, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from .parser import F1TelemetryParser


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
        self.sock: Optional[socket.socket] = None
        self._receive_task: Optional[asyncio.Task] = None
        self.executor: Optional[ThreadPoolExecutor] = None
        self.packet_callbacks = []
        self.stats = {
            "packets_received": 0,
            "packets_parsed": 0,
            "parse_errors": 0,
            "started_at": None
        }

    def set_config(self, host: str = "", port: int = 20777):
        """Update listen address/port (takes effect on next start())."""
        self.host = host if host else "0.0.0.0"
        self.port = port

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
            # Create UDP socket
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.sock.bind((self.host, self.port))
            self.sock.setblocking(False)

            self.running = True
            self.stats["started_at"] = datetime.now()
            print(f"UDP receiver started on {self.host}:{self.port}")

            # Start receiving loop
            self._receive_task = asyncio.create_task(self._receive_loop())

        except Exception as e:
            print(f"Error starting UDP receiver: {e}")
            raise

    async def stop(self):
        """Stop the UDP receiver"""
        self.running = False
        task = self._receive_task
        self._receive_task = None
        if task is not None:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None
        print("UDP receiver stopped")

    async def _receive_loop(self):
        """Main receive loop - reads UDP datagrams and parses them"""
        loop = asyncio.get_event_loop()

        while self.running and self.sock:
            try:
                # Non-blocking read with a small timeout to keep loop responsive
                data = await loop.sock_recv(self.sock, 2048)

                if data:
                    self.stats["packets_received"] += 1
                    await self._process_packet(data)

            except asyncio.CancelledError:
                break
            except BlockingIOError:
                await asyncio.sleep(0.001)
            except Exception as e:
                if self.running:
                    print(f"Error receiving packet: {e}")
                await asyncio.sleep(0.001)

    async def _process_packet(self, data: bytes):
        """Parse a raw UDP datagram and dispatch to callbacks"""
        try:
            packet = F1TelemetryParser.parse_packet(data)

            if packet is None:
                self.stats["parse_errors"] += 1
                return

            # Get packet ID from header
            header = getattr(packet, "header", None)
            if header is None:
                self.stats["parse_errors"] += 1
                return

            # PacketType is an IntEnum, so it works as an int for downstream comparisons
            packet_type = getattr(header, "packet_type", None)
            if packet_type is None:
                self.stats["parse_errors"] += 1
                return

            self.stats["packets_parsed"] += 1

            # Call all registered callbacks
            for callback in self.packet_callbacks:
                try:
                    await callback(packet_type, packet)
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
