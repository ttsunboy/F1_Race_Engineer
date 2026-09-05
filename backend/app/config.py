"""Application configuration"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000

    # UDP settings
    udp_host: str = ""  # Empty string binds to all interfaces
    udp_port: int = 20777

    # WebSocket settings
    ws_heartbeat_interval: int = 30

    # Recording settings
    recordings_dir: str = "../data/recordings"
    sessions_dir: str = "../data/sessions"

    # Performance settings
    max_packet_queue_size: int = 1000
    packet_processing_interval: float = 0.016  # ~60 FPS

    # CORS settings
    # Local tool: allow any origin so the dashboard works from localhost,
    # 127.0.0.1, LAN IPs, etc. (no cookies/credentials used)
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
