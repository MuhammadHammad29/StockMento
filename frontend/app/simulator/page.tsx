"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import io, { Socket } from "socket.io-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Info, Lock } from "lucide-react"
import UserNavbar from "@/components/navigation/UserNavbar"
import { useAuth } from "@/lib/auth-context"
import { simulatorApi } from "@/lib/api"
import type { SimAccountStatusResponse, SimPortfolio, SimTick } from "@/lib/types"
import { PriceChart } from "@/components/simulator/PriceChart"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const MAX_TICKS = 15000

const DEFAULT_WATCHLIST = [
  "ATRL",
  "AVN",
  "DGKC",
  "EFERT",
  "ENGROH",
  "FABL",
  "FCCL",
  "FFL",
  "GAL",
  "GHNI",
  "HCAR",
  "HUBC",
  "LUCK",
  "MARI",
  "MEBL",
  "MLCF",
  "MTL",
  "NETSOL",
  "OCTOPUS",
  "OGDC",
  "PAEL",
  "PIOC",
  "PPL",
  "PRL",
  "PSO",
  "SAZEW",
  "SEARL",
  "SNGP",
  "SYS",
  "TOMCL",
]

type OrderForm = {
  symbol: string
  side: "buy" | "sell"
  orderType: "market" | "limit" | "stop_limit"
  quantity: number
  limitPrice?: number
  triggerPrice?: number
  stopLimitPrice?: number
}

export default function SimulatorPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [ticks, setTicks] = useState<SimTick[]>([])
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null)
  const [symbol, setSymbol] = useState("ATRL")
  const [watchlist, setWatchlist] = useState<Record<string, SimTick | null>>({})
  const [layoutMode, setLayoutMode] = useState<"split" | "stack">("split")
  const [dateRange, setDateRange] = useState<"15m" | "1d">("15m")
  const [dailyKlines, setDailyKlines] = useState<
    { timestamp: number; open: number; high: number; low: number; close: number; volume?: number }[]
  >([])
  const [klinesPending, setKlinesPending] = useState(false)
  const [form, setForm] = useState<OrderForm>({
    symbol: "ATRL",
    side: "buy",
    orderType: "market",
    quantity: 100,
  })
  const [chartMode, setChartMode] = useState<"area" | "candles">("area")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [accountStatus, setAccountStatus] = useState<SimAccountStatusResponse | null>(null)
  const [accountChecking, setAccountChecking] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [accountCheckNonce, setAccountCheckNonce] = useState(0)

  const formatCurrency = (value?: number | null, withSign = false) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "—"
    const fixed = value.toFixed(2)
    const sign = withSign && value > 0 ? "+" : ""
    return `PKR ${sign}${fixed}`
  }

  const formatVolume = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "—"
    return value.toLocaleString("en-US")
  }

  const pnlColor = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "text-slate-400"
    if (value > 0) return "text-emerald-400"
    if (value < 0) return "text-red-400"
    return "text-slate-300"
  }

  useEffect(() => {
    if (!user) {
      setAccountStatus(null)
      setAccountChecking(false)
      return
    }
    let active = true
    setAccountChecking(true)
    setAccountError(null)
    ;(async () => {
      try {
        const status = await simulatorApi.account()
        if (!active) return
        setAccountStatus(status)
      } catch (err) {
        console.error(err)
        if (active) {
          setAccountError("Unable to verify simulator access. Please try again.")
        }
      } finally {
        if (active) {
          setAccountChecking(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [user, accountCheckNonce])

  useEffect(() => {
    if (!user || !accountStatus?.hasAccount) return
    let socket: Socket | null = null
    const load = async () => {
      try {
        const data = await simulatorApi.start(symbol)
        setPortfolio(data.portfolio)
        setTicks((data.ticks ?? []).slice(-MAX_TICKS))
        setMessage(null)
        setError(null)
        const wl = await simulatorApi.tickers(DEFAULT_WATCHLIST.join(","))
        setWatchlist(wl)
      } catch (err) {
        console.error(err)
        setError("Unable to start simulator.")
      }
    }
    void load()

    socket = io(API_BASE_URL, { transports: ["websocket"] })
    socket.on("tick", (tick: SimTick) => {
      if (!tick?.symbol) return
      if (tick.symbol === symbol) {
        setTicks((prev) => {
          const next = [...prev, tick].slice(-MAX_TICKS)
          return next
        })
      }
      setWatchlist((prev) => {
        if (!(tick.symbol in prev)) return prev
        return { ...prev, [tick.symbol]: tick }
      })
    })
    return () => {
      socket?.disconnect()
    }
  }, [symbol, user, accountStatus?.hasAccount])

  const latestTick = useMemo(() => {
    const last = ticks[ticks.length - 1] ?? null
    if (last && last.symbol === symbol) return last
    return watchlist[symbol] ?? null
  }, [ticks, symbol, watchlist])

  const latestPrice = useMemo(() => {
    const price = latestTick?.price
    return Number.isFinite(price) ? price ?? null : null
  }, [latestTick])

  const latestVolume = useMemo(() => {
    const vol = latestTick?.volume ?? latestTick?.trades
    return Number.isFinite(vol) ? Number(vol) : null
  }, [latestTick])

  const latestBuyVolume = useMemo(() => {
    const vol = latestTick?.bidVol
    return Number.isFinite(vol) ? Number(vol) : null
  }, [latestTick])

  const latestSellVolume = useMemo(() => {
    const vol = latestTick?.askVol
    return Number.isFinite(vol) ? Number(vol) : null
  }, [latestTick])

  const marketDown = useMemo(() => {
    const entries = Object.values(watchlist).filter((t): t is SimTick => Boolean(t))
    if (!entries.length) return false
    return entries.every((t) => {
      const bidv = Number(t.bidVol ?? 0)
      const askv = Number(t.askVol ?? 0)
      return (!Number.isFinite(bidv) || bidv === 0) && (!Number.isFinite(askv) || askv === 0)
    })
  }, [watchlist])

  const ownedVolume = useMemo(() => {
    if (!portfolio) return 0
    const holding = portfolio.holdings.find((h) => h.symbol === symbol)
    return holding ? holding.quantity : 0
  }, [portfolio, symbol])

  // Chart + volume data
  const { chartData, candleData, volumeByTime } = useMemo(() => {
    if (dateRange === "1d" && dailyKlines.length) {
      const volumeMap: Record<string, number> = {}
      const candles = dailyKlines
        .map((k) => {
          const time = k.timestamp / 1000
          const vol = Number(k.volume ?? 0)
          if (Number.isFinite(vol)) {
            volumeMap[String(Math.round(time * 1000))] = vol
          }
          return {
            time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          }
        })
        .filter((c) => Number.isFinite(c.time))
        .sort((a, b) => a.time - b.time)
      const areaData = candles.map((c) => ({ time: c.time, value: c.close }))
      return { chartData: areaData, candleData: candles, volumeByTime: volumeMap }
    }

    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const sortedTicks = [...ticks].sort((a, b) => {
      const aTs = Number(a.timestamp_ms ?? 0)
      const bTs = Number(b.timestamp_ms ?? 0)
      return aTs - bTs
    })

    const recent = sortedTicks.filter((t) => {
      const ts = Number(t.timestamp_ms ?? 0)
      if (Number.isFinite(ts)) return ts >= cutoff
      const parsedIso = Date.parse(t.iso_time ?? "")
      return Number.isFinite(parsedIso) && parsedIso >= cutoff
    })

    const source = recent.length > 0 ? recent : sortedTicks
    const volumeMap: Record<string, number> = {}

    const areaData = source.map((t, idx) => {
      const tsMs = Number(t.timestamp_ms ?? 0)
      const baseTs = Number.isFinite(tsMs) ? tsMs : Date.parse(t.iso_time ?? "")
      const safeTs = Number.isFinite(baseTs) ? baseTs : Date.now()
      const time = safeTs / 1000 + idx * 0.001
      const vol = Number(t.volume ?? t.trades)
      if (Number.isFinite(vol)) {
        volumeMap[String(Math.round(time * 1000))] = vol
      }
      return {
        time,
        value: t.price,
      }
    })

    let prevPrice: number | null = null

    const candles = source
      .map((t, idx) => {
        const tsMs = Number(t.timestamp_ms ?? 0)
        const isoTs = Date.parse(t.iso_time ?? "")
        const baseTs = Number.isFinite(tsMs) ? tsMs : isoTs
        if (!Number.isFinite(baseTs) || baseTs < cutoff) return null
        const price = Number(t.price)
        if (!Number.isFinite(price)) return null

        const open = prevPrice ?? price
        const high = Math.max(open, price)
        const low = Math.min(open, price)
        prevPrice = price

        return {
          time: baseTs / 1000 + idx * 0.001,
          open,
          high,
          low,
          close: price,
        }
      })
      .filter((candle): candle is NonNullable<typeof candle> => Boolean(candle))

    return { chartData: areaData, candleData: candles, volumeByTime: volumeMap }
  }, [ticks, dateRange, dailyKlines])

  const holdingMetrics = useMemo(() => {
    if (!portfolio) return null
    const rows = portfolio.holdings.map((h) => {
      const livePrice = watchlist[h.symbol]?.price ?? (h.symbol === symbol ? latestPrice ?? null : null)
      const value = livePrice != null ? livePrice * h.quantity : null
      const pnl = value != null ? value - h.quantity * h.avgCostPrice : null
      return { ...h, livePrice, value, pnl }
    })
    const totalValue = rows.reduce((sum, row) => sum + (row.value ?? 0), 0)
    const totalPnl = rows.reduce((sum, row) => sum + (row.pnl ?? 0), 0)
    return { rows, totalValue, totalPnl }
  }, [portfolio, watchlist, symbol, latestPrice])

  const handlePlaceOrder = async () => {
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const payload: any = { ...form, quantity: Number(form.quantity) }
      if (form.orderType === "market") {
        payload.currentPrice = latestPrice ?? undefined
      }
      payload.buyVolume = latestBuyVolume ?? undefined
      payload.sellVolume = latestSellVolume ?? undefined
      const res = await simulatorApi.placeOrder(payload)
      const nextPortfolio = (res as any)?.portfolio ?? res
      if (nextPortfolio && typeof nextPortfolio === "object" && "holdings" in nextPortfolio) {
        setPortfolio(nextPortfolio as SimPortfolio)
        setMessage("Order placed.")
        toast.success("Order placed", { position: "top-right" })
      } else {
        const refreshed = await simulatorApi.start(symbol)
        setPortfolio(refreshed.portfolio)
        setTicks((refreshed.ticks ?? []).slice(-MAX_TICKS))
        setMessage("Order placed.")
        toast.success("Order placed", { position: "top-right" })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed")
      toast.error(err instanceof Error ? err.message : "Order failed", { position: "top-right" })
    } finally {
      setPending(false)
    }
  }

  const handleActivateSimulator = async () => {
    setActivating(true)
    setError(null)
    try {
      const data = await simulatorApi.start(symbol)
      setPortfolio(data.portfolio)
      setTicks((data.ticks ?? []).slice(-MAX_TICKS))
      const wl = await simulatorApi.tickers(DEFAULT_WATCHLIST.join(","))
      setWatchlist(wl)
      setAccountStatus({
        hasAccount: true,
        status: "active",
        activatedAt: new Date().toISOString(),
      })
      toast.success("Simulator activated", { position: "top-right" })
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to activate simulator", { position: "top-right" })
    } finally {
      setActivating(false)
    }
  }

  const handleRetryAccountCheck = () => {
    setAccountError(null)
    setAccountChecking(true)
    setAccountCheckNonce((n) => n + 1)
  }

  useEffect(() => {
    if (dateRange !== "1d") {
      setDailyKlines([])
      return
    }
    let active = true
    const load = async () => {
      setKlinesPending(true)
      try {
        const data = await simulatorApi.klines(symbol, "1d")
        if (!active) return
        const parsed =
          Array.isArray(data) && data.length
            ? data
                .map((d) => ({
                  timestamp: Number((d as any).timestamp ?? 0),
                  open: Number((d as any).open),
                  high: Number((d as any).high),
                  low: Number((d as any).low),
                  close: Number((d as any).close),
                  volume: Number((d as any).volume ?? 0),
                }))
                .filter((d) => Number.isFinite(d.timestamp) && Number.isFinite(d.close))
            : []
        setDailyKlines(parsed)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load 1D data", { position: "top-right" })
      } finally {
        if (active) setKlinesPending(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [dateRange, symbol])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading simulator…</div>
      </div>
    )
  }

  if (!user) {
    router.replace("/signin")
    return null
  }

  if (accountChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Checking simulator access…</div>
      </div>
    )
  }

  if (!accountChecking && accountError && !accountStatus) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <UserNavbar />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader>
              <CardTitle className="text-white">Simulator temporarily unavailable</CardTitle>
              <CardDescription className="text-slate-300">{accountError}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button onClick={handleRetryAccountCheck} className="bg-emerald-600 hover:bg-emerald-500">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (accountStatus && !accountStatus.hasAccount) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <UserNavbar />
        <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
                <Info className="h-5 w-5" />
                <span>PSX Simulator Overview</span>
              </div>
              <CardTitle className="text-white">Activate your day trading sandbox</CardTitle>
              <CardDescription className="text-slate-300">
                Practice orders with live Redis ticks. Review the checklist before enabling your training wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              <ul className="list-disc space-y-2 pl-5 text-slate-300">
                <li>Activation creates a PKR-denominated training wallet funded with virtual cash.</li>
                <li>Orders follow live PSX ticks—market halts pause executions automatically.</li>
                <li>Use limit/stop orders responsibly; depth follows real bid/ask volume.</li>
                <li>Your practice stats feed dashboards and learning streaks.</li>
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-400">You can reset or pause anytime by leaving the simulator.</span>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleActivateSimulator}
                  disabled={activating}
                >
                  {activating ? "Activating…" : "Activate simulator"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const layoutGrid = layoutMode === "split" ? "grid gap-4 lg:grid-cols-[1.6fr_1fr]" : "grid gap-4"
  const chartHeight = layoutMode === "stack" ? 420 : 320

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <UserNavbar />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Trading uses live Redis ticks. If halted, order placement will pause automatically.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">PSX Day Trading Simulator</h1>
              <p className="text-sm text-slate-400">Live market data streamed from Redis</p>
            </div>
            <div className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs">
              <button
                className={`rounded px-2 py-1 ${dateRange === "15m" ? "bg-slate-800 text-white" : "text-slate-400"}`}
                onClick={() => setDateRange("15m")}
              >
                15m
              </button>
              <button
                className={`rounded px-2 py-1 ${dateRange === "1d" ? "bg-slate-800 text-white" : "text-slate-400"}`}
                onClick={() => setDateRange("1d")}
              >
                1d
              </button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="text-right">
              <div className="text-slate-400">Selected Symbol</div>
              <div className="text-lg font-semibold text-white">{symbol}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900/70 text-xs text-slate-200"
                onClick={() => setLayoutMode((m) => (m === "split" ? "stack" : "split"))}
              >
                View: {layoutMode === "split" ? "Side by Side" : "Stacked (Big Chart)"}
              </Button>
              {klinesPending ? (
                <div className="text-[11px] text-slate-400">Loading {dateRange.toUpperCase()}…</div>
              ) : null}
              {marketDown ? (
                <div className="flex items-center gap-1 rounded border border-red-500/60 bg-red-950/50 px-2 py-1 text-[11px] font-semibold text-red-200">
                  <Lock size={12} />
                  <span>Market Halted</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {message ? <div className="text-sm text-emerald-400">{message}</div> : null}
        {error ? <div className="text-sm text-red-400">{error}</div> : null}

        <div className={layoutGrid}>
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-white">Price Action</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={chartMode === "area" ? "default" : "outline"}
                  onClick={() => setChartMode("area")}
                  className="px-3"
                >
                  Line
                </Button>
                <Button
                  size="sm"
                  variant={chartMode === "candles" ? "default" : "outline"}
                  onClick={() => setChartMode("candles")}
                  className="px-3"
                >
                  Candles
                </Button>
              </div>
            </CardHeader>
            <CardContent style={{ height: chartHeight }}>
              <PriceChart
                key={`${layoutMode}-${dateRange}-${chartMode}`}
                data={chartData}
                candles={candleData}
                volumeByTime={volumeByTime}
                viewMode={chartMode}
                lastPrice={latestPrice}
                height={chartHeight}
                timeMode={dateRange === "1d" ? "date" : "time"}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-white">Order Ticket</CardTitle>
              <CardDescription className="text-slate-400">Simulate trades instantly with the latest quote.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Last Price" value={latestPrice ?? undefined} highlight />
              <Row
                label="Last Volume"
                value={latestVolume ?? undefined}
                format={formatVolume}
              />
              <Row label="Buy Volume (Bid)" value={latestBuyVolume ?? undefined} format={formatVolume} />
              <Row label="Sell Volume (Ask)" value={latestSellVolume ?? undefined} format={formatVolume} />
              <Row label="Owned Volume" value={ownedVolume} />
              <Row label="Cash Balance" value={portfolio?.cashAvailable} />
              <Row label="Position Value" value={ownedVolume * (latestPrice ?? 0)} />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className={`w-full ${form.side === "buy" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-800"}`}
                  onClick={() => setForm((p) => ({ ...p, side: "buy" }))}
                >
                  Buy
                </Button>
                <Button
                  className={`w-full ${form.side === "sell" ? "bg-red-600 hover:bg-red-500" : "bg-slate-800"}`}
                  onClick={() => setForm((p) => ({ ...p, side: "sell" }))}
                >
                  Sell
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-slate-300">Order Type</Label>
                  <Select
                    value={form.orderType}
                    onValueChange={(value: OrderForm["orderType"]) => setForm((p) => ({ ...p, orderType: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                      <SelectItem value="stop_limit">Stop Limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Quantity</Label>
                  <Input
                    className="bg-slate-800 border-slate-700 text-white"
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-slate-300">Limit Price</Label>
                  <Input
                    className="bg-slate-800 border-slate-700 text-white"
                    type="number"
                    value={form.limitPrice ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, limitPrice: Number(e.target.value) }))}
                    disabled={form.orderType === "market"}
                    placeholder={latestPrice ? `≈ ${latestPrice}` : "PKR"}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Trigger Price</Label>
                  <Input
                    className="bg-slate-800 border-slate-700 text-white"
                    type="number"
                    value={form.triggerPrice ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, triggerPrice: Number(e.target.value) }))}
                    disabled={form.orderType !== "stop_limit"}
                  />
                </div>
              </div>
              {form.orderType === "stop_limit" ? (
                <div className="space-y-1">
                  <Label className="text-slate-300">Stop Limit Price</Label>
                  <Input
                    className="bg-slate-800 border-slate-700 text-white"
                    type="number"
                    value={form.stopLimitPrice ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, stopLimitPrice: Number(e.target.value) }))}
                  />
                </div>
              ) : null}

              <Button className="w-full bg-sky-600 hover:bg-sky-500" onClick={handlePlaceOrder} disabled={pending}>
                Place Order
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-white">Holdings</CardTitle>
              <CardDescription className="text-slate-400">Current positions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {holdingMetrics?.rows.length ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>Est. proceeds if sold now:</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-100">
                      {formatCurrency(holdingMetrics.totalValue)}
                    </span>
                    <span>Unrealized P/L:</span>
                    <span className={`rounded px-2 py-0.5 font-semibold ${pnlColor(holdingMetrics.totalPnl)}`}>
                      {formatCurrency(holdingMetrics.totalPnl, true)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="text-left p-2">Symbol</th>
                          <th className="text-left p-2">Qty</th>
                          <th className="text-left p-2">Avg Cost</th>
                          <th className="text-left p-2">Last</th>
                          <th className="text-left p-2">Est. Value</th>
                          <th className="text-left p-2">Unrealized P/L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdingMetrics.rows.map((h) => (
                          <tr key={h.symbol} className="border-b border-slate-800">
                            <td className="p-2">{h.symbol}</td>
                            <td className="p-2">{h.quantity}</td>
                            <td className="p-2">{formatCurrency(h.avgCostPrice)}</td>
                            <td className="p-2">{formatCurrency(h.livePrice)}</td>
                            <td className="p-2">{formatCurrency(h.value)}</td>
                            <td className={`p-2 ${pnlColor(h.pnl)}`}>{formatCurrency(h.pnl, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-sm">No holdings yet.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-white">Open Orders</CardTitle>
              <CardDescription className="text-slate-400">Working and partially filled orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {portfolio?.openOrders?.length ? (
                <div className="space-y-2">
                  {portfolio.openOrders.map((o) => (
                    <div key={o.id} className="rounded-lg border border-slate-800 p-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-white">{o.symbol}</div>
                        <Badge variant="outline" className="text-[10px]">
                          {o.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400">
                        {o.side.toUpperCase()} {o.quantity} ({o.filledQty} filled) · {o.orderType}
                      </div>
                      <div className="text-xs text-slate-500">
                        Limits: {o.limitPrice ?? "-"} | Trigger: {o.triggerPrice ?? "-"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-sm">No open orders.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {DEFAULT_WATCHLIST.map((item) => {
            const tick = watchlist[item] ?? null
            const price = tick?.price ?? null
            const change = tick?.change ?? null
            const changePct = tick?.changePercent ?? null
            const up = change !== null && change >= 0
            return (
              <button
                key={item}
                className={`rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-emerald-500/70 ${
                  item === symbol ? "border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]" : ""
                }`}
                onClick={() => {
                  setSymbol(item)
                  setForm((p) => ({ ...p, symbol: item }))
                }}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{item}</span>
                  <Badge variant="outline" className="text-[10px]">
                    PSX
                  </Badge>
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {price !== null ? `PKR ${price.toFixed(2)}` : "—"}
                </div>
                <div className={`text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
                  {change !== null ? `${up ? "+" : ""}${change.toFixed(2)}` : "—"}{" "}
                  {changePct !== null ? `(${up ? "+" : ""}${changePct.toFixed(2)}%)` : ""}
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
  format,
}: {
  label: string
  value?: number
  highlight?: boolean
  format?: (value?: number) => string
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-2 ${
        highlight ? "border-emerald-400/60 bg-emerald-900/30" : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white">
        {value !== undefined ? (format ? format(value) : value.toFixed(2)) : "—"}
      </span>
    </div>
  )
}
