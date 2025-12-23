#!/usr/bin/env python3
"""Periodic PSX market stats fetcher -> Redis publisher."""

from __future__ import annotations

import asyncio
import json
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import aiohttp
import redis.asyncio as aioredis

DEFAULT_STATS_TYPE = os.getenv("PSX_STATS_TYPE", "REG")
API_BASE_URL = os.getenv("PSX_STATS_API_BASE", "https://psxterminal.com")
POLL_INTERVAL_SECONDS = float(os.getenv("PSX_STATS_INTERVAL", "5"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_STATS_KEY_TEMPLATE = os.getenv("REDIS_STATS_KEY_TEMPLATE", "psx:stats:{type}")
REDIS_STATS_CHANNEL = os.getenv("REDIS_STATS_CHANNEL", "psx:stats:stream")
REDIS_PUBSUB_CHANNEL = os.getenv("REDIS_PUBSUB_CHANNEL", "psx:ticks:stream")
USE_TICK_CHANNEL = os.getenv("PSX_STATS_USE_TICK_CHANNEL", "false").lower() in {"1", "true", "yes"}

CHANNEL = REDIS_PUBSUB_CHANNEL if USE_TICK_CHANNEL else REDIS_STATS_CHANNEL

SESSION_TIMEOUT = aiohttp.ClientTimeout(total=10)


class MarketStatsCollector:
    def __init__(self) -> None:
        self._redis: Optional[aioredis.Redis] = None
        self._running = True

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        return self._redis

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.close()
            self._redis = None

    async def fetch_once(self, session: aiohttp.ClientSession, stats_type: str = DEFAULT_STATS_TYPE) -> None:
        url = f"{API_BASE_URL.rstrip('/')}/api/stats/{stats_type}"
        async with session.get(url) as response:
            response.raise_for_status()
            data = await response.json()

        timestamp_ms = int(time.time() * 1000)
        payload: Dict[str, Any] = {
            "kind": "market_stats",
            "statsType": stats_type,
            "timestamp_ms": timestamp_ms,
            "iso_time": datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).isoformat(),
            "data": data
        }

        redis = await self._get_redis()
        key = REDIS_STATS_KEY_TEMPLATE.format(type=stats_type)
        message = json.dumps(payload)

        pipe = redis.pipeline(transaction=False)
        pipe.set(key, message)
        pipe.publish(CHANNEL, message)
        await pipe.execute()

    async def run(self) -> None:
        stats_type = DEFAULT_STATS_TYPE
        retry_delay = POLL_INTERVAL_SECONDS
        async with aiohttp.ClientSession(timeout=SESSION_TIMEOUT) as session:
            while self._running:
                try:
                    await self.fetch_once(session, stats_type)
                    await asyncio.sleep(POLL_INTERVAL_SECONDS)
                    retry_delay = POLL_INTERVAL_SECONDS
                except asyncio.CancelledError:
                    raise
                except Exception as exc:  # noqa: BLE001
                    print(f"[stats] error fetching stats: {exc}", file=sys.stderr)
                    await asyncio.sleep(min(retry_delay, 60))
                    retry_delay = min(retry_delay * 2, 60)

    def stop(self) -> None:
        self._running = False


async def _main() -> None:
    collector = MarketStatsCollector()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, collector.stop)

    try:
        await collector.run()
    finally:
        await collector.close()


if __name__ == "__main__":
    try:
        asyncio.run(_main())
    except KeyboardInterrupt:
        pass
