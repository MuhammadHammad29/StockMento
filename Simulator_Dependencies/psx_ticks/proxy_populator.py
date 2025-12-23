#!/usr/bin/env python3
# /opt/psx_ticks/proxy_populator.py
"""
Proxy populator/validator (append mode)
- Fetch lists, validate (HTTPS + WS welcome), and APPEND new good proxies
  to working_proxies.json (deduped, blacklist-aware).
"""

import asyncio, json, os
from pathlib import Path
from typing import List, Set
import aiohttp

BASE_DIR = Path(os.getenv("PSX_BASE_DIR", "."))
BASE_DIR.mkdir(parents=True, exist_ok=True)
WORKING_FILE = BASE_DIR / "working_proxies.json"
BLACKLIST_FILE = BASE_DIR / "proxy_blacklist.json"
LOCAL_FILE = BASE_DIR / "proxies.local"

WS_TEST_URL = "wss://psxterminal.com/"
REST_TEST_URL = "https://psxterminal.com/api/status"

SOURCES = [
    "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
    "https://www.proxy-list.download/api/v1/get?type=http",
]

CONCURRENT_VALIDATORS = 30
CONNECT_TIMEOUT = 12

def _load_json(path: Path, default):
    try: return json.loads(path.read_text())
    except Exception: return default

def _save_json_atomic(path: Path, data):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2))
    tmp.replace(path)

def normalize_line_to_proxy(line: str) -> str:
    line = line.strip()
    if not line: return ""
    if line.startswith(("http://","https://")):
        return line
    if line.lower().startswith(("socks4://","socks5://","socks://")):
        return ""
    if ":" in line:
        return "http://" + line
    return ""

async def fetch_text(session: aiohttp.ClientSession, url: str) -> str:
    try:
        async with session.get(url, timeout=15) as r:
            return await r.text()
    except Exception:
        return ""

async def gather_candidates() -> List[str]:
    out = []
    timeout = aiohttp.ClientTimeout(total=25)
    async with aiohttp.ClientSession(timeout=timeout) as s:
        texts = await asyncio.gather(*[fetch_text(s, u) for u in SOURCES])
    for content in texts:
        if not content: continue
        for ln in content.splitlines():
            p = normalize_line_to_proxy(ln)
            if p: out.append(p)
    if LOCAL_FILE.exists():
        for ln in LOCAL_FILE.read_text().splitlines():
            p = normalize_line_to_proxy(ln)
            if p: out.append(p)
    # preserve order but dedupe
    seen, deduped = set(), []
    for p in out:
        if p not in seen:
            seen.add(p); deduped.append(p)
    return deduped

async def test_proxy(proxy: str) -> bool:
    # 1) HTTPS preflight
    try:
        t1 = aiohttp.ClientTimeout(total=10, sock_connect=8)
        async with aiohttp.ClientSession(timeout=t1) as s:
            async with s.get(REST_TEST_URL, proxy=proxy) as r:
                if r.status != 200: return False
                js = await r.json()
                if js.get("status") != "ok": return False
    except Exception:
        return False
    # 2) WebSocket welcome (with Origin)
    try:
        t2 = aiohttp.ClientTimeout(sock_connect=CONNECT_TIMEOUT, total=CONNECT_TIMEOUT+6)
        async with aiohttp.ClientSession(timeout=t2) as s:
            async with s.ws_connect(
                WS_TEST_URL,
                proxy=proxy,
                headers={"Origin": "https://psxterminal.com"},
                autoping=False,
                heartbeat=None,
            ) as ws:
                msg = await ws.receive(timeout=5)
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        j = json.loads(msg.data)
                        if j.get("type") == "welcome":
                            await ws.close()
                            return True
                    except Exception:
                        pass
                await ws.close()
                return False
    except Exception:
        return False

async def main():
    # Load existing & blacklist
    existing: List[str] = _load_json(WORKING_FILE, [])
    black: Set[str] = set(_load_json(BLACKLIST_FILE, {}).keys())
    print(f"Existing working proxies: {len(existing)}; blacklisted: {len(black)}")

    candidates = await gather_candidates()
    print(f"Fetched {len(candidates)} candidates")

    # Filter out existing + blacklisted
    todo = [p for p in candidates if p not in black and p not in existing]
    print(f"Testing {len(todo)} new candidates")

    sem = asyncio.Semaphore(CONCURRENT_VALIDATORS)
    results: List[str] = []

    async def worker(p: str):
        async with sem:
            ok = await test_proxy(p)
            print(("[OK] " if ok else "[BAD] ") + p)
            if ok: results.append(p)

    await asyncio.gather(*[worker(p) for p in todo])

    # Append to end, keep original order + new goods at the tail
    if results:
        updated = existing + results
        _save_json_atomic(WORKING_FILE, updated)
        print(f"Appended {len(results)} proxies; total now {len(updated)}")
    else:
        print("No new working proxies found")

if __name__ == "__main__":
    asyncio.run(main())
