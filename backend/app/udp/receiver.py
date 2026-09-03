import asyncio
import socket
import logging
from datetime import datetime
from typing import Callable, List
from .parser import F1TelemetryParser
from .packet_types import PacketType
from .lograte import log_limited

logger = logging.getLogger(__name__)


class UDPTelemetryReceiver:
    """UDP telemetry receiver"""

    def __init__(self, host: str = "", port: int = 20777):
        self.host = host
        self.port = port
        self.sock = None
        self.running = False
        self.packet_callbacks: List[Callable] = []
        self._receive_task = None
        
        # Track statistics
        self.stats = {
            "packets_received": 0,
            "packets_parsed": 0,
            "parse_errors": 0,
            "errors_by_type": {},
            "started_at": None
        }

    def set_config(self, host: str = "", port: int = 20777):
        """Update connection configuration"""
        self.host = host
        self.port = port

    def add_packet_callback(self, callback: Callable):
        """Register a callback for parsed packets"""
        if callback not in self.packet_callbacks:
            self.packet_callbacks.append(callback)

    def remove_packet_callback(self, callback: Callable):
        """Remove a packet callback"""
        if callback in self.packet_callbacks:
            self.packet_callbacks.remove(callback)

    async def start(self):
        """Start listening for UDP packets"""
        if self.running:
            return

        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            # Use SO_RCVBUF to increase buffer size for high rate UDP if supported, omitting here for safe cross platform
            self.sock.bind((self.host, self.port))
            self.sock.setblocking(False)
            
            self.running = True
            self.stats["started_at"] = datetime.now()
            self._receive_task = asyncio.create_task(self._receive_loop())
            
            logger.info(f"UDP receiver started on {self.host}:{self.port}")
            
        except Exception as e:
            self.running = False
            logger.error(f"Error starting UDP receiver: {e}")
            raise

    async def stop(self):
        """Stop listening for UDP packets"""
        self.running = False
        
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            
        if self.sock:
            self.sock.close()
            self.sock = None
            
        logger.info("UDP receiver stopped")

    async def _receive_loop(self):
        """Background task to receive UDP packets"""
        loop = asyncio.get_event_loop()
        
        while self.running:
            try:
                # Use a large buffer to accommodate max packet size
                recv_result = await loop.sock_recv(self.sock, 4096)
                if isinstance(recv_result, tuple):
                    data, addr = recv_result
                else:
                    data, addr = recv_result, None
                self.stats["packets_received"] += 1
                
                # Dispatch parsing without waiting to maintain recv rate
                asyncio.create_task(self._process_packet(data))
                
            except asyncio.CancelledError:
                break
            except BlockingIOError:
                await asyncio.sleep(0.001)
            except Exception as e:
                if self.running:
                    logger.debug(f"Error receiving packet: {e}")
                await asyncio.sleep(0.001)

    async def _process_packet(self, data: bytes):
        """Parse a raw UDP datagram and dispatch to callbacks"""
        try:
            packet = F1TelemetryParser.parse_packet(data)

            if packet is None:
                self.stats["parse_errors"] += 1
                if len(data) >= 6:
                    ptype = data[5]
                    self.stats["errors_by_type"][ptype] = self.stats["errors_by_type"].get(ptype, 0) + 1
                    log_limited(f"drop_{ptype}", f"Dropped unparseable packet type {ptype}")
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
                    logger.debug(f"Error in packet callback: {e}")

        except Exception as e:
            self.stats["parse_errors"] += 1
            logger.debug(f"Error processing packet: {e}")

    def get_stats(self) -> dict:
        """Get receiver statistics"""
        stats = self.stats.copy()
        if stats["started_at"]:
            uptime = (datetime.now() - stats["started_at"]).total_seconds()
            stats["uptime_seconds"] = uptime
            if uptime > 0:
                stats["packets_per_second"] = stats["packets_received"] / uptime
        
        # Serialize datetime
        if stats["started_at"]:
            stats["started_at"] = stats["started_at"].isoformat()
            
        return stats
