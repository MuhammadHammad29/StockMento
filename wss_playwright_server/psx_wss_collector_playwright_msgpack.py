#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
psx_wss_collector.py

PSXTerminal WebSocket Stock Data Collector - Headless Playwright + MessagePack
Compatible with the stock_compiled NestJS backend (tick.service.ts / tick.gateway.ts)

Why this version exists:
  PSXTerminal no longer accepts the old direct wss://psxterminal.com/ connection.
  The browser site creates an authorized /rt?t=... WebSocket and sends/receives
  JSON + MessagePack frames. This collector runs Chromium headlessly, captures the
  authorized browser WebSocket, sends the same subscription messages as before,
  decodes MessagePack frames, then keeps the original Redis + CSV behavior.

Data flow:
  PSXTerminal browser WSS -> This script -> Redis ZSET   (psx:ticks:{symbol})
                                       -> Redis PubSub (psx:ticks:stream)
                                       -> CSV files    (/opt/saved_psx/)

Redis format matches direct.py exactly so the NestJS backend can read:
  Key:    psx:ticks:{symbol}  (ZSET, score = timestamp_ms)
  PubSub: psx:ticks:stream    (JSON per tick)
  Fields: timestamp_ms, iso_time, symbol, market, st, price, change,
          changePercent, volume, trades, value, high, low, bid, ask,
          bidVol, askVol

Requirements:
    pip install playwright msgpack redis
    playwright install chromium

Environment Variables:
    REDIS_URL               - Redis URL (default: redis://localhost:6379/0)
    SIM_ACTIVE_DAY_KEY      - Redis key for active trading day (default: sim:active_trading_day)
    PSX_SAVE_DIR            - CSV save directory (default: ./saved_psx)
    SYMBOLS                 - Comma-separated stock list (default: 30 stocks)
    IDX_SYMBOLS             - Comma-separated index list (default: KSE100,KMI30)
    MARKET                  - Market type for stocks (default: REG)
    IDX_MARKET              - Market type for indices (default: IDX)
    RESPECT_MARKET_HOURS    - Pause outside market hours (default: true)
    KLINE_TIMEFRAMES        - Kline timeframes to subscribe (default: 1m)
    HEADLESS                - Run Chromium headless (default: true)
    MAX_SUBS_PER_WS         - Custom subscriptions per browser WS (default: 18)
    PSX_BOOTSTRAP_SYMBOL    - Symbol page used to bootstrap WSS (default: first stock symbol)
"""

import asyncio
import base64
import csv
import json
import logging
import os
import signal
import socket
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List
from zoneinfo import ZoneInfo

import msgpack
import redis.asyncio as aioredis
from playwright.async_api import async_playwright

# ============================================================================
# Systemd Watchdog
# ============================================================================

def notify_systemd(state="WATCHDOG=1"):
    """Send notification to systemd watchdog."""
    notify_socket = os.environ.get("NOTIFY_SOCKET")
    if not notify_socket:
        return
    try:
        if notify_socket.startswith("@"):
            notify_socket = "\0" + notify_socket[1:]
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
        sock.connect(notify_socket)
        sock.sendall(state.encode())
        sock.close()
    except Exception:
        pass

# ============================================================================
# Logging
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("psx_wss_collector")

# ============================================================================
# Configuration
# ============================================================================

TIMEZONE = ZoneInfo("Asia/Karachi")

DEFAULT_MARKET = "REG"
DEFAULT_IDX_MARKET = "IDX"
DEFAULT_SYMBOLS = [
    "ATRL", "AVN", "DGKC", "EFERT", "ENGROH", "FABL", "FCCL", "FFL",
    "GAL", "GHNI", "HCAR", "HUBC", "LUCK", "MARI", "MEBL", "MLCF",
    "MTL", "NETSOL", "OCTOPUS", "OGDC", "PAEL", "PIOC", "PPL", "PRL",
    "SAZEW", "SEARL", "SNGP", "SYS", "TOMCL", "PSO",
]
DEFAULT_IDX_SYMBOLS = ["KSE100", "KMI30"]


def _parse_symbols(env_key, default):
    raw = os.getenv(env_key, "").strip()
    if not raw:
        return default
    seen, clean = set(), []
    for s in (x.strip().upper() for x in raw.split(",")):
        if s and s not in seen:
            seen.add(s)
            clean.append(s)
    return clean


SYMBOLS = _parse_symbols("SYMBOLS", DEFAULT_SYMBOLS)
IDX_SYMBOLS = _parse_symbols("IDX_SYMBOLS", DEFAULT_IDX_SYMBOLS)
MARKET = os.getenv("MARKET", DEFAULT_MARKET).strip().upper()
IDX_MARKET = os.getenv("IDX_MARKET", DEFAULT_IDX_MARKET).strip().upper()

# Browser bootstrap. The page creates the authorized /rt?t=... websocket.
HEADLESS = os.getenv("HEADLESS", "true").lower() != "false"
PSX_BOOTSTRAP_SYMBOL = os.getenv("PSX_BOOTSTRAP_SYMBOL", SYMBOLS[0] if SYMBOLS else "HUBC").strip().upper()
PSX_BOOTSTRAP_URL = os.getenv(
    "PSX_BOOTSTRAP_URL",
    f"https://psxterminal.com/symbol/{PSX_BOOTSTRAP_SYMBOL}?market={MARKET}",
)
USER_AGENT = os.getenv(
    "USER_AGENT",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
)

# Redis - must match direct.py exactly for backend compatibility
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0").strip()
REDIS_KEY_TEMPLATE = os.getenv("REDIS_KEY_TEMPLATE", "psx:ticks:{symbol}")
REDIS_PUBSUB_CHANNEL = os.getenv("REDIS_PUBSUB_CHANNEL", "psx:ticks:stream")
SIM_ACTIVE_DAY_KEY = os.getenv("SIM_ACTIVE_DAY_KEY", "sim:active_trading_day")


def _parse_int(val, default):
    if val is None:
        return default
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


REDIS_MAX_SAMPLES = _parse_int(
    os.getenv("REDIS_LIST_MAXLEN") or os.getenv("REDIS_MAX_SAMPLES"), 15000
)
TICK_RETENTION_MINUTES = _parse_int(os.getenv("TICK_RETENTION_MINUTES"), 10080)
TICK_RETENTION_MS = TICK_RETENTION_MINUTES * 60 * 1000

# CSV
SAVE_DIR = Path(os.getenv("PSX_SAVE_DIR", "./saved_psx"))

# Kline config
KLINE_TIMEFRAMES = [
    tf.strip() for tf in os.getenv("KLINE_TIMEFRAMES", "1m").split(",") if tf.strip()
]
KLINE_SAVE_DIR = Path(os.getenv("KLINE_SAVE_DIR", str(SAVE_DIR / "klines")))

# CSV field order - matches direct.py and NestJS backend exactly
CSV_HEADERS = [
    "timestamp_ms", "iso_time", "symbol", "market", "st", "price", "change",
    "changePercent", "volume", "trades", "value", "high", "low", "bid", "ask",
    "bidVol", "askVol",
]

KLINE_CSV_HEADERS = [
    "timestamp_ms", "iso_time", "symbol", "market", "timeframe",
    "open", "high", "low", "close", "volume", "quoteVolume", "trades",
]

# ============================================================================
# Market Hours (PKT = UTC+5)
# ============================================================================

MARKET_OPEN_HOUR = int(os.getenv("MARKET_OPEN_HOUR", 8))
MARKET_OPEN_MINUTE = int(os.getenv("MARKET_OPEN_MINUTE", 50))
MARKET_CLOSE_HOUR = int(os.getenv("MARKET_CLOSE_HOUR", 16))
MARKET_CLOSE_MINUTE = int(os.getenv("MARKET_CLOSE_MINUTE", 0))
FRIDAY_CLOSE_HOUR = int(os.getenv("FRIDAY_CLOSE_HOUR", 17))
FRIDAY_CLOSE_MINUTE = int(os.getenv("FRIDAY_CLOSE_MINUTE", 40))
MARKET_DAYS = {0, 1, 2, 3, 4}  # Mon-Fri
RESPECT_MARKET_HOURS = os.getenv("RESPECT_MARKET_HOURS", "true").lower() == "true"
MARKET_CHECK_INTERVAL = 60


def get_pkt_now():
    return datetime.now(TIMEZONE)


def is_market_open():
    """Check if PSX market is open. Returns (is_open, reason, seconds_until_open)."""
    if not RESPECT_MARKET_HOURS:
        return True, None, None

    now = get_pkt_now()
    wd = now.weekday()
    cur = now.hour * 60 + now.minute
    open_at = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE

    if wd not in MARKET_DAYS:
        days = (7 - wd) % 7 or 7
        target = now.replace(
            hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE,
            second=0, microsecond=0
        ) + timedelta(days=days)
        return False, "Weekend (day=%d)" % wd, max(int((target - now).total_seconds()), 0)

    if wd == 4:
        close_at = FRIDAY_CLOSE_HOUR * 60 + FRIDAY_CLOSE_MINUTE
    else:
        close_at = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE

    if cur < open_at:
        return False, "Before market open", (open_at - cur) * 60

    if cur >= close_at:
        days = 3 if wd == 4 else 1
        target = now.replace(
            hour=MARKET_OPEN_HOUR, minute=MARKET_OPEN_MINUTE,
            second=0, microsecond=0
        ) + timedelta(days=days)
        return False, "After market close", max(int((target - now).total_seconds()), 0)

    return True, None, None

# ============================================================================
# Helpers
# ============================================================================

def clamp(v, default=0):
    """Return v if non-None/non-empty, else default."""
    if v is None:
        return default
    if isinstance(v, str) and v.strip() == "":
        return default
    return v


def decode_ws_payload(kind, data):
    """Decode payload forwarded from browser WebSocket monkey-patch."""
    if kind == "binary":
        raw = base64.b64decode(data)
        return msgpack.unpackb(raw, raw=False)
    if kind == "text":
        try:
            return json.loads(data)
        except Exception:
            return data
    return data

# ============================================================================
# Redis Client  (async ZSET + PubSub - identical to direct.py)
# ============================================================================

_redis_client = None
_symbol_day_cache = {}


async def get_redis():
    global _redis_client
    if not REDIS_URL:
        return None
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            REDIS_URL, encoding="utf-8", decode_responses=True
        )
        try:
            await _redis_client.ping()
            logger.info("Connected to Redis: %s", REDIS_URL)
        except Exception as e:
            logger.error("Redis connection failed: %s", e)
            _redis_client = None
            return None
    return _redis_client


async def close_redis():
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
        finally:
            _redis_client = None


async def push_tick_to_redis(symbol, market, row):
    """Write tick to Redis ZSET + publish to PubSub."""
    client = await get_redis()
    if client is None:
        return

    payload = dict(zip(CSV_HEADERS, row))
    payload.setdefault("symbol", symbol)
    payload.setdefault("market", market)

    ts = payload.get("timestamp_ms", 0)
    try:
        ts_int = int(ts)
    except Exception:
        ts_int = 0

    if ts_int <= 0:
        timestamp_ms = int(time.time() * 1000)
    else:
        timestamp_ms = ts_int * 1000 if ts_int < 10**12 else ts_int

    payload["timestamp_ms"] = timestamp_ms
    key = REDIS_KEY_TEMPLATE.format(symbol=symbol, market=market)

    try:
        data = json.dumps(payload, ensure_ascii=False)

        # Daily boundary: clear ZSET when day rolls over (Asia/Karachi)
        day_key = datetime.fromtimestamp(
            timestamp_ms / 1000, tz=TIMEZONE
        ).date().isoformat()
        last_day = _symbol_day_cache.get(symbol)
        if last_day and last_day != day_key:
            try:
                await client.delete(key)
            except Exception:
                pass
        _symbol_day_cache[symbol] = day_key

        pipe = client.pipeline(transaction=False)
        pipe.zadd(key, {data: timestamp_ms})
        pipe.set(SIM_ACTIVE_DAY_KEY, day_key)

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
        logger.error("[redis] Failed to write tick for %s: %s", symbol, exc)

# ============================================================================
# CSV Writers
# ============================================================================

def ensure_dirs():
    SAVE_DIR.mkdir(parents=True, exist_ok=True)
    KLINE_SAVE_DIR.mkdir(parents=True, exist_ok=True)


def daily_csv_path(symbol):
    today = datetime.now(TIMEZONE).date().isoformat()
    return SAVE_DIR / ("%s_%s.csv" % (today, symbol))


def ensure_csv_header(symbol):
    p = daily_csv_path(symbol)
    if (not p.exists()) or p.stat().st_size == 0:
        with p.open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(CSV_HEADERS)


_csv_header_cache = set()


def write_tick_csv(symbol, market, tick):
    """Write tick to CSV and return the row list (for Redis push)."""
    t_ms = clamp(tick.get("t"), 0)
    try:
        t_int = int(t_ms)
        if t_int < 10**12 and t_int > 0:
            t_int = t_int * 1000
    except Exception:
        t_int = int(time.time() * 1000)

    try:
        iso_time = datetime.fromtimestamp(
            t_int / 1000, tz=timezone.utc
        ).astimezone(TIMEZONE).isoformat()
    except Exception:
        iso_time = datetime.now(TIMEZONE).isoformat()

    row = [
        t_int,                              # timestamp_ms
        iso_time,                           # iso_time
        clamp(tick.get("s"), symbol),       # symbol
        clamp(tick.get("m"), market),       # market
        clamp(tick.get("st"), ""),          # st
        clamp(tick.get("c"), 0),            # price
        clamp(tick.get("ch"), 0),           # change
        clamp(tick.get("pch"), 0),          # changePercent
        clamp(tick.get("v"), 0),            # volume
        clamp(tick.get("tr"), 0),           # trades
        clamp(tick.get("val"), 0),          # value
        clamp(tick.get("h"), 0),            # high
        clamp(tick.get("l"), 0),            # low
        clamp(tick.get("bp"), 0),           # bid
        clamp(tick.get("ap"), 0),           # ask
        clamp(tick.get("bv"), 0),           # bidVol
        clamp(tick.get("av"), 0),           # askVol
    ]

    cache_key = "%s:%s" % (symbol, datetime.now(TIMEZONE).date().isoformat())
    if cache_key not in _csv_header_cache:
        ensure_csv_header(symbol)
        _csv_header_cache.add(cache_key)

    with daily_csv_path(symbol).open("a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(row)

    return row


def write_kline_csv(symbol, market, timeframe, kline):
    """Write a kline candle to its own daily CSV."""
    t_ms = kline.get("timestamp", 0)
    try:
        t_int = int(t_ms)
        if t_int < 10**12 and t_int > 0:
            t_int = t_int * 1000
    except Exception:
        t_int = int(time.time() * 1000)

    try:
        iso_time = datetime.fromtimestamp(
            t_int / 1000, tz=timezone.utc
        ).astimezone(TIMEZONE).isoformat()
    except Exception:
        iso_time = datetime.now(TIMEZONE).isoformat()

    today = datetime.now(TIMEZONE).date().isoformat()
    kline_path = KLINE_SAVE_DIR / ("%s_%s_%s.csv" % (today, symbol, timeframe))

    if not kline_path.exists() or kline_path.stat().st_size == 0:
        with kline_path.open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(KLINE_CSV_HEADERS)

    row = [
        t_int,
        iso_time,
        symbol,
        market,
        timeframe,
        clamp(kline.get("open"), 0),
        clamp(kline.get("high"), 0),
        clamp(kline.get("low"), 0),
        clamp(kline.get("close"), 0),
        clamp(kline.get("volume"), 0),
        clamp(kline.get("quoteVolume"), 0),
        clamp(kline.get("trades"), 0),
    ]

    with kline_path.open("a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow(row)

# ============================================================================
# WebSocket Shard - browser-authorized WSS capture
# ============================================================================

MAX_SUBS_PER_WS = int(os.getenv("MAX_SUBS_PER_WS", "18"))

BROWSER_WS_PATCH = r"""
(() => {
  if (window.__psxPatchInstalled) return;
  window.__psxPatchInstalled = true;
  window.__psx_ws_sockets = [];

  const NativeWebSocket = window.WebSocket;

  async function blobToBase64(blob) {
    const buf = await blob.arrayBuffer();
    return arrayBufferToBase64(buf);
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function forwardToPython(kind, data, url) {
    if (typeof window.__psxFrame === 'function') {
      window.__psxFrame({ kind, data, url }).catch(() => {});
    }
  }

  window.WebSocket = function(url, protocols) {
    const ws = protocols ? new NativeWebSocket(url, protocols) : new NativeWebSocket(url);
    ws.binaryType = 'arraybuffer';
    window.__psx_ws_sockets.push(ws);

    ws.addEventListener('open', () => {
      forwardToPython('open', String(url), String(url));
    });

    ws.addEventListener('message', async (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          forwardToPython('binary', arrayBufferToBase64(event.data), String(url));
        } else if (event.data instanceof Blob) {
          forwardToPython('binary', await blobToBase64(event.data), String(url));
        } else {
          forwardToPython('text', String(event.data), String(url));
        }
      } catch (e) {
        forwardToPython('decodeError', String(e && e.stack || e), String(url));
      }
    });

    ws.addEventListener('close', (ev) => {
      forwardToPython('close', JSON.stringify({ code: ev.code, reason: ev.reason }), String(url));
    });

    ws.addEventListener('error', () => {
      forwardToPython('error', 'websocket error', String(url));
    });

    return ws;
  };

  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = NativeWebSocket.CONNECTING;
  window.WebSocket.OPEN = NativeWebSocket.OPEN;
  window.WebSocket.CLOSING = NativeWebSocket.CLOSING;
  window.WebSocket.CLOSED = NativeWebSocket.CLOSED;

  window.__psxWsReady = () => window.__psx_ws_sockets.some(ws => ws.readyState === NativeWebSocket.OPEN);
  window.__psxWsSend = (obj) => {
    const ws = window.__psx_ws_sockets.find(ws => ws.readyState === NativeWebSocket.OPEN);
    if (!ws) return false;
    ws.send(JSON.stringify(obj));
    return true;
  };
})();
"""


class WSShard:
    """A single browser WebSocket connection handling marketData and/or kline subscriptions."""

    def __init__(self, shard_id, market_subs, kline_symbols,
                 kline_timeframes, allowed_symbols):
        self.id = shard_id
        self.market_subs = market_subs
        self.kline_symbols = kline_symbols
        self.kline_timeframes = kline_timeframes
        self.allowed_symbols = allowed_symbols
        self._stop = asyncio.Event()
        self.connected = False
        self.total_ticks = 0
        self.total_klines = 0
        self._queue = asyncio.Queue(maxsize=20000)
        self._ws_lost = asyncio.Event()
        self._ws_lost_reason = ""
        self.page = None
        self.browser = None
        self.playwright = None

    @property
    def sub_count(self):
        return len(self.market_subs) + len(self.kline_symbols) * len(self.kline_timeframes)

    async def run(self):
        backoff = 1
        while not self._stop.is_set():
            try:
                await self._run_browser_ws()
                backoff = 1
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error("[shard %d] Error: %s", self.id, repr(e))
            finally:
                self.connected = False
                await self._close_browser()

            if self._stop.is_set():
                break

            wait = min(backoff, 30)
            logger.warning("[shard %d] Reconnecting in %ds...", self.id, wait)
            await asyncio.sleep(wait)
            backoff = min(backoff * 2, 30)

    async def _run_browser_ws(self):
        logger.info("[shard %d] Launching headless browser: %s", self.id, PSX_BOOTSTRAP_URL)
        self._ws_lost.clear()
        self._ws_lost_reason = ""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=HEADLESS,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-background-networking",
            ],
        )
        context = await self.browser.new_context(user_agent=USER_AGENT)
        self.page = await context.new_page()

        async def frame_binding(source, payload):
            # Keep this very small; process frames in the shard queue.
            try:
                kind = payload.get("kind")
                if kind in ("binary", "text"):
                    data = decode_ws_payload(kind, payload.get("data"))
                    await self._queue.put(data)
                elif kind == "open":
                    self.connected = True
                    logger.info("[shard %d] Browser WS opened: %s", self.id, payload.get("data"))
                elif kind == "close":
                    self.connected = False
                    self._ws_lost_reason = "Browser WebSocket closed: %s" % payload.get("data")
                    self._ws_lost.set()
                    logger.warning("[shard %d] Browser WS closed: %s", self.id, payload.get("data"))
                elif kind == "error":
                    self.connected = False
                    self._ws_lost_reason = "Browser WebSocket error: %s" % payload.get("data")
                    self._ws_lost.set()
                    logger.warning("[shard %d] Browser WS error: %s", self.id, payload.get("data"))
                elif kind == "decodeError":
                    logger.warning("[shard %d] Browser decode error: %s", self.id, payload.get("data"))
            except Exception as exc:
                logger.error("[shard %d] frame_binding failed: %s", self.id, exc)

        await self.page.expose_binding("__psxFrame", frame_binding)
        await self.page.add_init_script(BROWSER_WS_PATCH)
        await self.page.goto(PSX_BOOTSTRAP_URL, wait_until="domcontentloaded")

        try:
            await self.page.wait_for_function("window.__psxWsReady && window.__psxWsReady()", timeout=20000)
        except Exception:
            raise RuntimeError("Timed out waiting for PSXTerminal browser WebSocket")

        logger.info("[shard %d] Connected. Sending custom subscriptions...", self.id)
        await self._subscribe_all()
        await self._listen()

    async def _close_browser(self):
        try:
            if self.browser:
                await self.browser.close()
        except Exception:
            pass
        try:
            if self.playwright:
                await self.playwright.stop()
        except Exception:
            pass
        self.browser = None
        self.playwright = None
        self.page = None

    async def _send_json(self, obj):
        if not self.page:
            return False
        ok = await self.page.evaluate("obj => window.__psxWsSend && window.__psxWsSend(obj)", obj)
        if not ok:
            raise ConnectionError("No open browser WebSocket available for send")
        return True

    async def _subscribe_all(self):
        """Subscribe to market-level marketData + per-symbol kline streams."""
        req_id = 1
        n_kline = len(self.kline_symbols) * len(self.kline_timeframes)
        total = len(self.market_subs) + n_kline
        logger.info(
            "[shard %d] Subscribing: %d marketData + %d kline = %d custom subs",
            self.id, len(self.market_subs), n_kline, total,
        )

        for mkt in self.market_subs:
            req = {
                "type": "subscribe",
                "subscriptionType": "marketData",
                "params": {"marketType": mkt},
                "requestId": "mkt-%d-%03d" % (self.id, req_id),
            }
            await self._send_json(req)
            req_id += 1
            await asyncio.sleep(0.05)

        for sym in self.kline_symbols:
            for tf in self.kline_timeframes:
                req = {
                    "type": "subscribe",
                    "subscriptionType": "kline",
                    "params": {"symbol": sym, "timeframe": tf, "latest": False},
                    "requestId": "kl-%d-%03d" % (self.id, req_id),
                }
                await self._send_json(req)
                req_id += 1
                await asyncio.sleep(0.05)

    async def _handle_decoded(self, data):
        if not isinstance(data, dict):
            return

        t = data.get("type")

        if t == "ping":
            # Application-level ping from MessagePack frame. Reply as JSON pong.
            await self._send_json({
                "type": "pong",
                "timestamp": data.get("timestamp"),
            })
            return

        if t == "subscribeResponse":
            status = data.get("status")
            key = data.get("subscriptionKey", "")
            if status == "success":
                logger.debug("[shard %d] Sub OK: %s", self.id, key)
            else:
                logger.warning("[shard %d] Sub FAILED: %s", self.id, data)
            return

        if t == "error":
            logger.error("[shard %d] Server error: %s", self.id, data)
            return

        if t == "tickUpdate":
            await self._handle_tick(data)
            return

        if t == "kline":
            await self._handle_kline(data)
            return

    async def _handle_tick(self, data):
        symbol = data.get("symbol") or (data.get("tick") or {}).get("s")
        market = (
            data.get("market")
            or (data.get("tick") or {}).get("m")
            or (self.market_subs[0] if self.market_subs else "REG")
        )
        tick = data.get("tick", {})

        if not symbol:
            return

        if symbol.upper() not in self.allowed_symbols:
            return

        ensure_csv_header(symbol)
        row = write_tick_csv(symbol, market, tick)
        await push_tick_to_redis(symbol, market, row)
        self.total_ticks += 1

    async def _handle_kline(self, data):
        symbol = data.get("symbol", "")
        timeframe = data.get("timeframe", "1m")
        kline_list = data.get("data", [])
        market = self.market_subs[0] if self.market_subs else "REG"

        for kline in kline_list:
            write_kline_csv(symbol, kline.get("market", market), timeframe, kline)
            self.total_klines += 1

    async def _listen(self):
        while not self._stop.is_set():
            if self._ws_lost.is_set():
                raise ConnectionError(self._ws_lost_reason or "Browser WebSocket disconnected")
            try:
                data = await asyncio.wait_for(self._queue.get(), timeout=2.0)
                await self._handle_decoded(data)
            except asyncio.TimeoutError:
                if self._ws_lost.is_set():
                    raise ConnectionError(self._ws_lost_reason or "Browser WebSocket disconnected")
                if self.page and self.page.is_closed():
                    raise ConnectionError("Browser page closed")
                continue

    async def close(self):
        self._stop.set()
        self._ws_lost.set()
        await self._close_browser()

# ============================================================================
# Main Collector  (orchestrator + market hours + health)
# ============================================================================

class PSXWSSCollector:
    """Top-level orchestrator for all shards."""

    def __init__(self):
        self.shards: List[WSShard] = []
        self._stop_event = asyncio.Event()
        self._build_shards()

    def _build_shards(self):
        """Build shards using market-level subscriptions + per-symbol kline subs."""
        all_symbols = SYMBOLS + IDX_SYMBOLS
        allowed = set(s.upper() for s in all_symbols)

        markets = []
        seen_markets = set()
        for symbols, m in [(SYMBOLS, MARKET), (IDX_SYMBOLS, IDX_MARKET)]:
            if symbols and m not in seen_markets:
                markets.append(m)
                seen_markets.add(m)

        kline_targets = list(all_symbols)
        n_kline_tf = max(len(KLINE_TIMEFRAMES), 1)

        kline_slots_shard1 = max((MAX_SUBS_PER_WS - len(markets)) // n_kline_tf, 0)
        shard1_klines = kline_targets[:kline_slots_shard1]
        remaining = kline_targets[kline_slots_shard1:]

        shard_id = 1
        self.shards.append(WSShard(
            shard_id, markets, shard1_klines, KLINE_TIMEFRAMES, allowed,
        ))
        shard_id += 1

        klines_per_shard = max(MAX_SUBS_PER_WS // n_kline_tf, 1)
        for i in range(0, len(remaining), klines_per_shard):
            grp = remaining[i : i + klines_per_shard]
            self.shards.append(WSShard(
                shard_id, [], grp, KLINE_TIMEFRAMES, allowed,
            ))
            shard_id += 1

        if not self.shards:
            raise SystemExit("No symbols configured!")

        total_conns = len(self.shards)
        if total_conns > 5:
            logger.warning(
                "WARNING: %d browser connections needed. "
                "Reduce symbols, kline timeframes, or increase MAX_SUBS_PER_WS carefully.",
                total_conns,
            )

    async def start(self):
        logger.info("=" * 70)
        logger.info("PSX WebSocket Collector (Playwright Headless + MessagePack)")
        logger.info("=" * 70)
        logger.info("Stocks:  %d   Indices: %d", len(SYMBOLS), len(IDX_SYMBOLS))
        logger.info("Shards:  %d", len(self.shards))
        logger.info("Klines:  %s", KLINE_TIMEFRAMES)
        logger.info("Redis:   %s", REDIS_URL)
        logger.info("  Key:   %s", REDIS_KEY_TEMPLATE)
        logger.info("  PubSub:%s", REDIS_PUBSUB_CHANNEL)
        logger.info("CSV dir: %s", SAVE_DIR)
        logger.info("Bootstrap URL: %s", PSX_BOOTSTRAP_URL)
        logger.info("Headless: %s", HEADLESS)
        logger.info("Market hours: %s", RESPECT_MARKET_HOURS)
        if RESPECT_MARKET_HOURS:
            logger.info(
                "  Mon-Thu: %d:%02d - %d:%02d PKT",
                MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
                MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE,
            )
            logger.info(
                "  Friday:  %d:%02d - %d:%02d PKT",
                MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE,
                FRIDAY_CLOSE_HOUR, FRIDAY_CLOSE_MINUTE,
            )
        logger.info("=" * 70)

        ensure_dirs()

        client = await get_redis()
        if client is None:
            logger.error("Cannot connect to Redis! Exiting...")
            return

        await self._wait_for_market_open()

        for s in self.shards:
            mkt_label = ",".join(s.market_subs) if s.market_subs else "kline-only"
            kl_label = ", ".join(s.kline_symbols) if s.kline_symbols else "(none)"
            logger.info(
                "Shard %d: marketData=[%s] kline=[%s] (%d custom subs)",
                s.id, mkt_label, kl_label, s.sub_count,
            )

        shard_tasks = [
            asyncio.create_task(s.run(), name="shard-%d" % s.id)
            for s in self.shards
        ]
        health_task = asyncio.create_task(self._health_monitor())
        stats_task = asyncio.create_task(self._stats_reporter())
        market_task = asyncio.create_task(self._market_hours_watcher())

        loop = asyncio.get_running_loop()
        try:
            for sig in (signal.SIGINT, signal.SIGTERM):
                loop.add_signal_handler(
                    sig, lambda s=sig: asyncio.create_task(self.shutdown(s))
                )
        except NotImplementedError:
            pass

        try:
            await self._stop_event.wait()
        except asyncio.CancelledError:
            pass

        logger.info("Shutting down...")
        await asyncio.gather(*(s.close() for s in self.shards), return_exceptions=True)
        for t in shard_tasks + [health_task, stats_task, market_task]:
            t.cancel()
        await asyncio.sleep(0.2)
        await close_redis()
        logger.info("Shutdown complete")

    async def shutdown(self, sig=None):
        if sig:
            logger.info("Received %s, shutting down...", getattr(sig, "name", sig))
        self._stop_event.set()

    async def _wait_for_market_open(self):
        """Block (with watchdog heartbeat) until market opens."""
        while True:
            is_open, reason, secs = is_market_open()
            if is_open:
                return
            if secs and secs > 0:
                hrs = secs // 3600
                mins = (secs % 3600) // 60
                logger.info(
                    "Market closed (%s). Opens in ~%dh %dm. Sleeping...",
                    reason, hrs, mins,
                )
                while secs > 0 and not is_market_open()[0]:
                    chunk = min(secs, MARKET_CHECK_INTERVAL)
                    notify_systemd("WATCHDOG=1")
                    await asyncio.sleep(chunk)
                    secs -= chunk
            else:
                notify_systemd("WATCHDOG=1")
                await asyncio.sleep(MARKET_CHECK_INTERVAL)

    async def _market_hours_watcher(self):
        """Pause shards outside market hours, restart when market opens."""
        while not self._stop_event.is_set():
            await asyncio.sleep(MARKET_CHECK_INTERVAL)
            open_now, reason, _ = is_market_open()
            if not open_now:
                logger.info("Market closed (%s). Pausing shards...", reason)
                await asyncio.gather(*(s.close() for s in self.shards), return_exceptions=True)
                await self._wait_for_market_open()
                logger.info("Market re-opened. Restarting shards...")
                for s in self.shards:
                    s._stop.clear()
                    s.connected = False
                    asyncio.create_task(s.run(), name="shard-%d" % s.id)

    async def _health_monitor(self):
        """Watchdog heartbeat + shard connectivity check.

        If every shard stays disconnected for ALL_DOWN_RESTART_THRESHOLD seconds,
        exit non-zero so systemd restarts the service and forces a fresh session.
        Per-shard reconnect loops sometimes get stuck on a stale session that only
        a process restart clears.
        """
        HEALTH_INTERVAL = 5
        ALL_DOWN_RESTART_THRESHOLD = _parse_int(
            os.getenv("ALL_DOWN_RESTART_THRESHOLD"), 60
        )  # seconds
        WATCHDOG_INTERVAL = 30
        all_down_since = None
        last_watchdog = 0.0
        while not self._stop_event.is_set():
            await asyncio.sleep(HEALTH_INTERVAL)
            now = time.monotonic()
            if now - last_watchdog >= WATCHDOG_INTERVAL:
                notify_systemd("WATCHDOG=1")
                last_watchdog = now

            total = len(self.shards)
            down = sum(1 for s in self.shards if not s.connected)
            if down:
                logger.warning(
                    "[HEALTH] %d/%d shards disconnected", down, total
                )

            if total > 0 and down == total:
                if all_down_since is None:
                    all_down_since = now
                    logger.error(
                        "[HEALTH] DISCONNECTED - all %d shards down. "
                        "Will exit for systemd restart in %ds if not recovered.",
                        total, ALL_DOWN_RESTART_THRESHOLD,
                    )
                elif now - all_down_since >= ALL_DOWN_RESTART_THRESHOLD:
                    logger.error(
                        "[HEALTH] DISCONNECTED for %.0fs - exiting so systemd "
                        "restarts the service for a fresh session.",
                        now - all_down_since,
                    )
                    notify_systemd("STATUS=DISCONNECTED - exiting for restart")
                    os._exit(1)
            elif all_down_since is not None:
                logger.info("[HEALTH] Shard(s) recovered; auto-restart cancelled")
                all_down_since = None

    async def _stats_reporter(self):
        """Log tick + kline totals every 60 seconds."""
        while not self._stop_event.is_set():
            await asyncio.sleep(60)
            ticks = sum(s.total_ticks for s in self.shards)
            klines = sum(s.total_klines for s in self.shards)
            logger.info("[STATS] Ticks: %d  Klines: %d", ticks, klines)

# ============================================================================
# Entry Point
# ============================================================================

def main():
    try:
        collector = PSXWSSCollector()
    except SystemExit as e:
        print(e, file=sys.stderr)
        sys.exit(1)

    try:
        asyncio.run(collector.start())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")


if __name__ == "__main__":
    main()
