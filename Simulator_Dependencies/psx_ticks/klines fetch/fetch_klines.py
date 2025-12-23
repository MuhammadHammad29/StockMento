#!/usr/bin/env python3
"""Fetch PSX kline data and store per-day CSV files per timeframe."""

from __future__ import annotations

import argparse
import csv
import itertools
import json
import logging
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone, time as dtime
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Tuple, TextIO

import requests

BASE_URL = "https://psxterminal.com"
KLINE_ENDPOINT_TEMPLATE = BASE_URL + "/api/klines/{symbol}/{timeframe}"
MAX_LIMIT = 100
DEFAULT_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"]
TIMEFRAME_TO_MS = {
    "1m": 60_000,
    "5m": 5 * 60_000,
    "15m": 15 * 60_000,
    "1h": 60 * 60_000,
    "4h": 4 * 60 * 60_000,
    "1d": 24 * 60 * 60_000,
}
TIMEFRAME_FOLDER_NAMES = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "1h": "1hr",
    "4h": "4hr",
    "1d": "1day",
}


class ProxyRotator:
    """Rotate through proxies to spread requests."""

    def __init__(self, proxies: Iterable[str]) -> None:
        cleaned = [p.strip() for p in proxies if p.strip()]
        self._cycle: Optional[Iterator[str]] = itertools.cycle(cleaned) if cleaned else None
        self._size = len(cleaned)

    def get(self) -> Optional[Dict[str, str]]:
        if not self._cycle:
            return None
        proxy = next(self._cycle)
        return {"http": proxy, "https": proxy}

    def __len__(self) -> int:
        return self._size


@dataclass
class FetchStats:
    timeframe: str
    records: int = 0
    first_ts: Optional[int] = None
    last_ts: Optional[int] = None


def timeframe_interval_ms(timeframe: str) -> int:
    try:
        return TIMEFRAME_TO_MS[timeframe]
    except KeyError as exc:
        raise ValueError(f"Unsupported timeframe {timeframe!r}") from exc


def parse_iso_datetime(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        try:
            date_only = datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError as err:
            raise argparse.ArgumentTypeError(f"Invalid date/time value: {value}") from err
        dt = datetime.combine(date_only, dtime.min)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def datetime_to_ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def ms_to_utc_date(ms_timestamp: int) -> datetime.date:
    return datetime.fromtimestamp(ms_timestamp / 1000, tz=timezone.utc).date()


def load_proxies(single_proxy: Optional[str], proxy_file: Optional[Path]) -> ProxyRotator:
    proxies: List[str] = []
    if single_proxy:
        proxies.append(single_proxy)
    if proxy_file:
        proxies.extend(proxy_file.read_text().splitlines())
    return ProxyRotator(proxies)


def prepare_session(user_agent: Optional[str]) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "User-Agent": user_agent
            or "psx-klines-fetcher/1.0 (+https://psxterminal.com)",
        }
    )
    return session


def request_klines(
    session: requests.Session,
    symbol: str,
    timeframe: str,
    params: Dict[str, int],
    proxies: ProxyRotator,
    max_retries: int,
) -> Dict[str, object]:
    url = KLINE_ENDPOINT_TEMPLATE.format(symbol=symbol, timeframe=timeframe)
    last_error: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        proxy_cfg = proxies.get()
        try:
            response = session.get(
                url,
                params=params,
                proxies=proxy_cfg,
                timeout=30,
            )
            if response.status_code != 200:
                logging.warning(
                    "Non-200 response for %s %s attempt %s: status=%s body=%s",
                    symbol,
                    timeframe,
                    attempt,
                    response.status_code,
                    response.text[:200],
                )
            else:
                payload = response.json()
                if not payload.get("success", True):
                    message = payload.get("error") or json.dumps(payload)[:200]
                    logging.warning(
                        "API reported failure for %s %s attempt %s: %s",
                        symbol,
                        timeframe,
                        attempt,
                        message,
                    )
                    last_error = RuntimeError(message)
                    break
                return payload
        except (requests.RequestException, json.JSONDecodeError) as exc:
            last_error = exc
            logging.warning(
                "Request error for %s %s attempt %s via proxy %s: %s",
                symbol,
                timeframe,
                attempt,
                proxy_cfg.get("http") if proxy_cfg else "direct",
                exc,
            )
        sleep_seconds = min(2 ** attempt, 60)
        time.sleep(sleep_seconds)
    raise RuntimeError(f"Failed to fetch klines after {max_retries} attempts") from last_error


class DailyCSVWriter:
    """Write kline rows into per-day CSV files without reopening files repeatedly."""

    def __init__(self, base_dir: Path, symbol: str, timeframe: str) -> None:
        self._base_dir = base_dir
        self._symbol = symbol
        self._timeframe = timeframe
        self._handles: Dict[datetime.date, Tuple[csv.DictWriter, TextIO]] = {}
        tf_folder = TIMEFRAME_FOLDER_NAMES.get(timeframe, timeframe)
        self._dir = base_dir / symbol / tf_folder

    def write(self, record: Dict[str, object]) -> None:
        timestamp = record.get("timestamp")
        if timestamp is None:
            logging.debug("Skipping record without timestamp: %s", record)
            return
        date_key = ms_to_utc_date(int(timestamp))
        writer, _ = self._ensure_writer(date_key)
        writer.writerow(
            {
                "symbol": record.get("symbol", self._symbol),
                "timeframe": record.get("timeframe", self._timeframe),
                "timestamp": int(timestamp),
                "timestamp_iso": datetime.fromtimestamp(
                    int(timestamp) / 1000, tz=timezone.utc
                ).isoformat(),
                "open": record.get("open"),
                "high": record.get("high"),
                "low": record.get("low"),
                "close": record.get("close"),
                "volume": record.get("volume"),
            }
        )

    def close(self) -> None:
        for writer, handle in self._handles.values():
            handle.close()
        self._handles.clear()

    def _ensure_writer(
        self, date_key: datetime.date
    ) -> Tuple[csv.DictWriter, TextIO]:
        if date_key in self._handles:
            return self._handles[date_key]
        self._dir.mkdir(parents=True, exist_ok=True)
        file_path = self._dir / f"{date_key.isoformat()}.csv"
        handle: TextIO = open(file_path, "w", newline="", encoding="utf-8")
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "symbol",
                "timeframe",
                "timestamp",
                "timestamp_iso",
                "open",
                "high",
                "low",
                "close",
                "volume",
            ],
        )
        writer.writeheader()
        self._handles[date_key] = (writer, handle)
        return writer, handle


def iterate_kline_records(
    session: requests.Session,
    symbol: str,
    timeframe: str,
    start_ts: int,
    end_ts: int,
    proxies: ProxyRotator,
    max_retries: int,
) -> Iterator[Dict[str, object]]:
    params: Dict[str, int] = {"limit": MAX_LIMIT}
    interval_ms = timeframe_interval_ms(timeframe)
    seen_timestamps: set[int] = set()
    current_end = end_ts
    stagnation_guard = 0

    while current_end >= start_ts:
        params["end"] = current_end
        payload = request_klines(session, symbol, timeframe, params, proxies, max_retries)
        records = payload.get("data") or []

        if not isinstance(records, list) or not records:
            logging.info(
                "No records returned for %s %s ending at %s; stopping pagination.",
                symbol,
                timeframe,
                current_end,
            )
            break

        ordered = sorted(
            (r for r in records if isinstance(r, dict) and r.get("timestamp") is not None),
            key=lambda r: r["timestamp"],
        )

        if not ordered:
            logging.info("No valid records in payload for %s %s", symbol, timeframe)
            break

        batch_min_ts = int(ordered[0]["timestamp"])

        for record in ordered:
            ts = int(record["timestamp"])
            if ts in seen_timestamps:
                continue
            if ts < start_ts or ts > end_ts:
                continue
            seen_timestamps.add(ts)
            yield record

        if batch_min_ts < start_ts:
            break

        next_end = batch_min_ts - interval_ms
        # Prevent infinite loops when API keeps returning the same data.
        if next_end >= current_end:
            stagnation_guard += 1
            if stagnation_guard >= 3:
                logging.warning(
                    "Pagination stalled for %s %s at %s; aborting.",
                    symbol,
                    timeframe,
                    current_end,
                )
                break
            next_end = current_end - interval_ms
        else:
            stagnation_guard = 0

        current_end = next_end


def configure_logging(verbosity: int) -> None:
    level = logging.WARNING
    if verbosity == 1:
        level = logging.INFO
    elif verbosity >= 2:
        level = logging.DEBUG
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch PSX kline data and store per-day CSV files per timeframe.",
    )
    parser.add_argument("--symbol", required=True, help="Symbol to fetch (case-sensitive).")
    parser.add_argument(
        "--timeframes",
        nargs="+",
        default=DEFAULT_TIMEFRAMES,
        help="Timeframes to fetch (default: %(default)s).",
    )
    parser.add_argument(
        "--start-date",
        type=parse_iso_datetime,
        help="UTC start date/time (ISO format).",
    )
    parser.add_argument(
        "--from-start",
        action="store_true",
        help="Start from earliest available data (sets start timestamp to Unix epoch).",
    )
    parser.add_argument(
        "--end-date",
        type=parse_iso_datetime,
        help="UTC end date/time (ISO format). Defaults to current day - 1.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("klines_output"),
        help="Directory to store CSV files (default: %(default)s).",
    )
    parser.add_argument(
        "--proxy",
        help="Single proxy URL to use (applied to both HTTP and HTTPS).",
    )
    parser.add_argument(
        "--proxy-list",
        type=Path,
        help="Path to a file containing proxy URLs (one per line).",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=5,
        help="Maximum retries per request (default: %(default)s).",
    )
    parser.add_argument(
        "--user-agent",
        help="Override default User-Agent header.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        help="Increase logging verbosity (-v for INFO, -vv for DEBUG).",
    )
    return parser.parse_args(argv)


def determine_start_end(args: argparse.Namespace) -> Tuple[int, int]:
    utc_today = datetime.now(tz=timezone.utc).date()
    end_date = args.end_date.date() if args.end_date else utc_today - timedelta(days=1)
    end_dt = datetime.combine(end_date, dtime.max, tzinfo=timezone.utc)

    if args.from_start:
        start_dt = datetime.fromtimestamp(0, tz=timezone.utc)
    elif args.start_date:
        start_dt = args.start_date
    else:
        raise ValueError("Either --start-date or --from-start must be specified.")

    if start_dt > end_dt:
        raise ValueError("Start date must be on or before end date.")

    return datetime_to_ms(start_dt), datetime_to_ms(end_dt)


def fetch_timeframe_data(
    session: requests.Session,
    symbol: str,
    timeframe: str,
    start_ts: int,
    end_ts: int,
    proxies: ProxyRotator,
    max_retries: int,
    output_dir: Path,
) -> FetchStats:
    writer = DailyCSVWriter(output_dir, symbol, timeframe)
    stats = FetchStats(timeframe=timeframe)
    try:
        for record in iterate_kline_records(
            session, symbol, timeframe, start_ts, end_ts, proxies, max_retries
        ):
            timestamp = int(record["timestamp"])
            if stats.first_ts is None:
                stats.first_ts = timestamp
            stats.last_ts = timestamp
            stats.records += 1
            writer.write(record)
    finally:
        writer.close()
    return stats


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    configure_logging(args.verbose)
    proxies = load_proxies(args.proxy, args.proxy_list)
    if not proxies:
        logging.info("No proxies configured; requests will be sent directly.")
    else:
        logging.info("Loaded %s proxies for rotation.", len(proxies))

    session = prepare_session(args.user_agent)
    try:
        start_ts, end_ts = determine_start_end(args)
    except ValueError as exc:
        logging.error(exc)
        return 1

    available_timeframes = set(TIMEFRAME_TO_MS)
    requested_timeframes = []
    for tf in args.timeframes:
        if tf not in available_timeframes:
            logging.error("Unsupported timeframe %s", tf)
            return 1
        requested_timeframes.append(tf)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    summaries: List[FetchStats] = []

    for timeframe in requested_timeframes:
        logging.info("Fetching %s klines for %s", timeframe, args.symbol)
        try:
            stats = fetch_timeframe_data(
                session,
                args.symbol,
                timeframe,
                start_ts,
                end_ts,
                proxies,
                args.max_retries,
                args.output_dir,
            )
            summaries.append(stats)
        except Exception as exc:
            logging.error("Failed to fetch timeframe %s: %s", timeframe, exc)

    for stats in summaries:
        logging.info(
            "Timeframe %s: %s records (%s -> %s)",
            stats.timeframe,
            stats.records,
            stats.first_ts,
            stats.last_ts,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
