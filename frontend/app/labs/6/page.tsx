"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FlaskConical,
  RotateCcw,
  SkipForward,
  X,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
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
const STARTING_CASH = 120_000
const PROFIT_TARGET = 6_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const LEAD_IN_DAYS = 60
const RSI_PERIOD = 14
const OVERBOUGHT = 70
const OVERSOLD = 30
const GOOD_BUYS_TARGET = 3
const TOTAL_TRADES_TARGET = 4

// ── Types ──

type TaskKey =
  | "boughtBelowOB"
  | "avoidedOverbought"
  | "goodBuys"
  | "soldOverbought"
  | "completedTrades"
  | "madeProfit"

type Tasks = Record<TaskKey, boolean>

type TradeRecord = {
  id: number
  side: "buy" | "sell"
  qty: number
  price: number
  rsi: number | null
  dayIndex: number
  date: string
  pnl?: number
  overbought: boolean
}

const TASK_LABELS: Record<TaskKey, string> = {
  boughtBelowOB: "Buy when RSI is below 70 (not overbought)",
  avoidedOverbought: "Resist buying during an RSI > 70 period (skip past it)",
  goodBuys: `Make ${GOOD_BUYS_TARGET} purchases with RSI < 70`,
  soldOverbought: "Sell while RSI > 70 (sell the hype)",
  completedTrades: `Complete ${TOTAL_TRADES_TARGET} total trades (buys + sells)`,
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "boughtBelowOB",
  "avoidedOverbought",
  "goodBuys",
  "soldOverbought",
  "completedTrades",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 6: Avoid the Overbought Trap",
    body: `The RSI (Relative Strength Index) measures momentum on a 0–100 scale. In this lab you'll learn to use RSI to avoid buying at peaks. You start with PKR ${STARTING_CASH.toLocaleString()} trading ${LAB_SYMBOL}.`,
  },
  {
    title: "What is RSI?",
    body: `RSI compares recent gains to recent losses over ${RSI_PERIOD} days. A high RSI (above ${OVERBOUGHT}) means the stock is "overbought" — it has risen fast and may be due for a pullback. A low RSI (below ${OVERSOLD}) means it's "oversold" — it may bounce.`,
  },
  {
    title: "The Overbought Trap",
    body: `When a stock is surging and RSI > ${OVERBOUGHT}, FOMO kicks in and novice traders buy at the top. Smart traders wait for RSI to cool down before entering. The red warning banner will alert you when the stock is overbought.`,
  },
  {
    title: "Strategy: Buy Low RSI, Sell High RSI",
    body: `Buy when RSI is below ${OVERBOUGHT} (ideally near ${OVERSOLD}). Sell when RSI climbs above ${OVERBOUGHT} to lock in profits. This way you're buying when momentum is building and selling when it's overextended.`,
  },
  {
    title: "Your Tasks",
    body: `Complete all 6 tasks: buy with RSI < 70, skip past an overbought period without buying, make ${GOOD_BUYS_TARGET} good entries, sell during overbought, complete ${TOTAL_TRADES_TARGET} trades, and hit your profit target!`,
  },
]

// ── Helpers ──

function computeRSI(klines: SimKlinePoint[], endIndex: number, period: number): number | null {
  if (endIndex < period) return null
  let gains = 0
  let losses = 0
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    const diff = klines[i].close - klines[i - 1].close
    if (diff > 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(ts))
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
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * -1,
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Lab Complete!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've learned to use RSI to avoid overbought traps! You bought when momentum was
          building (RSI &lt; 70) and sold when the stock was overextended (RSI &gt; 70).
          This discipline separates profitable traders from impulsive ones.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/labs"><Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">Back to Labs</Button></Link>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Keep Exploring</Button>
        </div>
      </div>
    </div>
  )
}

// ── RSI Gauge ──

function RSIGauge({ rsi }: { rsi: number | null }) {
  if (rsi === null) return <div className="text-xs text-muted-foreground">RSI: calculating...</div>

  const clampedRsi = Math.max(0, Math.min(100, rsi))
  const isOverbought = rsi >= OVERBOUGHT
  const isOversold = rsi <= OVERSOLD

  const color = isOverbought
    ? "text-red-600 dark:text-red-400"
    : isOversold
      ? "text-primary"
      : "text-foreground"

  const bgColor = isOverbought
    ? "bg-red-500"
    : isOversold
      ? "bg-emerald-500"
      : "bg-amber-500"

  const label = isOverbought ? "OVERBOUGHT" : isOversold ? "OVERSOLD" : "NEUTRAL"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">RSI ({RSI_PERIOD})</span>
        <span className={`text-sm font-bold ${color}`}>{rsi.toFixed(1)}</span>
      </div>
      {/* RSI bar */}
      <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
        {/* Zones */}
        <div className="absolute inset-y-0 left-0 bg-emerald-200/50 dark:bg-emerald-800/30" style={{ width: `${OVERSOLD}%` }} />
        <div className="absolute inset-y-0 right-0 bg-red-200/50 dark:bg-red-800/30" style={{ width: `${100 - OVERBOUGHT}%` }} />
        {/* Pointer */}
        <div
          className={`absolute top-0 h-full w-2.5 rounded-full ${bgColor} shadow-sm transition-all duration-300`}
          style={{ left: `calc(${clampedRsi}% - 5px)` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>0 (Oversold)</span>
        <span className={`font-semibold ${color}`}>{label}</span>
        <span>100 (Overbought)</span>
      </div>
    </div>
  )
}

// ── Main ──

export default function Lab6Page() {
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

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)
  const [goodBuyCount, setGoodBuyCount] = useState(0)
  const [tradeCount, setTradeCount] = useState(0)

  // Track overbought avoidance: if we skip past an overbought period without buying
  const [sawOverbought, setSawOverbought] = useState(false)
  const [boughtDuringOB, setBoughtDuringOB] = useState(false)

  const [tasks, setTasks] = useState<Tasks>({
    boughtBelowOB: false,
    avoidedOverbought: false,
    goodBuys: false,
    soldOverbought: false,
    completedTrades: false,
    madeProfit: false,
  })
  const [guideStep, setGuideStep] = useState<number | null>(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const completionShownRef = useRef(false)

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
          .filter((k) => Number.isFinite(k.timestamp) && Number.isFinite(k.close) && k.timestamp <= DATA_CUTOFF_MS)
          .sort((a, b) => a.timestamp - b.timestamp)
        if (filtered.length < LEAD_IN_DAYS + 10) { setDataError("Not enough historical data."); return }
        setAllKlines(filtered)
        setCurrentDayIndex(Math.min(LEAD_IN_DAYS, filtered.length - 1))
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

  // RSI
  const currentRSI = useMemo(() => computeRSI(allKlines, currentDayIndex, RSI_PERIOD), [allKlines, currentDayIndex])
  const isOverbought = currentRSI !== null && currentRSI >= OVERBOUGHT
  const isOversold = currentRSI !== null && currentRSI <= OVERSOLD

  // Track seeing overbought (for avoidance task)
  useEffect(() => {
    if (isOverbought) setSawOverbought(true)
  }, [isOverbought])

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

  // ── Task checks ──
  useEffect(() => {
    if (profit >= PROFIT_TARGET && !tasks.madeProfit)
      setTasks((prev) => ({ ...prev, madeProfit: true }))
  }, [profit, tasks.madeProfit])

  useEffect(() => {
    if (goodBuyCount >= GOOD_BUYS_TARGET && !tasks.goodBuys)
      setTasks((prev) => ({ ...prev, goodBuys: true }))
  }, [goodBuyCount, tasks.goodBuys])

  useEffect(() => {
    if (tradeCount >= TOTAL_TRADES_TARGET && !tasks.completedTrades)
      setTasks((prev) => ({ ...prev, completedTrades: true }))
  }, [tradeCount, tasks.completedTrades])

  const completedCount = TASK_ORDER.filter((k) => tasks[k]).length
  const allComplete = completedCount === TASK_ORDER.length

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
    setTradeCount((prev) => prev + 1)

    const ob = isOverbought
    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, rsi: currentRSI,
      dayIndex: currentDayIndex, date: currentKline ? formatDate(currentKline.timestamp) : "--",
      overbought: ob,
    }])

    if (!ob) {
      // Good buy (RSI < 70)
      if (!tasks.boughtBelowOB) setTasks((prev) => ({ ...prev, boughtBelowOB: true }))
      setGoodBuyCount((prev) => prev + 1)
    } else {
      // Bought during overbought
      setBoughtDuringOB(true)
    }
  }, [quantity, currentPrice, cash, holdings, currentDayIndex, currentKline, currentRSI, isOverbought, tasks.boughtBelowOB])

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
      if (remaining === 0) setAvgCost(0)
      return remaining
    })
    setTradeCount((prev) => prev + 1)

    const ob = isOverbought
    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, rsi: currentRSI,
      dayIndex: currentDayIndex, date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, overbought: ob,
    }])

    // Task: sold while overbought
    if (ob && !tasks.soldOverbought)
      setTasks((prev) => ({ ...prev, soldOverbought: true }))
  }, [quantity, currentPrice, holdings, avgCost, currentDayIndex, currentKline, currentRSI, isOverbought, tasks.soldOverbought])

  const handleSkip = useCallback((days: number) => {
    const prevIndex = currentDayIndex

    // Check if we saw overbought and DIDN'T buy during it → avoidance task
    if (sawOverbought && !boughtDuringOB && !tasks.avoidedOverbought) {
      // Only count if RSI has now cooled below overbought (we skipped past it)
      const nextIndex = Math.min(currentDayIndex + days, allKlines.length - 1)
      const nextRSI = computeRSI(allKlines, nextIndex, RSI_PERIOD)
      if (nextRSI !== null && nextRSI < OVERBOUGHT) {
        setTasks((prev) => ({ ...prev, avoidedOverbought: true }))
      }
    }

    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))

    // Reset OB tracking for next period
    if (!isOverbought) {
      setSawOverbought(false)
      setBoughtDuringOB(false)
    }
  }, [currentDayIndex, allKlines, sawOverbought, boughtDuringOB, isOverbought, tasks.avoidedOverbought])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setCurrentDayIndex(initialDayIndex)
    setTrades([]); tradeIdRef.current = 0; setGoodBuyCount(0); setTradeCount(0)
    setSawOverbought(false); setBoughtDuringOB(false)
    setTasks({
      boughtBelowOB: false, avoidedOverbought: false, goodBuys: false,
      soldOverbought: false, completedTrades: false, madeProfit: false,
    })
    setGuideStep(0); setShowConfetti(false); setShowCompletion(false)
    completionShownRef.current = false
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
              <h1 className="text-2xl font-bold text-foreground">Lab 6: Avoid the Overbought Trap</h1>
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

        {/* Overbought warning banner */}
        {isOverbought && (
          <div className="flex items-center gap-3 rounded-lg border border-red-400/60 bg-red-50 px-4 py-3 dark:bg-red-900/20">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-300">
                RSI is {currentRSI?.toFixed(1)} — Stock is Overbought!
              </div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80">
                Avoid buying at this level. Consider selling to lock in profits, or skip forward and wait for RSI to cool down.
              </div>
            </div>
          </div>
        )}

        {/* Oversold opportunity banner */}
        {isOversold && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-400/60 bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
            <TrendingUp className="h-5 w-5 flex-shrink-0 text-primary" />
            <div>
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                RSI is {currentRSI?.toFixed(1)} — Potential Buying Opportunity
              </div>
              <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                The stock may be oversold and due for a bounce. Consider entering a position.
              </div>
            </div>
          </div>
        )}

        {/* RSI Gauge */}
        <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
          <RSIGauge rsi={currentRSI} />
        </div>

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
                {/* Buy warning when overbought */}
                {isOverbought && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-400/60 bg-red-50 px-3 py-2 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">Overbought — buying is risky!</span>
                  </div>
                )}

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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">RSI</div>
                    <div className={`text-sm font-semibold ${isOverbought ? "text-red-500" : isOversold ? "text-emerald-500" : "text-foreground"}`}>
                      {currentRSI !== null ? currentRSI.toFixed(1) : "--"}
                    </div>
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

                {/* Qty + Buy/Sell */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Quantity</Label>
                  <Input className="bg-background/70 border-border text-foreground" type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className={`w-full cursor-pointer ${
                      isOverbought
                        ? "bg-red-800 hover:bg-red-700 opacity-70"
                        : isOversold
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-emerald-400/50"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}
                  >
                    {isOverbought ? "Buy (Risky!)" : isOversold ? "Buy (Opportunity)" : "Buy"}
                  </Button>
                  <Button
                    className={`w-full cursor-pointer ${
                      isOverbought
                        ? "bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/50"
                        : "bg-red-600 hover:bg-red-500"
                    }`}
                    onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}
                  >
                    {isOverbought ? "Sell (Smart!)" : "Sell"}
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
                if (key === "goodBuys") label = `Make ${GOOD_BUYS_TARGET} purchases with RSI < 70 (${goodBuyCount}/${GOOD_BUYS_TARGET})`
                if (key === "completedTrades") label = `Complete ${TOTAL_TRADES_TARGET} trades (${tradeCount}/${TOTAL_TRADES_TARGET})`
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
              <p className="text-sm text-muted-foreground">No trades yet. Wait for RSI to be below 70 before buying.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-right p-1.5">RSI</th>
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
                        <td className={`p-1.5 text-right text-xs font-medium ${
                          t.rsi !== null && t.rsi >= OVERBOUGHT ? "text-red-500" : t.rsi !== null && t.rsi <= OVERSOLD ? "text-emerald-500" : "text-foreground"
                        }`}>
                          {t.rsi !== null ? t.rsi.toFixed(1) : "--"}
                        </td>
                        <td className="p-1.5 text-center">
                          {t.overbought ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              <AlertTriangle className="h-2.5 w-2.5" /> OB
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <Check className="h-2.5 w-2.5" /> OK
                            </span>
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
