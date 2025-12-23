#!/usr/bin/env python3
import json, os, subprocess, sys, time, threading, signal
from pathlib import Path
from typing import List, Dict

BASE_DIR = Path(__file__).resolve().parent
WORKING_FILE = BASE_DIR / "working_proxies.json"
BLACKLIST_FILE = BASE_DIR / "proxy_blacklist.json"
COLLECTOR = BASE_DIR / "psx_ticks_ws.py"
PY_BIN = Path(os.getenv("PYTHON_BIN", sys.executable))
MIN_RUN_SECONDS = 12
RELOAD_INTERVAL = 300

child_proc: subprocess.Popen | None = None
stop_flag = False

def load_working() -> List[str]:
    try: return json.loads(WORKING_FILE.read_text())
    except Exception: return []

def load_blacklist() -> Dict[str, float]:
    if BLACKLIST_FILE.exists():
        try: return json.loads(BLACKLIST_FILE.read_text())
        except Exception: return {}
    return {}

def save_blacklist(bd: Dict[str, float]):
    BLACKLIST_FILE.write_text(json.dumps(bd, indent=2))

def stream_output(proc: subprocess.Popen):
    for line in iter(proc.stdout.readline, b""):
        try:
            sys.stdout.write(line.decode(errors="replace"))
            sys.stdout.flush()
        except Exception:
            pass

def start_collector_with_proxies(proxies: list[str]):
    global child_proc
    cmd = [str(PY_BIN), "-u", str(COLLECTOR), "--proxies", ",".join(proxies)]
    print(f"Starting collector with proxies {proxies}: {' '.join(cmd)}")
    child_proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = threading.Thread(target=stream_output, args=(child_proc,), daemon=True)
    t.start()
    return child_proc

def choose_n(working: list[str], black: dict, n: int) -> list[str]:
    chosen = []
    for p in working:
        if p not in black:
            chosen.append(p)
            if len(chosen) == n: break
    if not chosen and working:
        chosen = working[:n]
    return chosen

def handle_term(signum, frame):
    """Propagate SIGTERM/SIGINT to the child, wait briefly, then exit cleanly."""
    global stop_flag, child_proc
    stop_flag = True
    print(f"Launcher received signal {signum}; stopping child...")
    try:
        if child_proc and child_proc.poll() is None:
            child_proc.terminate()  # SIGTERM
            # give it up to 12s to exit cleanly
            for _ in range(12):
                if child_proc.poll() is not None: break
                time.sleep(1)
            if child_proc.poll() is None:
                print("Child still running; sending SIGKILL")
                child_proc.kill()
    except Exception as e:
        print("Error terminating child:", e)
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_term)
signal.signal(signal.SIGINT, handle_term)

def main_loop():
    global child_proc
    if not COLLECTOR.exists():
        print("Collector script not found:", COLLECTOR); sys.exit(1)

    black = load_blacklist()
    last_reload = 0

    while not stop_flag:
        # reload working proxies periodically
        if time.time() - last_reload > RELOAD_INTERVAL:
            working = load_working(); last_reload = time.time()
            if not working:
                print("No working proxies found; sleeping 60s then reloading...")
                time.sleep(60); continue
        else:
            working = load_working()
            if not working:
                print("No working proxies in file; sleeping 60s...")
                time.sleep(60); continue

        proxies = choose_n(working, black, 2)
        if not proxies:
            print("No proxy available, sleeping 60s..."); time.sleep(60); continue

        start_time = time.time()
        proc = start_collector_with_proxies(proxies)

        try:
            while not stop_flag:
                ret = proc.poll()
                if ret is not None:
                    elapsed = time.time() - start_time
                    print(f"Collector exited with {ret} after {elapsed:.1f}s")
                    if elapsed < MIN_RUN_SECONDS:
                        for p in proxies:
                            print(f"Blacklisting proxy {p} (quick-fail)")
                            black[p] = time.time()
                        save_blacklist(black)
                    break
                time.sleep(1)
        except Exception as e:
            print("Launcher exception:", e)
            try:
                if proc.poll() is None: proc.terminate()
            except Exception: pass

        time.sleep(2)

if __name__ == "__main__":
    try:
        main_loop()
    except SystemExit:
        raise
    except KeyboardInterrupt:
        handle_term(signal.SIGINT, None)
