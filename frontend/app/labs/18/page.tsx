"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
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
  Activity,
  Zap,
  Volume2,
  Minus,
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

const LAB_SYMBOL = "EFERT"
const STARTING_CASH = 120_000
const PROFIT_TARGET = 8_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2023-07-26").getTime()
const LEAD_IN_DAYS = 30

// Breakout parameters
const RANGE_PERIOD = 20 // days for consolidation range
const CONSOLIDATION_PCT = 8 // range < 8% = consolidation
const BREAKOUT_MARGIN = 0.5 // close 0.5% above resistance = breakout
const VOLUME_MULT = 1.8 // volume surge multiplier vs 20-day avg
const MIN_HOLD_DAYS = 5
const BREAKOUT_PROFIT_PCT = 10

// ── Types ──

type TaskKey =
  | "identifiedConsolidation"
  | "boughtBreakout"
  | "volumeConfirmed"
  | "heldAfterBreakout"
  | "profitableBreakout"
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
  tag: "breakout" | "volume" | "none"
  holdDays?: number
}

type RangeInfo = {
  high: number
  low: number
  rangePct: number
  isConsolidating: boolean
  avgVolume: number
}

const TASK_LABELS: Record<TaskKey, string> = {
  identifiedConsolidation: `Wait for consolidation (${RANGE_PERIOD}-day range < ${CONSOLIDATION_PCT}%)`,
  boughtBreakout: "Buy after price breaks above resistance",
  volumeConfirmed: `Buy on a volume surge (${VOLUME_MULT}x+ average)`,
  heldAfterBreakout: `Hold for ${MIN_HOLD_DAYS}+ days after breakout`,
  profitableBreakout: `Complete a ${BREAKOUT_PROFIT_PCT}%+ profitable breakout trade`,
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "identifiedConsolidation",
  "boughtBreakout",
  "volumeConfirmed",
  "heldAfterBreakout",
  "profitableBreakout",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 18: Trade a Breakout",
    body: `Breakout trading captures explosive moves when price escapes a consolidation range. In this lab you'll trade ${LAB_SYMBOL} by identifying consolidation, then buying the breakout. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "What Is Consolidation?",
    body: `Consolidation happens when a stock trades in a narrow range — buyers and sellers are in equilibrium. The ${RANGE_PERIOD}-day range compresses below ${CONSOLIDATION_PCT}%. Think of it as a coiled spring, building energy for the next big move.`,
  },
  {
    title: "The Breakout",
    body: "A breakout occurs when price decisively closes above the resistance level (the top of the consolidation range). This signals that buyers have overwhelmed sellers and a new trend may be starting.",
  },
  {
    title: "Volume Confirmation",
    body: `Volume is the key confirmation — a real breakout comes with a surge in trading volume (${VOLUME_MULT}x+ the average). High volume means conviction. Low volume breakouts are more likely to fail and reverse (a 'fakeout').`,
  },
  {
    title: "After the Breakout",
    body: `Once you buy the breakout, be patient. The old resistance often becomes new support. Hold for at least ${MIN_HOLD_DAYS} days and aim for a ${BREAKOUT_PROFIT_PCT}%+ gain before selling. Don't panic on small pullbacks.`,
  },
  {
    title: "Your Tasks",
    body: `Wait for consolidation, buy the breakout with volume confirmation, hold through the move, and hit your profit target of PKR ${PROFIT_TARGET.toLocaleString()}.`,
  },
]

// ── Helpers ──

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(ts))
}

function computeRange(klines: SimKlinePoint[], idx: number, period: number): RangeInfo | null {
  if (idx < period) return null
  let high = -Infinity, low = Infinity, volSum = 0
  for (let i = idx - period + 1; i <= idx; i++) {
    if (klines[i].high > high) high = klines[i].high
    if (klines[i].low < low) low = klines[i].low
    volSum += Number(klines[i].volume ?? 0)
  }
  const rangePct = low > 0 ? ((high - low) / low) * 100 : 0
  return {
    high,
    low,
    rangePct,
    isConsolidating: rangePct < CONSOLIDATION_PCT,
    avgVolume: volSum / period,
  }
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Breakout Trader!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've mastered breakout trading — identifying consolidation patterns and buying the decisive
          move above resistance. Remember: always confirm with volume, set stops below the breakout level,
          and avoid chasing if you miss the initial move. The best breakouts pull back to retest resistance
          as support before continuing higher.
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

export default function Lab18Page() {
  const { user, loading: authLoading } = useAuth()

  const [allKlines, setAllKlines] = useState<SimKlinePoint[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_CASH)
  const [holdings, setHoldings] = useState(0)
  const [avgCost, setAvgCost] = useState(0)
  const [realizedPnl, setRealizedPnl] = useState(0)
  const [quantity, setQuantity] = useState("200")
  const [chartMode, setChartMode] = useState<"area" | "candles">("candles")

  const [buyDayIndex, setBuyDayIndex] = useState<number | null>(null)
  const [boughtOnBreakout, setBoughtOnBreakout] = useState(false)
  const [consolidationSeen, setConsolidationSeen] = useState(false)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    identifiedConsolidation: false,
    boughtBreakout: false,
    volumeConfirmed: false,
    heldAfterBreakout: false,
    profitableBreakout: false,
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
          .filter((k) => Number.isFinite(k.timestamp) && Number.isFinite(k.close) && k.timestamp >= DATA_START_MS && k.timestamp <= DATA_CUTOFF_MS)
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
  const currentVolume = currentKline ? Number(currentKline.volume ?? 0) : 0
  const holdingsValue = holdings * currentPrice
  const totalEquity = cash + holdingsValue
  const unrealizedPnl = holdings > 0 ? (currentPrice - avgCost) * holdings : 0
  const profit = totalEquity - STARTING_CASH

  // ── Range & Breakout Detection ──
  const rangeInfo = useMemo(() => computeRange(allKlines, currentDayIndex, RANGE_PERIOD), [allKlines, currentDayIndex])

  // Previous day range (to detect if yesterday was consolidating and today broke out)
  const prevRangeInfo = useMemo(() => {
    if (currentDayIndex < 1) return null
    return computeRange(allKlines, currentDayIndex - 1, RANGE_PERIOD)
  }, [allKlines, currentDayIndex])

  const isConsolidating = rangeInfo?.isConsolidating ?? false
  const resistance = rangeInfo?.high ?? 0
  const support = rangeInfo?.low ?? 0
  const avgVolume = rangeInfo?.avgVolume ?? 0
  const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0
  const isVolumeSurge = volumeRatio >= VOLUME_MULT

  // Breakout detection: price closes above previous resistance
  const isBreakout = prevRangeInfo
    ? currentPrice > prevRangeInfo.high * (1 + BREAKOUT_MARGIN / 100)
    : false

  // Distance above resistance as %
  const aboveResistancePct = resistance > 0 ? ((currentPrice - resistance) / resistance) * 100 : 0

  // Consolidation task: mark once we've seen it
  useEffect(() => {
    if (isConsolidating && !consolidationSeen) {
      setConsolidationSeen(true)
      if (!tasks.identifiedConsolidation) setTasks((prev) => ({ ...prev, identifiedConsolidation: true }))
    }
  }, [isConsolidating, consolidationSeen, tasks.identifiedConsolidation])

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

  const completedCount = TASK_ORDER.filter((k) => tasks[k]).length
  const allComplete = completedCount === TASK_ORDER.length

  useEffect(() => {
    if (allComplete && !completionShownRef.current) {
      completionShownRef.current = true
      setShowConfetti(true); setShowCompletion(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [allComplete])

  // Hold duration
  const holdDuration = buyDayIndex !== null ? currentDayIndex - buyDayIndex : 0

  // ── Handlers ──

  const handleBuy = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || !currentPrice) return
    const cost = qty * currentPrice
    if (cost > cash) return
    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)

    if (holdings === 0) setBuyDayIndex(currentDayIndex)

    let tag: "breakout" | "volume" | "none" = "none"

    // Breakout buy
    if (isBreakout) {
      tag = "breakout"
      setBoughtOnBreakout(true)
      if (!tasks.boughtBreakout) setTasks((prev) => ({ ...prev, boughtBreakout: true }))
    }

    // Volume confirmation
    if (isVolumeSurge && !tasks.volumeConfirmed) {
      if (tag === "none") tag = "volume"
      setTasks((prev) => ({ ...prev, volumeConfirmed: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", tag,
    }])
  }, [quantity, currentPrice, cash, holdings, isBreakout, isVolumeSurge, currentDayIndex, currentKline, tasks.boughtBreakout, tasks.volumeConfirmed])

  const handleSell = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || qty > holdings || !currentPrice) return
    const proceeds = qty * currentPrice
    const costBasis = qty * avgCost
    const tradePnl = proceeds - costBasis
    const tradePctReturn = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
    setRealizedPnl((prev) => prev + tradePnl)
    setCash((prev) => prev + proceeds)

    const hd = buyDayIndex !== null ? currentDayIndex - buyDayIndex : 0

    setHoldings((prev) => {
      const remaining = prev - qty
      if (remaining === 0) {
        setAvgCost(0)
        setBuyDayIndex(null)
        setBoughtOnBreakout(false)
      }
      return remaining
    })

    // Held after breakout task
    if (boughtOnBreakout && hd >= MIN_HOLD_DAYS && !tasks.heldAfterBreakout) {
      setTasks((prev) => ({ ...prev, heldAfterBreakout: true }))
    }

    // Profitable breakout trade
    if (boughtOnBreakout && tradePctReturn >= BREAKOUT_PROFIT_PCT && !tasks.profitableBreakout) {
      setTasks((prev) => ({ ...prev, profitableBreakout: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, tag: "none", holdDays: hd,
    }])
  }, [quantity, currentPrice, holdings, avgCost, boughtOnBreakout, buyDayIndex, currentDayIndex, currentKline, tasks.heldAfterBreakout, tasks.profitableBreakout])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("200"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setBuyDayIndex(null); setBoughtOnBreakout(false); setConsolidationSeen(false)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      identifiedConsolidation: false, boughtBreakout: false, volumeConfirmed: false,
      heldAfterBreakout: false, profitableBreakout: false, madeProfit: false,
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

  // Range position (0% = support, 100% = resistance)
  const rangePositionPct = rangeInfo && (rangeInfo.high - rangeInfo.low) > 0
    ? ((currentPrice - rangeInfo.low) / (rangeInfo.high - rangeInfo.low)) * 100
    : 50

  // Volume bar scale
  const volBarPct = Math.min(100, (volumeRatio / 3) * 100)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar />
      {showConfetti && <Confetti />}
      {showCompletion && <CompletionDialog onClose={() => setShowCompletion(false)} />}
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
              <h1 className="text-2xl font-bold text-foreground">Lab 18: Trade a Breakout</h1>
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

        {/* Breakout Dashboard */}
        {rangeInfo && (
          <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Range & Status */}
              <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                isBreakout
                  ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20"
                  : isConsolidating
                    ? "border-blue-400/60 bg-blue-50 dark:bg-blue-900/20"
                    : "border-border bg-background/30"
              }`}>
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {isBreakout ? <Zap className="h-3 w-3 text-amber-500" /> : <Activity className="h-3 w-3" />}
                  {isBreakout ? "BREAKOUT!" : isConsolidating ? "Consolidating" : "Trending"}
                </div>
                <div className="text-xs mt-0.5">
                  <span className="text-muted-foreground">Range: </span>
                  <span className={`font-semibold ${isConsolidating ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>
                    {rangeInfo.rangePct.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground"> ({CONSOLIDATION_PCT}% = tight)</span>
                </div>
                {isBreakout && (
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse">
                    PRICE ABOVE RESISTANCE
                  </div>
                )}
              </div>

              {/* Price vs Range visualiser */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Support: PKR {support.toFixed(1)}</span>
                  <span>Resistance: PKR {resistance.toFixed(1)}</span>
                </div>
                <div className="relative h-6 rounded-lg overflow-hidden bg-muted/30 border border-border">
                  {/* Consolidation fill */}
                  {isConsolidating && (
                    <div className="absolute inset-0 bg-blue-100/30 dark:bg-blue-900/10" />
                  )}
                  {/* Resistance line */}
                  <div className="absolute inset-y-0 right-0 w-1 bg-red-400/60 z-10" />
                  {/* Support line */}
                  <div className="absolute inset-y-0 left-0 w-1 bg-emerald-400/60 z-10" />
                  {/* Price position dot */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 shadow-sm transition-all duration-300 z-20 ${
                      isBreakout
                        ? "bg-amber-500 border-amber-300"
                        : rangePositionPct > 80
                          ? "bg-red-500 border-red-300"
                          : rangePositionPct < 20
                            ? "bg-emerald-500 border-emerald-300"
                            : "bg-foreground border-foreground/50"
                    }`}
                    style={{ left: `calc(${Math.max(2, Math.min(98, rangePositionPct))}% - 8px)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                  <span className="text-emerald-600">Support</span>
                  {isBreakout && aboveResistancePct > 0 && (
                    <span className="text-amber-600 font-semibold">+{aboveResistancePct.toFixed(1)}% above</span>
                  )}
                  <span className="text-red-600">Resistance</span>
                </div>
              </div>

              {/* Volume indicator */}
              <div className={`rounded-lg border px-3 py-2 transition-colors ${
                isVolumeSurge ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20" : "border-border bg-background/30"
              }`}>
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Volume2 className="h-3 w-3" /> Volume
                </div>
                <div className="relative h-3 mt-1 rounded-full overflow-hidden bg-muted/30">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isVolumeSurge ? "bg-amber-500" : "bg-foreground/30"
                    }`}
                    style={{ width: `${volBarPct}%` }}
                  />
                </div>
                <div className="text-center mt-0.5">
                  <span className={`text-xs font-semibold ${isVolumeSurge ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                    {volumeRatio.toFixed(1)}x
                  </span>
                  <span className="text-[10px] text-muted-foreground"> avg</span>
                </div>
                {isVolumeSurge && (
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 text-center animate-pulse">
                    VOLUME SURGE
                  </div>
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
                  isBreakout && isVolumeSurge
                    ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20"
                    : isBreakout
                      ? "border-amber-400/40 bg-amber-50/50 dark:bg-amber-900/10"
                      : isConsolidating
                        ? "border-blue-400/60 bg-blue-50 dark:bg-blue-900/20"
                        : "border-border bg-background/30"
                }`}>
                  {isBreakout && isVolumeSurge ? (
                    <><Zap className="h-4 w-4 text-amber-500" /><span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Confirmed breakout with volume — Buy signal!</span></>
                  ) : isBreakout ? (
                    <><TrendingUp className="h-4 w-4 text-amber-500" /><span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Price above resistance — check volume</span></>
                  ) : isConsolidating ? (
                    <><Activity className="h-4 w-4 text-blue-500" /><span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Consolidating — watch for breakout above PKR {resistance.toFixed(1)}</span></>
                  ) : (
                    <><Minus className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Trending — wait for consolidation to form</span></>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {holdings > 0 ? `Hold: ${holdDuration}d` : "Return"}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {holdings > 0 ? (
                        <span className={holdDuration >= MIN_HOLD_DAYS ? "text-emerald-500" : ""}>
                          {holdDuration}/{MIN_HOLD_DAYS}d
                        </span>
                      ) : (
                        avgCost > 0 ? `${((currentPrice - avgCost) / avgCost * 100).toFixed(1)}%` : "--"
                      )}
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

                {/* Quantity */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Quantity</Label>
                  <Input className="bg-background/70 border-border text-foreground" type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
                </div>

                {/* Buy/Sell */}
                <div className="grid grid-cols-2 gap-2">
                  <Button className={`w-full cursor-pointer ${
                    isBreakout
                      ? "bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/50 animate-pulse"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`} onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}>
                    Buy{isBreakout ? " (Breakout!)" : ""}
                  </Button>
                  <Button className="w-full cursor-pointer bg-red-600 hover:bg-red-500" onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    Sell
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
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    done
                      ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-border bg-background/30 text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 flex-shrink-0" />}
                    <span className={done ? "line-through opacity-70" : ""}>{TASK_LABELS[key]}</span>
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
              <p className="text-sm text-muted-foreground">No trades yet. Wait for price to consolidate, then buy the breakout above resistance.</p>
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
                          {t.tag === "breakout" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                              <Zap className="h-2.5 w-2.5" /> BRK
                            </span>
                          ) : t.tag === "volume" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-400/60 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                              <Volume2 className="h-2.5 w-2.5" /> VOL
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
