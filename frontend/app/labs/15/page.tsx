"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FlaskConical,
  RotateCcw,
  SkipForward,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import UserNavbar from "@/components/navigation/UserNavbar"
import { useAuth } from "@/lib/auth-context"
import { simulatorApi } from "@/lib/api"
import type { SimKlinePoint } from "@/lib/types"
import { PriceChart } from "@/components/simulator/PriceChart"
import { LabTimelineFailureDialog } from "@/components/lab-failure-dialog"

const LAB_SYMBOL = "MEBL"
const STARTING_CASH = 130_000
const PROFIT_TARGET = 8_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2022-02-07").getTime()
const LEAD_IN_DAYS = 40

// MACD parameters
const FAST_PERIOD = 12
const SLOW_PERIOD = 26
const SIGNAL_PERIOD = 9
const CROSSOVER_WINDOW = 2 // buy/sell within N days of crossover counts

// ── Types ──

type TaskKey =
  | "boughtBullishCross"
  | "soldBearishCross"
  | "profitableMacdTrade"
  | "multipleTrades"
  | "histogramConfirm"
  | "madeProfit"

type Tasks = Record<TaskKey, boolean>

type TradeRecord = {
  id: number
  side: "buy" | "sell"
  qty: number
  price: number
  dayIndex: number
  date: string
  pnl?: number
  signal: "bullish-x" | "bearish-x" | "none"
}

type MacdPoint = {
  macd: number
  signal: number
  histogram: number
}

const TASK_LABELS: Record<TaskKey, string> = {
  boughtBullishCross: `Buy within ${CROSSOVER_WINDOW} days of a bullish crossover`,
  soldBearishCross: `Sell within ${CROSSOVER_WINDOW} days of a bearish crossover`,
  profitableMacdTrade: "Complete a profitable MACD-guided round-trip",
  multipleTrades: "Complete 3 profitable MACD trades",
  histogramConfirm: "Buy when histogram is positive (momentum confirms)",
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "boughtBullishCross",
  "soldBearishCross",
  "profitableMacdTrade",
  "multipleTrades",
  "histogramConfirm",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 15: MACD Signal",
    body: `MACD (Moving Average Convergence Divergence) is one of the most popular momentum indicators. In this lab you'll trade ${LAB_SYMBOL} using MACD crossover signals. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "How MACD Works",
    body: `MACD is built from two Exponential Moving Averages (EMAs). The MACD line = ${FAST_PERIOD}-day EMA minus ${SLOW_PERIOD}-day EMA. When the fast EMA pulls ahead of the slow EMA, MACD turns positive — momentum is rising.`,
  },
  {
    title: "The Signal Line",
    body: `The signal line is a ${SIGNAL_PERIOD}-day EMA of the MACD line itself. It smooths out the MACD to reduce noise. Crossovers between MACD and its signal line generate buy and sell signals.`,
  },
  {
    title: "Crossover Signals",
    body: "Bullish crossover: MACD crosses ABOVE the signal line — momentum is turning up, consider buying. Bearish crossover: MACD crosses BELOW the signal line — momentum is fading, consider selling.",
  },
  {
    title: "The Histogram",
    body: "The histogram shows the gap between MACD and signal line. Green bars (positive) mean bullish momentum. Red bars (negative) mean bearish momentum. Taller bars = stronger momentum.",
  },
  {
    title: "Your Tasks",
    body: `Buy on bullish crossovers, sell on bearish crossovers, and complete 3 profitable MACD trades. Watch the histogram for momentum confirmation. Target: PKR ${PROFIT_TARGET.toLocaleString()} profit.`,
  },
]

// ── Helpers ──

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(ts))
}

function computeEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      sum += values[i]
      if (i === period - 1) {
        ema.push(sum / period)
      } else {
        ema.push(NaN)
      }
    } else {
      ema.push(values[i] * k + ema[i - 1] * (1 - k))
    }
  }
  return ema
}

function computeMacdSeries(klines: SimKlinePoint[]): MacdPoint[] {
  const closes = klines.map((k) => k.close)
  const fastEma = computeEma(closes, FAST_PERIOD)
  const slowEma = computeEma(closes, SLOW_PERIOD)

  // MACD line = fast EMA - slow EMA
  const macdLine: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN)
    } else {
      macdLine.push(fastEma[i] - slowEma[i])
    }
  }

  // Signal line = EMA of MACD line (skip NaN values)
  // Find first valid MACD index
  const firstValid = macdLine.findIndex((v) => !isNaN(v))
  const validMacd = macdLine.slice(firstValid)
  const signalRaw = computeEma(validMacd, SIGNAL_PERIOD)

  const result: MacdPoint[] = []
  for (let i = 0; i < closes.length; i++) {
    const mi = i - firstValid
    if (mi < 0 || isNaN(macdLine[i]) || mi >= signalRaw.length || isNaN(signalRaw[mi])) {
      result.push({ macd: NaN, signal: NaN, histogram: NaN })
    } else {
      const m = macdLine[i]
      const s = signalRaw[mi]
      result.push({ macd: m, signal: s, histogram: m - s })
    }
  }
  return result
}

// ── Shared components ──

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ["#22c55e", "#38bdf8", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"]
    const pieces: {
      x: number; y: number; w: number; h: number; color: string
      vx: number; vy: number; rot: number; vr: number; opacity: number
    }[] = []
    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height * -1,
        w: Math.random() * 8 + 4, h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.2, opacity: 1,
      })
    }
    let frame: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of pieces) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr
        if (p.y > canvas.height) p.opacity -= 0.02
        if (p.opacity <= 0) continue
        alive = true
        ctx.save(); ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (alive) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[100]" style={{ width: "100vw", height: "100vh" }} />
}

function GuideOverlay({ step, total, title, body, onNext, onSkip, onBack }: {
  step: number; total: number; title: string; body: string; onNext: () => void; onSkip: () => void; onBack: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Step {step + 1} of {total}</span>
          </div>
          <button onClick={onSkip} className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Skip guide</button>
          <div className="flex items-center gap-2">{step > 0 && (<Button size="sm" variant="outline" onClick={onBack} className="cursor-pointer"><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>)}<Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onNext}>
            {step < total - 1 ? (<>Next <ChevronRight className="ml-1 h-4 w-4" /></>) : "Let's go!"}
          </Button></div>
        </div>
      </div>
    </div>
  )
}

function CompletionDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-emerald-500/50 bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">MACD Master!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've mastered MACD crossover trading — using momentum shifts to time your entries and exits.
          MACD works best in trending markets. Combine it with RSI or volume analysis to filter out
          false signals in choppy, sideways conditions.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/labs"><Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">Back to Labs</Button></Link>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Keep Exploring</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──

export default function Lab15Page() {
  const { user, loading: authLoading } = useAuth()

  const [allKlines, setAllKlines] = useState<SimKlinePoint[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_CASH)
  const [holdings, setHoldings] = useState(0)
  const [avgCost, setAvgCost] = useState(0)
  const [realizedPnl, setRealizedPnl] = useState(0)
  const [quantity, setQuantity] = useState("100")
  const [chartMode, setChartMode] = useState<"area" | "candles">("candles")

  const [boughtOnBullish, setBoughtOnBullish] = useState(false)
  const [profitableTradeCount, setProfitableTradeCount] = useState(0)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    boughtBullishCross: false,
    soldBearishCross: false,
    profitableMacdTrade: false,
    multipleTrades: false,
    histogramConfirm: false,
    madeProfit: false,
  })
  const [guideStep, setGuideStep] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const completionShownRef = useRef(false)
  const resumeAppliedRef = useRef(false)

  const initialDayIndex = useMemo(() => {
    if (!allKlines.length) return 0
    return Math.min(LEAD_IN_DAYS, allKlines.length - 1)
  }, [allKlines])

  // Fetch data
  useEffect(() => {
    let active = true
    const load = async () => {
      setDataLoading(true); setDataError(null)
      try {
        const data = await simulatorApi.klines(LAB_SYMBOL, "1d")
        if (!active) return
        const filtered = data
          .filter((k) => Number.isFinite(k.timestamp) && Number.isFinite(k.close) && k.timestamp >= DATA_START_MS && k.timestamp <= DATA_CUTOFF_MS)
          .sort((a, b) => a.timestamp - b.timestamp)
        if (filtered.length < LEAD_IN_DAYS + 10) { setDataError("Not enough historical data."); return }
        setAllKlines(filtered)
        if (!resumeAppliedRef.current) {
          setCurrentDayIndex(Math.min(LEAD_IN_DAYS, filtered.length - 1))
        }
      } catch { if (active) setDataError("Failed to load historical data.") }
      finally { if (active) setDataLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [])

  const visibleKlines = useMemo(() => allKlines.slice(0, currentDayIndex + 1), [allKlines, currentDayIndex])
  const currentKline = visibleKlines[visibleKlines.length - 1] ?? null
  const currentPrice = currentKline?.close ?? 0
  const holdingsValue = holdings * currentPrice
  const totalEquity = cash + holdingsValue
  const unrealizedPnl = holdings > 0 ? (currentPrice - avgCost) * holdings : 0
  const profit = totalEquity - STARTING_CASH

  // ── MACD computation ──
  const macdSeries = useMemo(() => computeMacdSeries(allKlines), [allKlines])

  const currentMacd = useMemo<MacdPoint | null>(() => {
    if (currentDayIndex < 0 || currentDayIndex >= macdSeries.length) return null
    const pt = macdSeries[currentDayIndex]
    if (isNaN(pt.macd) || isNaN(pt.signal)) return null
    return pt
  }, [macdSeries, currentDayIndex])

  // Crossover detection: check if crossover happened in last N days
  const crossoverInfo = useMemo(() => {
    if (currentDayIndex < 1) return { type: "none" as const, daysSince: Infinity }

    for (let lookback = 0; lookback < CROSSOVER_WINDOW; lookback++) {
      const idx = currentDayIndex - lookback
      if (idx < 1 || idx >= macdSeries.length) continue
      const curr = macdSeries[idx]
      const prev = macdSeries[idx - 1]
      if (isNaN(curr.macd) || isNaN(curr.signal) || isNaN(prev.macd) || isNaN(prev.signal)) continue

      // Bullish: MACD crossed above signal
      if (prev.macd <= prev.signal && curr.macd > curr.signal) {
        return { type: "bullish" as const, daysSince: lookback }
      }
      // Bearish: MACD crossed below signal
      if (prev.macd >= prev.signal && curr.macd < curr.signal) {
        return { type: "bearish" as const, daysSince: lookback }
      }
    }
    return { type: "none" as const, daysSince: Infinity }
  }, [macdSeries, currentDayIndex])

  const isBullishWindow = crossoverInfo.type === "bullish"
  const isBearishWindow = crossoverInfo.type === "bearish"
  const histogramPositive = currentMacd ? currentMacd.histogram > 0 : false

  // Chart data
  const { chartData, candleData, volumeByTime } = useMemo(() => {
    const volMap: Record<string, number> = {}
    const candles = visibleKlines.map((k) => {
      const time = k.timestamp / 1000
      const vol = Number(k.volume ?? 0)
      if (Number.isFinite(vol)) volMap[String(Math.round(time * 1000))] = vol
      return { time, open: k.open, high: k.high, low: k.low, close: k.close }
    })
    const area = candles.map((c) => ({ time: c.time, value: c.close }))
    return { chartData: area, candleData: candles, volumeByTime: volMap }
  }, [visibleKlines])

  const dateLabel = currentKline ? formatDate(currentKline.timestamp) : "--"
  const daysRemaining = allKlines.length - 1 - currentDayIndex
  const progressPercent = allKlines.length ? Math.round((currentDayIndex / (allKlines.length - 1)) * 100) : 0

  // Task checks
  useEffect(() => {
    if (profit >= PROFIT_TARGET && !tasks.madeProfit) setTasks((prev) => ({ ...prev, madeProfit: true }))
  }, [profit, tasks.madeProfit])

  useEffect(() => {
    if (profitableTradeCount >= 1 && !tasks.profitableMacdTrade) setTasks((prev) => ({ ...prev, profitableMacdTrade: true }))
    if (profitableTradeCount >= 3 && !tasks.multipleTrades) setTasks((prev) => ({ ...prev, multipleTrades: true }))
  }, [profitableTradeCount, tasks.profitableMacdTrade, tasks.multipleTrades])

  const completedCount = TASK_ORDER.filter((k) => tasks[k]).length
  const allComplete = completedCount === TASK_ORDER.length
  const completedTaskKeys = useMemo(
    () => TASK_ORDER.filter((key) => tasks[key]),
    [tasks]
  )

  const labStateSnapshot = useMemo(
    () => ({
      currentDayIndex,
      cash,
      holdings,
      avgCost,
      realizedPnl,
      quantity,
      chartMode,
      trades,
      tasks,
      guideStep,
      completionShown: completionShownRef.current,
    }),
    [avgCost, cash, chartMode, currentDayIndex, guideStep, holdings, quantity, realizedPnl, tasks, trades]
  )

  const handleResume = useCallback((snapshot: Record<string, unknown>) => {
    resumeAppliedRef.current = true
    if (typeof snapshot.currentDayIndex === "number") setCurrentDayIndex(snapshot.currentDayIndex)
    if (typeof snapshot.cash === "number") setCash(snapshot.cash)
    if (snapshot.holdings !== undefined) setHoldings(snapshot.holdings as never)
    if (typeof snapshot.avgCost === "number") setAvgCost(snapshot.avgCost)
    if (typeof snapshot.realizedPnl === "number") setRealizedPnl(snapshot.realizedPnl)
    if (typeof snapshot.quantity === "string") setQuantity(snapshot.quantity)
    if (snapshot.chartMode === "area" || snapshot.chartMode === "candles") setChartMode(snapshot.chartMode)
    if (Array.isArray(snapshot.trades)) {
      setTrades(snapshot.trades as never[])
      tradeIdRef.current = Math.max(0, ...snapshot.trades.map((trade) => Number((trade as { id?: unknown }).id) || 0))
    }
    if (snapshot.tasks && typeof snapshot.tasks === "object") setTasks((prev) => ({ ...prev, ...(snapshot.tasks as Partial<Tasks>) }))
    if (typeof snapshot.guideStep === "number" || snapshot.guideStep === null) setGuideStep(snapshot.guideStep)
    completionShownRef.current = Boolean(snapshot.completionShown)
  }, [])


  useEffect(() => {
    if (allComplete && !completionShownRef.current) {
      completionShownRef.current = true
      setShowConfetti(true); setShowCompletion(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [allComplete])

  // ── Handlers ──

  const handleBuy = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || !currentPrice) return
    const cost = qty * currentPrice
    if (cost > cash) return
    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)

    let signal: "bullish-x" | "none" = "none"

    // Check bullish crossover window
    if (isBullishWindow) {
      signal = "bullish-x"
      setBoughtOnBullish(true)
      if (!tasks.boughtBullishCross) setTasks((prev) => ({ ...prev, boughtBullishCross: true }))
    }

    // Check histogram positive
    if (histogramPositive && !tasks.histogramConfirm) {
      setTasks((prev) => ({ ...prev, histogramConfirm: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", signal,
    }])
  }, [quantity, currentPrice, cash, holdings, isBullishWindow, histogramPositive, currentDayIndex, currentKline, tasks.boughtBullishCross, tasks.histogramConfirm])

  const handleSell = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || qty > holdings || !currentPrice) return
    const proceeds = qty * currentPrice
    const costBasis = qty * avgCost
    const tradePnl = proceeds - costBasis
    setRealizedPnl((prev) => prev + tradePnl)
    setCash((prev) => prev + proceeds)
    setHoldings((prev) => {
      const remaining = prev - qty
      if (remaining === 0) { setAvgCost(0) }
      return remaining
    })

    let signal: "bearish-x" | "none" = "none"

    // Check bearish crossover window
    if (isBearishWindow) {
      signal = "bearish-x"
      if (!tasks.soldBearishCross) setTasks((prev) => ({ ...prev, soldBearishCross: true }))
    }

    // Profitable MACD trade: bought on bullish, sold profitably
    if (boughtOnBullish && tradePnl > 0) {
      setProfitableTradeCount((prev) => prev + 1)
    }

    // Reset bought-on-bullish tracking when fully sold
    const remaining = holdings - qty
    if (remaining === 0) setBoughtOnBullish(false)

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, signal,
    }])
  }, [quantity, currentPrice, holdings, avgCost, isBearishWindow, boughtOnBullish, currentDayIndex, currentKline, tasks.soldBearishCross])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setBoughtOnBullish(false); setProfitableTradeCount(0)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      boughtBullishCross: false, soldBearishCross: false, profitableMacdTrade: false,
      multipleTrades: false, histogramConfirm: false, madeProfit: false,
    })
    setGuideStep(0); setShowConfetti(false); setShowCompletion(false)
    completionShownRef.current = false
    resumeAppliedRef.current = false
  }, [initialDayIndex])

  const fmt = (v: number, sign = false) => {
    const s = sign && v > 0 ? "+" : ""
    return `PKR ${s}${v.toFixed(2)}`
  }
  const pnlColor = (v: number) =>
    v > 0 ? "text-emerald-500 dark:text-emerald-400" : v < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"

  // Auth
  useEffect(() => {
    if (!authLoading && !user) window.location.replace("/signin")
  }, [authLoading, user])
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="text-sm text-muted-foreground">Loading...</div></div>
  if (!user) return null
  if (dataLoading) return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar />
      <main className="mx-auto max-w-6xl px-4 py-10 text-center">
        <FlaskConical className="mx-auto mb-4 h-8 w-8 animate-pulse text-emerald-500" />
        <p className="text-sm text-muted-foreground">Loading historical data for {LAB_SYMBOL}...</p>
      </main>
    </div>
  )
  if (dataError) return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border border-border/60 bg-card/90"><CardHeader><CardTitle>Lab Unavailable</CardTitle></CardHeader>
          <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{dataError}</p>
            <Link href="/labs"><Button variant="outline" className="cursor-pointer"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Labs</Button></Link>
          </CardContent>
        </Card>
      </main>
    </div>
  )

  const atEnd = currentDayIndex >= allKlines.length - 1

  // Histogram bar width (scale relative to max seen histogram)
  const maxHistAbs = macdSeries.slice(0, currentDayIndex + 1).reduce((max, pt) => {
    if (isNaN(pt.histogram)) return max
    return Math.max(max, Math.abs(pt.histogram))
  }, 0.01)
  const histBarPct = currentMacd ? Math.min(100, (Math.abs(currentMacd.histogram) / maxHistAbs) * 100) : 0

  // Recent crossover log (last 8 crossovers)
  const recentCrossovers = useMemo(() => {
    const xovers: { idx: number; type: "bullish" | "bearish"; date: string; price: number }[] = []
    for (let i = 1; i <= currentDayIndex && i < macdSeries.length; i++) {
      const curr = macdSeries[i]
      const prev = macdSeries[i - 1]
      if (isNaN(curr.macd) || isNaN(curr.signal) || isNaN(prev.macd) || isNaN(prev.signal)) continue
      if (prev.macd <= prev.signal && curr.macd > curr.signal) {
        xovers.push({ idx: i, type: "bullish", date: formatDate(allKlines[i].timestamp), price: allKlines[i].close })
      } else if (prev.macd >= prev.signal && curr.macd < curr.signal) {
        xovers.push({ idx: i, type: "bearish", date: formatDate(allKlines[i].timestamp), price: allKlines[i].close })
      }
    }
    return xovers.slice(-8)
  }, [macdSeries, allKlines, currentDayIndex])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar />
      {showConfetti && <Confetti />}
      {showCompletion && <CompletionDialog onClose={() => setShowCompletion(false)} />}
      <LabTimelineFailureDialog
        isTimelineFinished={currentDayIndex >= allKlines.length - 1}
        isComplete={allComplete}
        completedCount={completedCount}
        totalTasks={TASK_ORDER.length}
        completedTasks={completedTaskKeys}
        stateSnapshot={labStateSnapshot}
        onResume={handleResume}
        onFreshStart={() => setGuideStep(0)}
        onReset={handleReset}
      />
      {guideStep !== null && guideStep < GUIDE_STEPS.length && (
        <GuideOverlay step={guideStep} total={GUIDE_STEPS.length}
          title={GUIDE_STEPS[guideStep].title} body={GUIDE_STEPS[guideStep].body}
          onNext={() => { guideStep < GUIDE_STEPS.length - 1 ? setGuideStep(guideStep + 1) : setGuideStep(null) }}
          onBack={() => setGuideStep((s) => (s === null ? 0 : Math.max(0, s - 1)))} onSkip={() => setGuideStep(null)} />
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/labs" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lab 15: Trade a MACD Signal</h1>
              <p className="text-xs text-muted-foreground">{LAB_SYMBOL} &middot; {dateLabel} &middot; {daysRemaining} days remaining</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setGuideStep(0)} className="text-xs cursor-pointer">
              <FlaskConical className="mr-1 h-3.5 w-3.5" /> Restart Guide
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs cursor-pointer">
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset Lab
            </Button>
          </div>
        </div>

        {/* MACD Dashboard */}
        {currentMacd && (
          <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_1fr] gap-4 items-center">
              {/* MACD & Signal values */}
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-background/30 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Activity className="h-3 w-3" /> MACD Line
                  </div>
                  <div className={`text-sm font-semibold ${currentMacd.macd >= 0 ? "text-primary" : "text-red-600 dark:text-red-400"}`}>
                    {currentMacd.macd.toFixed(3)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background/30 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Signal Line
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {currentMacd.signal.toFixed(3)}
                  </div>
                </div>
              </div>

              {/* Histogram visualiser */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Histogram</span>
                  <span className={`font-semibold ${histogramPositive ? "text-primary" : "text-red-600 dark:text-red-400"}`}>
                    {currentMacd.histogram > 0 ? "+" : ""}{currentMacd.histogram.toFixed(3)}
                  </span>
                </div>
                {/* Histogram bar — centered at 50%, extends left (bearish) or right (bullish) */}
                <div className="relative h-8 rounded-lg overflow-hidden bg-muted/30 border border-border">
                  {/* Center line */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40 z-10" />
                  {/* Bar */}
                  {histogramPositive ? (
                    <div
                      className="absolute inset-y-1 rounded-r bg-emerald-500/70 dark:bg-emerald-500/50 transition-all duration-300"
                      style={{ left: "50%", width: `${histBarPct / 2}%` }}
                    />
                  ) : (
                    <div
                      className="absolute inset-y-1 rounded-l bg-red-500/70 dark:bg-red-500/50 transition-all duration-300"
                      style={{ right: "50%", width: `${histBarPct / 2}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                  <span className="text-red-600">Bearish</span>
                  <span>Zero Line</span>
                  <span className="text-emerald-600">Bullish</span>
                </div>
              </div>

              {/* Crossover signal */}
              <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                isBullishWindow
                  ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                  : isBearishWindow
                    ? "border-red-400/60 bg-red-50 dark:bg-red-900/20"
                    : "border-border bg-background/30"
              }`}>
                {isBullishWindow ? (
                  <>
                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      <ArrowUp className="h-3 w-3" /> Bullish Crossover
                    </div>
                    <div className="text-xs font-semibold text-primary mt-0.5">
                      MACD crossed above signal
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mt-1 animate-pulse">
                      BUY SIGNAL
                    </div>
                  </>
                ) : isBearishWindow ? (
                  <>
                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-red-700 dark:text-red-300">
                      <ArrowDown className="h-3 w-3" /> Bearish Crossover
                    </div>
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 mt-0.5">
                      MACD crossed below signal
                    </div>
                    <div className="text-[10px] font-bold text-red-700 dark:text-red-300 mt-1 animate-pulse">
                      SELL SIGNAL
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Activity className="h-3 w-3" /> Signal Status
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      No crossover
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Wait for signal...
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Timeline</span>
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span>{progressPercent}%</span>
        </div>

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* Chart */}
          <Card className="min-w-0 border border-border/60 bg-card/90">
            <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
              <CardTitle className="text-base text-foreground">{LAB_SYMBOL} Price</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant={chartMode === "area" ? "default" : "outline"} onClick={() => setChartMode("area")} className="h-7 px-2 text-xs">Line</Button>
                <Button size="sm" variant={chartMode === "candles" ? "default" : "outline"} onClick={() => setChartMode("candles")} className="h-7 px-2 text-xs">Candles</Button>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden" style={{ height: 380 }}>
              <PriceChart data={chartData} candles={candleData} volumeByTime={volumeByTime} viewMode={chartMode} lastPrice={currentPrice} height={380} timeMode="date" />
            </CardContent>
          </Card>

          {/* Trading Panel */}
          <div className="space-y-4">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="py-3">
                <CardTitle className="text-base text-foreground">Trade {LAB_SYMBOL}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Signal Alert */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  isBullishWindow ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20" :
                  isBearishWindow ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" :
                  "border-border bg-background/30"
                }`}>
                  {isBullishWindow ? (
                    <><TrendingUp className="h-4 w-4 text-emerald-500" /><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Bullish crossover — Buy signal active</span></>
                  ) : isBearishWindow ? (
                    <><TrendingDown className="h-4 w-4 text-red-500" /><span className="text-xs font-semibold text-red-700 dark:text-red-300">Bearish crossover — Sell signal active</span></>
                  ) : (
                    <><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">No active crossover — watch the MACD</span></>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Price</div>
                    <div className="text-sm font-semibold text-foreground">{currentPrice ? `PKR ${currentPrice.toFixed(2)}` : "--"}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cash</div>
                    <div className="text-sm font-semibold text-foreground">{fmt(cash)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Holdings</div>
                    <div className="text-sm font-semibold text-foreground">{holdings} shares</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">MACD Trades</div>
                    <div className="text-sm font-semibold text-foreground">{profitableTradeCount}/3</div>
                  </div>
                </div>

                {/* P&L */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-border bg-background/30 px-2 py-1.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Unrealized</div>
                    <div className={`text-xs font-semibold ${pnlColor(unrealizedPnl)}`}>{fmt(unrealizedPnl, true)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-2 py-1.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Realized</div>
                    <div className={`text-xs font-semibold ${pnlColor(realizedPnl)}`}>{fmt(realizedPnl, true)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-2 py-1.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total P&L</div>
                    <div className={`text-xs font-semibold ${pnlColor(profit)}`}>{fmt(profit, true)}</div>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Quantity</Label>
                  <Input className="bg-background/70 border-border text-foreground" type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
                </div>

                {/* Buy/Sell */}
                <div className="grid grid-cols-2 gap-2">
                  <Button className={`w-full cursor-pointer ${
                    isBullishWindow ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-emerald-400/50 animate-pulse" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`} onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}>
                    Buy{isBullishWindow ? " (MACD!)" : ""}
                  </Button>
                  <Button className={`w-full cursor-pointer ${
                    isBearishWindow ? "bg-red-600 hover:bg-red-500 ring-2 ring-red-400/50 animate-pulse" : "bg-red-600 hover:bg-red-500"
                  }`} onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    Sell{isBearishWindow ? " (MACD!)" : ""}
                  </Button>
                </div>

                {/* Equity */}
                <div className="rounded-md border border-emerald-400/60 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Equity</div>
                  <div className="text-base font-bold text-foreground">{fmt(totalEquity)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Skip */}
            <Card className="border border-border/60 bg-card/90">
              <CardContent className="py-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <SkipForward className="h-3.5 w-3.5" /> Time Skip
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(1)} disabled={atEnd}>+1 Day</Button>
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(5)} disabled={atEnd}>+1 Week</Button>
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(22)} disabled={atEnd}>+1 Month</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Crossover Log */}
        {recentCrossovers.length > 0 && (
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Crossover Log ({recentCrossovers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recentCrossovers.map((xo, i) => (
                  <div
                    key={i}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      xo.type === "bullish"
                        ? "border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-red-400/60 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                    }`}
                  >
                    {xo.type === "bullish" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {xo.date} @ PKR {xo.price.toFixed(1)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base text-foreground">Tasks ({completedCount}/{TASK_ORDER.length})</CardTitle>
            <Progress value={(completedCount / TASK_ORDER.length) * 100} className="h-2 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TASK_ORDER.map((key) => {
                const done = tasks[key]
                let label = TASK_LABELS[key]
                if (key === "multipleTrades") label = `Complete 3 profitable MACD trades (${profitableTradeCount}/3)`
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    done
                      ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-border bg-background/30 text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 flex-shrink-0" />}
                    <span className={done ? "line-through opacity-70" : ""}>{label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Trade History */}
        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-foreground">Trade History ({trades.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet. Watch the MACD dashboard for a bullish crossover signal.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-center p-1.5">Signal</th>
                      <th className="text-right p-1.5">Qty</th>
                      <th className="text-right p-1.5">Price</th>
                      <th className="text-right p-1.5">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trades].reverse().map((t) => (
                      <tr key={t.id} className="border-b border-border/40">
                        <td className="p-1.5 text-xs text-muted-foreground">{t.date}</td>
                        <td className="p-1.5"><span className={`text-xs font-semibold uppercase ${t.side === "buy" ? "text-emerald-500" : "text-red-500"}`}>{t.side}</span></td>
                        <td className="p-1.5 text-center">
                          {t.signal === "bullish-x" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <ArrowUp className="h-2.5 w-2.5" /> BULL-X
                            </span>
                          ) : t.signal === "bearish-x" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              <ArrowDown className="h-2.5 w-2.5" /> BEAR-X
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="p-1.5 text-right text-xs">{t.qty}</td>
                        <td className="p-1.5 text-right text-xs">{t.price.toFixed(2)}</td>
                        <td className={`p-1.5 text-right text-xs font-semibold ${t.pnl === undefined ? "text-muted-foreground" : pnlColor(t.pnl)}`}>
                          {t.pnl !== undefined ? fmt(t.pnl, true) : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
