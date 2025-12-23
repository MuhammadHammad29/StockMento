#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PSX Terminal WebSocket tick collector (proxy-rotating, per-shard; daily symbol CSVs)
- Saves to /opt/saved_psx/YYYY-MM-DD_SYMBOL.csv  (Asia/Karachi date)
- Respects WS limits from docs: <=5 connections/IP, <=20 subs/connection (we use 15).  [doc-cited]
- Two shards for 30 symbols (15 subs each)
- Per-shard proxy leasing, auto-rotation, and blacklist that updates working_proxies.json
"""

import asyncio, csv, json, os, signal, sys, time
from argparse import ArgumentParser
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo
import aiohttp
import redis.asyncio as aioredis

WS_URL = "wss://psxterminal.com/"
SCRIPT_DIR = Path(__file__).resolve().parent
SAVE_DIR = Path(os.getenv("PSX_SAVE_DIR", SCRIPT_DIR / "saved_psx"))
TIMEZONE = ZoneInfo("Asia/Karachi")

# PSX doc caps: 5 connections/IP; 20 subs/connection — we use 15.  :contentReference[oaicite:1]{index=1}
MAX_SUBS_PER_CONN = 15

DEFAULT_MARKET = "REG"
DEFAULT_SYMBOLS = [
    "ATRL","AVN","DGKC","EFERT","ENGROH","FABL","FCCL","FFL","GAL","GHNI",
    "HCAR","HUBC","LUCK","MARI","MEBL","MLCF","MTL","NETSOL","OCTOPUS","OGDC",
    "PAEL","PIOC","PPL","PRL","SAZEW","SEARL","SNGP","SYS","TOMCL","PSO"
]

# Proxy list / blacklist files (shared with launcher/populator)
BASE_DIR = Path(os.getenv("PSX_BASE_DIR", SCRIPT_DIR))
WORKING_FILE = BASE_DIR / "working_proxies.json"
BLACKLIST_FILE = BASE_DIR / "proxy_blacklist.json"

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

# Rotation & validation behavior
CONSEC_FAILS_TO_BLACKLIST = 3      # after 3 consecutive failures for the same proxy, blacklist it
RELOAD_PROXIES_INTERVAL = 120      # seconds between reloads of working_proxies.json

CSV_HEADERS = [
    "timestamp_ms","iso_time","symbol","market","st","price","change","changePercent",
    "volume","trades","value","high","low","bid","ask","bidVol","askVol"
]

_redis_client: Optional[aioredis.Redis] = None

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
    
    # PSX sends timestamp in seconds despite calling it "timestamp_ms"
    # We need to convert to actual milliseconds for proper storage
    timestamp_seconds = int(payload.get("timestamp_ms", 0))
    if timestamp_seconds == 0 or timestamp_seconds < 946684800:  # Before year 2000
        timestamp_seconds = int(time.time())
    
    # Convert to milliseconds for consistent storage
    timestamp_ms = timestamp_seconds * 1000
    payload["timestamp_ms"] = timestamp_ms
    key = REDIS_KEY_TEMPLATE.format(symbol=symbol, market=market)
    try:
        data = json.dumps(payload)
        # Daily boundary check (Asia/Karachi) to purge prior day cache
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

def ensure_savedir(): SAVE_DIR.mkdir(parents=True, exist_ok=True)

def daily_csv_path(symbol: str) -> Path:
    today = datetime.now(TIMEZONE).date().isoformat()  # YYYY-MM-DD in Asia/Karachi
    return SAVE_DIR / f"{today}_{symbol}.csv"

def ensure_csv_header(symbol: str):
    p = daily_csv_path(symbol)
    if not p.exists() or p.stat().st_size == 0:
        with p.open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(CSV_HEADERS)

def clamp(v, default=0):
    if v is None: return default
    if isinstance(v, str) and v.strip() == "": return default
    return v

def write_tick(symbol: str, market: str, tick: Dict):
    t_ms = clamp(tick.get("t"), 0)
    iso_time = datetime.fromtimestamp(t_ms/1000, tz=ZoneInfo("UTC")).astimezone(TIMEZONE).isoformat()
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

def chunk(lst: List[str], n: int) -> List[List[str]]:
    return [lst[i:i+n] for i in range(0, len(lst), n)]

# ---------- Proxy management with leasing ----------
def _load_json(path: Path, default):
    try:
        return json.loads(path.read_text())
    except Exception:
        return default

def _save_json_atomic(path: Path, data):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2))
    tmp.replace(path)

# Track last trading day per symbol to clear previous day cache quickly
_symbol_day_cache: Dict[str, str] = {}

class ProxiesManager:
    """Manages working proxies, blacklist, and leases proxies to shards (no collisions)."""
    def __init__(self, initial_from_flag: Optional[List[str]]):
        self.last_reload = 0.0
        self._working: List[str] = initial_from_flag[:] if initial_from_flag else []
        self._black: Dict[str, float] = _load_json(BLACKLIST_FILE, {})
        if not self._working:
            self._working = _load_json(WORKING_FILE, [])
        self._working = [p for p in self._working if p not in self._black]
        self._cursor = 0
        self._in_use: set[str] = set()

    def _reload_if_due(self):
        now = time.time()
        if now - self.last_reload >= RELOAD_PROXIES_INTERVAL:
            self.last_reload = now
            working = _load_json(WORKING_FILE, [])
            black = _load_json(BLACKLIST_FILE, {})
            self._black = black
            working = [p for p in working if p not in black]
            if working:
                self._working = working
                self._cursor = self._cursor % len(self._working)
                self._in_use = {p for p in self._in_use if p in self._working}

    def acquire(self, avoid: Optional[set[str]] = None, allow_duplicate=False) -> Optional[str]:
        self._reload_if_due()
        if not self._working:
            return None
        avoid = avoid or set()
        # Prefer free proxies
        for _ in range(len(self._working)):
            p = self._working[self._cursor]
            self._cursor = (self._cursor + 1) % len(self._working)
            if p not in self._in_use and p not in avoid:
                self._in_use.add(p)
                return p
        # If allowed, reuse a busy one (last resort)
        if allow_duplicate:
            for _ in range(len(self._working)):
                p = self._working[self._cursor]
                self._cursor = (self._cursor + 1) % len(self._working)
                if p not in avoid:
                    self._in_use.add(p)
                    return p
        return None

    def release(self, proxy: Optional[str]):
        if proxy:
            self._in_use.discard(proxy)

    def blacklist(self, proxy: str, reason: str = ""):
        if not proxy: return
        self._black[proxy] = time.time()
        try:
            _save_json_atomic(BLACKLIST_FILE, self._black)
        except Exception:
            pass
        working = _load_json(WORKING_FILE, [])
        if proxy in working:
            working = [p for p in working if p != proxy]
            try:
                _save_json_atomic(WORKING_FILE, working)
            except Exception:
                pass
        self._working = [p for p in self._working if p != proxy]
        self._in_use.discard(proxy)
        self._cursor = self._cursor % (len(self._working) or 1)
        print(f"[proxy] Blacklisted {proxy} ({reason}); remaining {len(self._working)}")

# ---------- WebSocket shard ----------
class WSShard:
    def __init__(self, shard_id: int, symbols: List[str], market: str,
                 proxies: ProxiesManager, initial_proxy: Optional[str]):
        self.id = shard_id
        self.symbols = symbols
        self.market = market
        self.pm = proxies
        self.proxy = None
        self._stop = asyncio.Event()
        self._fails_for_this_proxy = 0
        self._initial_requested = initial_proxy

    def _lease_initial(self):
        # Try requested initial proxy (if free), else any free proxy
        if self._initial_requested and \
           self._initial_requested not in self.pm._in_use and \
           self._initial_requested in self.pm._working:
            self.pm._in_use.add(self._initial_requested)
            self.proxy = self._initial_requested
            self._initial_requested = None
        elif not self.proxy:
            self.proxy = self.pm.acquire()

    async def run(self):
        headers = {"Origin": "https://psxterminal.com"}  # Some CDNs/WAFs require Origin
        self._lease_initial()
        while not self._stop.is_set():
            if not self.proxy:
                self.proxy = self.pm.acquire(allow_duplicate=False)
                if not self.proxy:
                    print(f"[shard {self.id}] no free proxy right now; waiting...")
                    await asyncio.sleep(5)
                    continue
            backoff = 1
            try:
                prx = self.proxy or "NONE"
                print(f"[shard {self.id}] connecting {WS_URL} via proxy={prx}")
                timeout = aiohttp.ClientTimeout(sock_connect=15, total=None)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.ws_connect(
                        WS_URL,
                        proxy=self.proxy,
                        headers=headers,
                        autoping=False,   # server uses JSON ping/pong per docs  :contentReference[oaicite:2]{index=2}
                        heartbeat=None,
                        compress=0,
                    ) as ws:
                        print(f"[shard {self.id}] connected via {prx}")
                        self._fails_for_this_proxy = 0
                        backoff = 1
                        await self._listen(ws)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                self._fails_for_this_proxy += 1
                print(f"[shard {self.id}] error with proxy {self.proxy or 'NONE'}: {repr(e)} (fails {self._fails_for_this_proxy})")
                if self._fails_for_this_proxy >= CONSEC_FAILS_TO_BLACKLIST and self.proxy:
                    self.pm.blacklist(self.proxy, reason=f"fails={self._fails_for_this_proxy}")
                    self.pm.release(self.proxy)
                    self.proxy = None
                    self._fails_for_this_proxy = 0
                else:
                    bad = self.proxy
                    self.pm.release(bad)
                    self.proxy = self.pm.acquire(avoid={bad}, allow_duplicate=False)
                    if not self.proxy:
                        print(f"[shard {self.id}] no alternative proxy available; waiting...")
                        await asyncio.sleep(5)
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
                await self._subscribe_all(ws); return
            if t == "ping":  # JSON heartbeat per docs  :contentReference[oaicite:3]{index=3}
                await ws.send_json({"type": "pong", "timestamp": data.get("timestamp")}); return
            if t == "subscribeResponse":
                if data.get("status") != "success":
                    print(f"[{self.id}] subscribe failed: {data}")
                return
            if t == "error":
                print(f"[{self.id}] server error: {data}")
                return
            if t == "tickUpdate":  # structure per docs  :contentReference[oaicite:4]{index=4}
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
        if self.proxy:
            self.pm.release(self.proxy)
            self.proxy = None

# ---------- Supervisor ----------
def parse_args():
    ap = ArgumentParser()
    ap.add_argument("--symbols", type=str, default=os.getenv("SYMBOLS",""))
    ap.add_argument("--market",  type=str, default=os.getenv("MARKET", DEFAULT_MARKET))
    ap.add_argument("--proxies", type=str, default=os.getenv("PROXIES","").strip())
    a = ap.parse_args()
    symbols = [s.strip() for s in a.symbols.split(",")] if a.symbols else DEFAULT_SYMBOLS
    proxies_flag = None
    if a.proxies:
        proxies_flag = [p.strip() for p in a.proxies.split(",") if p.strip()]
    return symbols, a.market.strip().upper(), proxies_flag

class Supervisor:
    def __init__(self, symbols: List[str], market: str, proxies_flag: Optional[List[str]]):
        # normalize & shard
        seen, clean = set(), []
        for s in (x.strip().upper() for x in symbols):
            if s and s not in seen:
                seen.add(s); clean.append(s)
        if not clean: raise SystemExit("No symbols provided.")
        groups = [clean[i:i+MAX_SUBS_PER_CONN] for i in range(0, len(clean), MAX_SUBS_PER_CONN)]
        if len(groups) > 5:
            raise SystemExit(f"{len(clean)} symbols need {len(groups)} WS conns > 5/IP doc limit.")  # :contentReference[oaicite:5]{index=5}

        self.pm = ProxiesManager(initial_from_flag=proxies_flag)
        inits = []
        if proxies_flag:
            for i in range(len(groups)):
                inits.append(proxies_flag[i % len(proxies_flag)])
        else:
            inits = [None]*len(groups)
        self.shards = [WSShard(i+1, grp, market, self.pm, inits[i]) for i, grp in enumerate(groups)]

    async def run(self):
        ensure_savedir()
        tasks = [asyncio.create_task(s.run()) for s in self.shards]
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(self.shutdown(s)))
        try:
            await asyncio.gather(*tasks)
        finally:
            await close_redis()

    async def shutdown(self, sig):
        print(f"Received {sig.name}, shutting down...")
        await asyncio.gather(*(s.close() for s in self.shards), return_exceptions=True)
        await asyncio.sleep(0.3)
        await close_redis()
        for t in asyncio.all_tasks():
            if t is not asyncio.current_task(): t.cancel()

def main():
    symbols, market, proxies_flag = parse_args()
    try:
        sup = Supervisor(symbols, market, proxies_flag)
    except SystemExit as e:
        print(e, file=sys.stderr); sys.exit(1)
    try:
        asyncio.run(sup.run())
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
