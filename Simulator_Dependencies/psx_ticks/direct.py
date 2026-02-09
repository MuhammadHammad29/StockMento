#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PSX Terminal WebSocket tick collector (NO PROXIES) — Windows + Linux compatible
- Saves to PSX_SAVE_DIR (default: ./saved_psx next to this script)
  CSV: YYYY-MM-DD_SYMBOL.csv  (Asia/Karachi date)
- Uses <=20 subs/connection (we use 15)
- Shards symbols into groups of 15 (supports multiple markets)
- Writes ticks to Redis (ZSET per symbol) + optional Pub/Sub stream
- Handles Ctrl+C cleanly on Windows (no loop.add_signal_handler on Win)
"""

import asyncio
import csv
import json
import os
import sys
import time
import signal
from argparse import ArgumentParser
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import aiohttp
import redis.asyncio as aioredis

# ---------------- Config ----------------
WS_URL = "wss://psxterminal.com/"
TIMEZONE = ZoneInfo("Asia/Karachi")

SCRIPT_DIR = Path(__file__).resolve().parent
SAVE_DIR = Path(os.getenv("PSX_SAVE_DIR", str(SCRIPT_DIR / "saved_psx")))

MAX_SUBS_PER_CONN = 15

DEFAULT_MARKET = "REG"
DEFAULT_INDEX_MARKET = "IDX"
DEFAULT_SYMBOLS = [
    "ATRL","AVN","DGKC","EFERT","ENGROH","FABL","FCCL","FFL","GAL","GHNI",
    "HCAR","HUBC","LUCK","MARI","MEBL","MLCF","MTL","NETSOL","OCTOPUS","OGDC",
    "PAEL","PIOC","PPL","PRL","SAZEW","SEARL","SNGP","SYS","TOMCL","PSO"
]
DEFAULT_INDEX_SYMBOLS = ["KSE100", "KMI30"]

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0").strip()
REDIS_KEY_TEMPLATE = os.getenv("REDIS_KEY_TEMPLATE", "psx:ticks:{symbol}")
REDIS_PUBSUB_CHANNEL = os.getenv("REDIS_PUBSUB_CHANNEL", "psx:ticks:stream")

def _parse_int(value: Optional[str], default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

REDIS_MAX_SAMPLES = _parse_int(os.getenv("REDIS_LIST_MAXLEN") or os.getenv("REDIS_MAX_SAMPLES"), 15000)
TICK_RETENTION_MINUTES = _parse_int(os.getenv("TICK_RETENTION_MINUTES"), 1440)
TICK_RETENTION_MS = TICK_RETENTION_MINUTES * 60 * 1000

CSV_HEADERS = [
    "timestamp_ms","iso_time","symbol","market","st","price","change","changePercent",
    "volume","trades","value","high","low","bid","ask","bidVol","askVol"
]

# ---------------- Globals ----------------
_redis_client: Optional[aioredis.Redis] = None
_symbol_day_cache: Dict[str, str] = {}

# ---------------- Redis ----------------
async def _get_redis_client() -> Optional[aioredis.Redis]:
    global _redis_client
    if not REDIS_URL:
        return None
    if _redis_client is None:
        _redis_client = aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    return _redis_client

async def push_tick_to_redis(symbol: str, market: str, row: List):
    client = await _get_redis_client()
    if client is None:
        return

    payload = dict(zip(CSV_HEADERS, row))
    payload.setdefault("symbol", symbol)
    payload.setdefault("market", market)

    # Normalize timestamp_ms (ms since epoch)
    ts = payload.get("timestamp_ms", 0)
    try:
        ts_int = int(ts)
    except Exception:
        ts_int = 0

    # If value looks like seconds or invalid, normalize
    if ts_int <= 0:
        timestamp_ms = int(time.time() * 1000)
    else:
        timestamp_ms = ts_int * 1000 if ts_int < 10**12 else ts_int

    payload["timestamp_ms"] = timestamp_ms
    key = REDIS_KEY_TEMPLATE.format(symbol=symbol, market=market)

    try:
        data = json.dumps(payload, ensure_ascii=False)

        # Daily boundary (Asia/Karachi): clear prior day cache
        day_key = datetime.fromtimestamp(timestamp_ms / 1000, tz=TIMEZONE).date().isoformat()
        last_day = _symbol_day_cache.get(symbol)
        if last_day and last_day != day_key:
            try:
                await client.delete(key)
            except Exception:
                pass
        _symbol_day_cache[symbol] = day_key

        pipe = client.pipeline(transaction=False)
        pipe.zadd(key, {data: timestamp_ms})

        if REDIS_MAX_SAMPLES > 0:
            # keep only the most recent N by rank
            pipe.zremrangebyrank(key, 0, -REDIS_MAX_SAMPLES - 1)

        if TICK_RETENTION_MS > 0:
            pipe.zremrangebyscore(key, 0, timestamp_ms - TICK_RETENTION_MS)

        ttl_seconds = max(TICK_RETENTION_MINUTES * 60, 3600)
        pipe.expire(key, ttl_seconds)

        await pipe.execute()

        if REDIS_PUBSUB_CHANNEL:
            await client.publish(REDIS_PUBSUB_CHANNEL, data)

    except Exception as exc:
        print(f"[redis] Failed to write tick for {symbol}: {exc}")

async def close_redis():
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
        finally:
            _redis_client = None

# ---------------- CSV ----------------
def ensure_savedir():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)

def daily_csv_path(symbol: str) -> Path:
    today = datetime.now(TIMEZONE).date().isoformat()
    return SAVE_DIR / f"{today}_{symbol}.csv"

def ensure_csv_header(symbol: str):
    p = daily_csv_path(symbol)
    if (not p.exists()) or p.stat().st_size == 0:
        with p.open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(CSV_HEADERS)

def clamp(v, default=0):
    if v is None:
        return default
    if isinstance(v, str) and v.strip() == "":
        return default
    return v

def normalize_symbols(symbols: List[str]) -> List[str]:
    seen, clean = set(), []
    for s in (x.strip().upper() for x in symbols):
        if s and s not in seen:
            seen.add(s)
            clean.append(s)
    return clean

def write_tick(symbol: str, market: str, tick: Dict):
    # tick["t"] is expected to be milliseconds
    t_ms = clamp(tick.get("t"), 0)
    try:
        iso_time = datetime.fromtimestamp(t_ms / 1000, tz=ZoneInfo("UTC")).astimezone(TIMEZONE).isoformat()
    except Exception:
        iso_time = datetime.now(TIMEZONE).isoformat()

    row = [
        t_ms, iso_time,
        clamp(tick.get("s"), symbol),
        clamp(tick.get("m"), market),
        clamp(tick.get("st"), ""),
        clamp(tick.get("c"), 0),
        clamp(tick.get("ch"), 0),
        clamp(tick.get("pch"), 0),
        clamp(tick.get("v"), 0),
        clamp(tick.get("tr"), 0),
        clamp(tick.get("val"), 0),
        clamp(tick.get("h"), 0),
        clamp(tick.get("l"), 0),
        clamp(tick.get("bp"), 0),
        clamp(tick.get("ap"), 0),
        clamp(tick.get("bv"), 0),
        clamp(tick.get("av"), 0),
    ]

    with daily_csv_path(symbol).open("a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(row)

    return row

# ---------------- WS Shard ----------------
class WSShard:
    def __init__(self, shard_id: int, symbols: List[str], market: str):
        self.id = shard_id
        self.symbols = symbols
        self.market = market
        self._stop = asyncio.Event()

    async def run(self):
        headers = {"Origin": "https://psxterminal.com"}
        backoff = 1

        while not self._stop.is_set():
            try:
                print(f"[shard {self.id}] connecting {WS_URL} (no proxy)")
                timeout = aiohttp.ClientTimeout(sock_connect=15, total=None)

                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.ws_connect(
                        WS_URL,
                        headers=headers,
                        autoping=False,   # JSON ping/pong expected
                        heartbeat=None,
                        compress=0,
                    ) as ws:
                        print(f"[shard {self.id}] connected")
                        backoff = 1
                        await self._listen(ws)

            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f"[shard {self.id}] error: {repr(e)}")
                await asyncio.sleep(min(backoff, 30))
                backoff = min(backoff * 2, 30)

    async def _subscribe_all(self, ws: aiohttp.ClientWebSocketResponse):
        for i, sym in enumerate(self.symbols, 1):
            req = {
                "type": "subscribe",
                "subscriptionType": "marketData",
                "params": {"marketType": self.market, "symbol": sym},
                "requestId": f"sub-{self.id}-{i:02d}",
            }
            await ws.send_json(req)
            await asyncio.sleep(0.05)

    async def _handle(self, ws: aiohttp.ClientWebSocketResponse, msg: aiohttp.WSMessage):
        if msg.type == aiohttp.WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
            except json.JSONDecodeError:
                return

            t = data.get("type")

            if t == "welcome":
                await self._subscribe_all(ws)
                return

            if t == "ping":
                await ws.send_json({"type": "pong", "timestamp": data.get("timestamp")})
                return

            if t == "subscribeResponse":
                if data.get("status") != "success":
                    print(f"[{self.id}] subscribe failed: {data}")
                return

            if t == "error":
                print(f"[{self.id}] server error: {data}")
                return

            if t == "tickUpdate":
                symbol = data.get("symbol") or (data.get("tick", {}) or {}).get("s")
                market = data.get("market") or (data.get("tick", {}) or {}).get("m") or self.market
                tick = data.get("tick", {})

                if symbol:
                    ensure_csv_header(symbol)
                    row = write_tick(symbol, market, tick)
                    await push_tick_to_redis(symbol, market, row)
                return

        elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
            raise ConnectionError(f"WebSocket closed: {msg.type}")

    async def _listen(self, ws: aiohttp.ClientWebSocketResponse):
        async for msg in ws:
            await self._handle(ws, msg)

    async def close(self):
        self._stop.set()

# ---------------- Supervisor ----------------
def parse_args():
    ap = ArgumentParser()
    ap.add_argument("--symbols", type=str, default=os.getenv("SYMBOLS", ""))
    ap.add_argument("--market", type=str, default=os.getenv("MARKET", DEFAULT_MARKET))
    ap.add_argument("--idx-symbols", type=str, default=os.getenv("IDX_SYMBOLS", ""))
    ap.add_argument("--idx-market", type=str, default=os.getenv("IDX_MARKET", DEFAULT_INDEX_MARKET))
    args = ap.parse_args()

    symbols = [s.strip() for s in args.symbols.split(",")] if args.symbols else DEFAULT_SYMBOLS
    idx_symbols = [s.strip() for s in args.idx_symbols.split(",")] if args.idx_symbols else DEFAULT_INDEX_SYMBOLS
    market = args.market.strip().upper()
    idx_market = args.idx_market.strip().upper()
    return normalize_symbols(symbols), market, normalize_symbols(idx_symbols), idx_market

class Supervisor:
    def __init__(self, symbols: List[str], market: str, idx_symbols: List[str], idx_market: str):
        self.shards: List[WSShard] = []
        next_shard_id = 1

        def add_market_shards(market_symbols: List[str], market_name: str):
            nonlocal next_shard_id
            if not market_symbols:
                return
            groups = [
                market_symbols[i:i + MAX_SUBS_PER_CONN]
                for i in range(0, len(market_symbols), MAX_SUBS_PER_CONN)
            ]
            for grp in groups:
                self.shards.append(WSShard(next_shard_id, grp, market_name))
                next_shard_id += 1

        add_market_shards(symbols, market)
        add_market_shards(idx_symbols, idx_market)

        if not self.shards:
            raise SystemExit("No symbols provided.")

        self._stop_event = asyncio.Event()

    async def run(self):
        ensure_savedir()
        tasks = [asyncio.create_task(s.run(), name=f"shard-{s.id}") for s in self.shards]

        loop = asyncio.get_running_loop()

        # Linux/macOS: attach signal handlers
        # Windows: NotImplementedError -> we rely on Ctrl+C / KeyboardInterrupt
        try:
            for sig in (signal.SIGINT, signal.SIGTERM):
                loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(self.shutdown(s)))
        except NotImplementedError:
            pass

        try:
            await asyncio.gather(*tasks)
        finally:
            await close_redis()

    async def shutdown(self, sig):
        print(f"Received {getattr(sig, 'name', sig)}, shutting down...")
        await asyncio.gather(*(s.close() for s in self.shards), return_exceptions=True)
        await asyncio.sleep(0.2)
        await close_redis()

        # Cancel remaining tasks (except current)
        current = asyncio.current_task()
        for t in asyncio.all_tasks():
            if t is not current:
                t.cancel()

def main():
    symbols, market, idx_symbols, idx_market = parse_args()

    try:
        sup = Supervisor(symbols, market, idx_symbols, idx_market)
    except SystemExit as e:
        print(e, file=sys.stderr)
        sys.exit(1)

    try:
        asyncio.run(sup.run())
    except KeyboardInterrupt:
        # Windows-friendly: Ctrl+C triggers this
        print("KeyboardInterrupt received, exiting...")

if __name__ == "__main__":
    main()
