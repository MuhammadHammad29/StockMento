#!/usr/bin/env python3
"""Republish last known PSX quotes into Redis while the market is halted."""

from __future__ import annotations

import asyncio
import csv
import json
import os
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import aiohttp
import redis.asyncio as aioredis
from zoneinfo import ZoneInfo

DEFAULT_SYMBOLS = [
    "ATRL","AVN","DGKC","EFERT","ENGROH","FABL","FCCL","FFL","GAL","GHNI",
    "HCAR","HUBC","LUCK","MARI","MEBL","MLCF","MTL","NETSOL","OCTOPUS","OGDC",
    "PAEL","PIOC","PPL","PRL","SAZEW","SEARL","SNGP","SYS","TOMCL","PSO"
]

CSV_HEADERS = [
    "timestamp_ms","iso_time","symbol","market","st","price","change","changePercent",
    "volume","trades","value","high","low","bid","ask","bidVol","askVol"
]

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_KEY_TEMPLATE = os.getenv("REDIS_KEY_TEMPLATE", "psx:ticks:{symbol}")
REDIS_MAX_SAMPLES = int(os.getenv("REDIS_MAX_SAMPLES", os.getenv("REDIS_LIST_MAXLEN", "900")))
TICK_RETENTION_MINUTES = int(os.getenv("TICK_RETENTION_MINUTES", "15"))
TICK_RETENTION_MS = TICK_RETENTION_MINUTES * 60 * 1000
SAVE_DIR = Path(os.getenv("PSX_SAVE_DIR", Path(__file__).resolve().parent / "saved_psx"))
MARKET = os.getenv("PSX_MARKET", "REG")
LAST_QUOTES_INTERVAL = float(os.getenv("PSX_LAST_QUOTES_INTERVAL", "60"))
MARKET_STATUS_URL = os.getenv("MARKET_STATUS_URL", "http://localhost:3001/market/status")
MAX_LOOKBACK_DAYS = int(os.getenv("PSX_LAST_LOOKBACK_DAYS", "7"))
TIMEZONE = ZoneInfo(os.getenv("PSX_TIMEZONE", "Asia/Karachi"))


def _ensure_float(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _ensure_int(value: Any) -> int:
    if value in (None, ""):
        return 0
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _csv_paths_for_symbol(symbol: str) -> Iterable[Path]:
    now = datetime.now(TIMEZONE)
    for offset in range(MAX_LOOKBACK_DAYS):
        date = (now - timedelta(days=offset)).date().isoformat()
        yield SAVE_DIR / f"{date}_{symbol}.csv"


def _read_last_row(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        with path.open("r", newline="", encoding="utf-8") as handle:
            reader = csv.reader(handle)
            last: Optional[list[str]] = None
            for row in reader:
                if row and row[0] != "timestamp_ms":
                    last = row
            if not last:
                return None
            data = dict(zip(CSV_HEADERS, last))
            return data
    except Exception as exc:  # noqa: BLE001
        print(f"[last_quotes] failed to read {path}: {exc}", file=sys.stderr)
        return None


def build_tick_from_row(symbol: str, row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    timestamp_raw = _ensure_int(row.get("timestamp_ms"))
    if timestamp_raw < 1_000_000_000_000:  # seconds -> ms
        timestamp_raw *= 1000
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    bid = _ensure_float(row.get("bid"))
    ask = _ensure_float(row.get("ask"))
    bid_vol = _ensure_float(row.get("bidVol"))
    ask_vol = _ensure_float(row.get("askVol"))
    payload: Dict[str, Any] = {
        "timestamp_ms": now_ms,
        "iso_time": datetime.fromtimestamp(now_ms / 1000, tz=timezone.utc).isoformat(),
        "symbol": row.get("symbol") or symbol,
        "market": row.get("market") or MARKET,
        "st": row.get("st") or "HALT_KEEPALIVE",
        "price": _ensure_float(row.get("price")),
        "change": _ensure_float(row.get("change")),
        "changePercent": _ensure_float(row.get("changePercent")),
        "volume": _ensure_float(row.get("volume")),
        "trades": _ensure_float(row.get("trades")),
        "value": _ensure_float(row.get("value")),
        "high": _ensure_float(row.get("high")),
        "low": _ensure_float(row.get("low")),
        "bid": 0.0,
        "ask": 0.0,
        "bidVol": 0.0,
        "askVol": 0.0,
        "source": "halt_keepalive",
        "previous_timestamp_ms": timestamp_raw,
        "previous_bid": bid,
        "previous_ask": ask,
        "previous_bidVol": bid_vol,
        "previous_askVol": ask_vol
    }
    return payload


def find_latest_tick(symbol: str) -> Optional[Dict[str, Any]]:
    for path in _csv_paths_for_symbol(symbol):
        row = _read_last_row(path)
        if row:
            return build_tick_from_row(symbol, row)
    return None


class LastQuoteRepublisher:
    def __init__(self) -> None:
        self.symbols = [s.strip().upper() for s in os.getenv("PSX_SYMBOLS", "").split(",") if s.strip()] or DEFAULT_SYMBOLS
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

    async def write_tick(self, payload: Dict[str, Any]) -> None:
        redis = await self._get_redis()
        key = REDIS_KEY_TEMPLATE.replace('{symbol}', payload['symbol']).replace('{market}', payload.get('market', MARKET))
        timestamp = int(payload.get('timestamp_ms', 0)) or int(datetime.now(timezone.utc).timestamp() * 1000)
        serialized = json.dumps(payload)
        ttl_seconds = max(TICK_RETENTION_MINUTES * 60, 3600)
        pipe = redis.pipeline(transaction=False)
        pipe.zadd(key, {serialized: timestamp})
        if REDIS_MAX_SAMPLES > 0:
            pipe.zremrangebyrank(key, 0, -REDIS_MAX_SAMPLES - 1)
        if TICK_RETENTION_MS > 0:
            pipe.zremrangebyscore(key, 0, timestamp - TICK_RETENTION_MS)
        pipe.expire(key, ttl_seconds)
        await pipe.execute()

    async def publish_all(self) -> None:
        for symbol in self.symbols:
            tick = find_latest_tick(symbol)
            if not tick:
                continue
            try:
                await self.write_tick(tick)
            except Exception as exc:  # noqa: BLE001
                print(f"[last_quotes] failed to write redis tick for {symbol}: {exc}", file=sys.stderr)

    async def market_is_open(self, session: aiohttp.ClientSession) -> bool:
        try:
            async with session.get(MARKET_STATUS_URL, timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status != 200:
                    return False
                payload = await response.json()
                return payload.get('status') == 'open'
        except Exception:
            return False

    async def run(self) -> None:
        async with aiohttp.ClientSession() as session:
            while self._running:
                if await self.market_is_open(session):
                    print('[last_quotes] market reported open, stopping.')
                    break
                await self.publish_all()
                await asyncio.sleep(LAST_QUOTES_INTERVAL)

    def stop(self) -> None:
        self._running = False


async def _main() -> None:
    republisher = LastQuoteRepublisher()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, republisher.stop)
    try:
        await republisher.run()
    finally:
        await republisher.close()


if __name__ == '__main__':
    try:
        asyncio.run(_main())
    except KeyboardInterrupt:
        pass
