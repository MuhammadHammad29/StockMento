"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
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
  Timer,
  Zap,
  AlertTriangle,
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

const LAB_SYMBOL = "HCAR"
const STARTING_CASH = 150_000
const PROFIT_TARGET = 8_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2023-12-19").getTime()
const LEAD_IN_DAYS = 10

// Quick trade parameters
const MAX_HOLD_DAYS = 3
const TARGET_RETURN_PCT = 2 // 2% per trade target
const QUICK_TRADE_TARGET = 5
const MOMENTUM_PCT = 2 // 2%+ daily move = momentum day

// ── Types ──

type TaskKey =
  | "quickProfit"
  | "targetHit"
  | "multipleQuick"
  | "neverOverheld"
  | "capturedMomentum"
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
  pctReturn?: number
  holdDays?: number
  tag: "momentum" | "quick" | "overheld" | "none"
}

const TASK_LABELS: Record<TaskKey, string> = {
  quickProfit: `Complete a profitable trade within ${MAX_HOLD_DAYS} days`,
  targetHit: `Achieve ${TARGET_RETURN_PCT}%+ return on a single trade`,
  multipleQuick: `Complete ${QUICK_TRADE_TARGET} quick profitable trades`,
  neverOverheld: `Never hold longer than ${MAX_HOLD_DAYS} days`,
  capturedMomentum: `Buy on a ${MOMENTUM_PCT}%+ momentum day`,
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "quickProfit",
  "targetHit",
  "multipleQuick",
  "neverOverheld",
  "capturedMomentum",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 19: Quick Momentum Trade",
    body: `Short-term momentum trading captures quick price moves — in and out within days, not weeks. ${LAB_SYMBOL} is one of the most volatile PSX stocks, perfect for rapid-fire trades. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "The Rules",
    body: `Discipline is everything in short-term trading. You must enter and exit every position within ${MAX_HOLD_DAYS} trading days. No exceptions. The hold timer tracks your countdown — if it hits zero, you've overheld.`,
  },
  {
    title: "Momentum Days",
    body: `Look for momentum — days where price moves ${MOMENTUM_PCT}%+ from open to close. These big-move days are your entry signals. Buy when momentum is in your favour, and take quick profits before it fades.`,
  },
  {
    title: "Take the Profit",
    body: `Target ${TARGET_RETURN_PCT}%+ per trade. Don't get greedy — sell when you hit your target rather than waiting for more. Small, consistent wins compound into big returns over time.`,
  },
  {
    title: "Your Tasks",
    body: `Complete ${QUICK_TRADE_TARGET} quick profitable trades, never overhold, capture momentum entries, and hit your profit target. Speed and discipline are your edge.`,
  },
]

// ── Helpers ──

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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Speed Trader!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've mastered quick momentum trading — fast entries, fast exits, strict discipline.
          Short-term trading demands emotional control: take profits when you have them, cut losses quickly,
          and never let a winning trade turn into a losing one by holding too long.
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

export default function Lab19Page() {
  const { user, loading: authLoading } = useAuth()

  const [allKlines, setAllKlines] = useState<SimKlinePoint[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_CASH)
  const [holdings, setHoldings] = useState(0)
  const [avgCost, setAvgCost] = useState(0)
  const [realizedPnl, setRealizedPnl] = useState(0)
  const [quantity, setQuantity] = useState("50")
  const [chartMode, setChartMode] = useState<"area" | "candles">("candles")

  const [buyDayIndex, setBuyDayIndex] = useState<number | null>(null)
  const [quickProfitCount, setQuickProfitCount] = useState(0)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    quickProfit: false,
    targetHit: false,
    multipleQuick: false,
    neverOverheld: true, // failable — starts true
    capturedMomentum: false,
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
  const holdingsValue = holdings * currentPrice
  const totalEquity = cash + holdingsValue
  const unrealizedPnl = holdings > 0 ? (currentPrice - avgCost) * holdings : 0
  const unrealizedPctReturn = holdings > 0 && avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
  const profit = totalEquity - STARTING_CASH

  // Hold duration
  const holdDuration = buyDayIndex !== null ? currentDayIndex - buyDayIndex : 0
  const holdRemaining = buyDayIndex !== null ? MAX_HOLD_DAYS - holdDuration : MAX_HOLD_DAYS
  const isOverheld = holdDuration > MAX_HOLD_DAYS && holdings > 0

  // Daily momentum: (close - open) / open
  const dailyMovePct = currentKline && currentKline.open > 0
    ? ((currentKline.close - currentKline.open) / currentKline.open) * 100
    : 0
  const isMomentumDay = Math.abs(dailyMovePct) >= MOMENTUM_PCT
  const isBullishMomentum = dailyMovePct >= MOMENTUM_PCT
  const isBearishMomentum = dailyMovePct <= -MOMENTUM_PCT

  // Previous day change (for context)
  const prevKline = currentDayIndex > 0 ? allKlines[currentDayIndex - 1] : null
  const dayChangePct = prevKline && prevKline.close > 0
    ? ((currentPrice - prevKline.close) / prevKline.close) * 100
    : 0

  // Overhold check — permanently fails task
  useEffect(() => {
    if (isOverheld && tasks.neverOverheld) {
      setTasks((prev) => ({ ...prev, neverOverheld: false }))
    }
  }, [isOverheld, tasks.neverOverheld])

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
    if (quickProfitCount >= 1 && !tasks.quickProfit) setTasks((prev) => ({ ...prev, quickProfit: true }))
    if (quickProfitCount >= QUICK_TRADE_TARGET && !tasks.multipleQuick) setTasks((prev) => ({ ...prev, multipleQuick: true }))
  }, [quickProfitCount, tasks.quickProfit, tasks.multipleQuick])

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

    if (holdings === 0) setBuyDayIndex(currentDayIndex)

    let tag: "momentum" | "none" = "none"
    if (isBullishMomentum) {
      tag = "momentum"
      if (!tasks.capturedMomentum) setTasks((prev) => ({ ...prev, capturedMomentum: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", tag,
    }])
  }, [quantity, currentPrice, cash, holdings, isBullishMomentum, currentDayIndex, currentKline, tasks.capturedMomentum])

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

    let tag: "quick" | "overheld" | "none" = "none"
    if (hd > MAX_HOLD_DAYS) {
      tag = "overheld"
    } else if (tradePnl > 0) {
      tag = "quick"
      setQuickProfitCount((prev) => prev + 1)
      if (tradePctReturn >= TARGET_RETURN_PCT && !tasks.targetHit) {
        setTasks((prev) => ({ ...prev, targetHit: true }))
      }
    }

    setHoldings((prev) => {
      const remaining = prev - qty
      if (remaining === 0) {
        setAvgCost(0)
        setBuyDayIndex(null)
      }
      return remaining
    })

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, pctReturn: tradePctReturn, holdDays: hd, tag,
    }])
  }, [quantity, currentPrice, holdings, avgCost, buyDayIndex, currentDayIndex, currentKline, tasks.targetHit])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("50"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setBuyDayIndex(null); setQuickProfitCount(0)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      quickProfit: false, targetHit: false, multipleQuick: false,
      neverOverheld: true, capturedMomentum: false, madeProfit: false,
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

  // Hold timer visual
  const holdTimerPct = holdings > 0 ? Math.min(100, (holdDuration / MAX_HOLD_DAYS) * 100) : 0
  const holdTimerColor = holdDuration > MAX_HOLD_DAYS
    ? "bg-red-500"
    : holdDuration === MAX_HOLD_DAYS
      ? "bg-amber-500"
      : holdDuration >= MAX_HOLD_DAYS - 1
        ? "bg-amber-400"
        : "bg-emerald-500"

  // Momentum bar scale
  const momentumBarPct = Math.min(100, (Math.abs(dailyMovePct) / 5) * 100)

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
              <h1 className="text-2xl font-bold text-foreground">Lab 19: Quick Momentum Trade</h1>
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

        {/* Momentum & Timer Dashboard */}
        <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Daily Momentum Gauge */}
            <div className={`rounded-lg border px-3 py-2 transition-colors ${
              isBullishMomentum
                ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                : isBearishMomentum
                  ? "border-red-400/60 bg-red-50 dark:bg-red-900/20"
                  : "border-border bg-background/30"
            }`}>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Zap className="h-3 w-3" /> Daily Momentum
              </div>
              <div className="relative h-4 mt-1 rounded-full overflow-hidden bg-muted/30">
                <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30 z-10" />
                {dailyMovePct >= 0 ? (
                  <div className={`absolute inset-y-0 rounded-r transition-all duration-300 ${
                    isBullishMomentum ? "bg-emerald-500/80" : "bg-emerald-300/40"
                  }`} style={{ left: "50%", width: `${momentumBarPct / 2}%` }} />
                ) : (
                  <div className={`absolute inset-y-0 rounded-l transition-all duration-300 ${
                    isBearishMomentum ? "bg-red-500/80" : "bg-red-300/40"
                  }`} style={{ right: "50%", width: `${momentumBarPct / 2}%` }} />
                )}
              </div>
              <div className="text-center mt-0.5">
                <span className={`text-sm font-bold ${dailyMovePct >= 0 ? "text-primary" : "text-red-600 dark:text-red-400"}`}>
                  {dailyMovePct >= 0 ? "+" : ""}{dailyMovePct.toFixed(2)}%
                </span>
                {isMomentumDay && (
                  <span className="text-[10px] font-bold ml-1 animate-pulse text-amber-600 dark:text-amber-400">
                    MOMENTUM!
                  </span>
                )}
              </div>
            </div>

            {/* Hold Timer */}
            <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
              isOverheld
                ? "border-red-500/60 bg-red-50 dark:bg-red-900/20"
                : holdings > 0 && holdDuration >= MAX_HOLD_DAYS
                  ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20"
                  : "border-border bg-background/30"
            }`}>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Timer className="h-3 w-3" /> Hold Timer
              </div>
              {holdings > 0 ? (
                <>
                  <div className="relative h-4 mt-1 rounded-full overflow-hidden bg-muted/30">
                    <div className={`h-full rounded-full transition-all duration-300 ${holdTimerColor}`}
                      style={{ width: `${holdTimerPct}%` }} />
                  </div>
                  <div className="mt-0.5">
                    <span className={`text-sm font-bold ${isOverheld ? "text-red-600" : holdDuration >= MAX_HOLD_DAYS ? "text-amber-600" : "text-foreground"}`}>
                      Day {holdDuration}/{MAX_HOLD_DAYS}
                    </span>
                    {isOverheld && (
                      <span className="text-[10px] font-bold text-red-600 ml-1 animate-pulse">OVERDUE!</span>
                    )}
                    {holdDuration === MAX_HOLD_DAYS && !isOverheld && (
                      <span className="text-[10px] font-bold text-amber-600 ml-1 animate-pulse">SELL NOW!</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground mt-1.5">No position — ready to trade</div>
              )}
            </div>

            {/* Day Change & Return */}
            <div className="rounded-lg border border-border bg-background/30 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {dayChangePct >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                Day Change
              </div>
              <div className={`text-sm font-bold mt-0.5 ${pnlColor(dayChangePct)}`}>
                {dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%
              </div>
              {holdings > 0 && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Position: <span className={`font-semibold ${pnlColor(unrealizedPctReturn)}`}>
                    {unrealizedPctReturn >= 0 ? "+" : ""}{unrealizedPctReturn.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overhold Warning */}
        {isOverheld && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-50 dark:bg-red-900/20 px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">
              You've held for {holdDuration} days — exceeding the {MAX_HOLD_DAYS}-day limit! Sell immediately to maintain discipline.
            </span>
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
                {/* Signal */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  isBullishMomentum ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20" :
                  isBearishMomentum ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" :
                  "border-border bg-background/30"
                }`}>
                  {isBullishMomentum ? (
                    <><TrendingUp className="h-4 w-4 text-emerald-500" /><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Bullish momentum — Buy the move</span></>
                  ) : isBearishMomentum ? (
                    <><TrendingDown className="h-4 w-4 text-red-500" /><span className="text-xs font-semibold text-red-700 dark:text-red-300">Bearish momentum — Avoid or sell</span></>
                  ) : (
                    <><Zap className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Low momentum — wait for a {MOMENTUM_PCT}%+ move</span></>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Quick Trades</div>
                    <div className="text-sm font-semibold text-foreground">{quickProfitCount}/{QUICK_TRADE_TARGET}</div>
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
                    isBullishMomentum
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-emerald-400/50 animate-pulse"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`} onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}>
                    Buy{isBullishMomentum ? " (Fast!)" : ""}
                  </Button>
                  <Button className={`w-full cursor-pointer ${
                    (holdings > 0 && (holdDuration >= MAX_HOLD_DAYS || unrealizedPctReturn >= TARGET_RETURN_PCT))
                      ? "bg-red-600 hover:bg-red-500 ring-2 ring-red-400/50 animate-pulse"
                      : "bg-red-600 hover:bg-red-500"
                  }`} onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    Sell{holdDuration >= MAX_HOLD_DAYS && holdings > 0 ? " (Now!)" : unrealizedPctReturn >= TARGET_RETURN_PCT ? " (Target!)" : ""}
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
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(3)} disabled={atEnd}>+3 Days</Button>
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(5)} disabled={atEnd}>+1 Week</Button>
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
                const failed = key === "neverOverheld" && !done
                let label = TASK_LABELS[key]
                if (key === "multipleQuick") label = `Complete ${QUICK_TRADE_TARGET} quick trades (${quickProfitCount}/${QUICK_TRADE_TARGET})`
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    failed
                      ? "border-red-400/60 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200"
                      : done
                        ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                        : "border-border bg-background/30 text-muted-foreground"
                  }`}>
                    {failed ? (
                      <X className="h-4 w-4 flex-shrink-0 text-red-500" />
                    ) : done ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className={done && !failed ? "line-through opacity-70" : failed ? "line-through opacity-70" : ""}>{label}</span>
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
              <p className="text-sm text-muted-foreground">No trades yet. Watch for a momentum day — {MOMENTUM_PCT}%+ move — and buy fast.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-center p-1.5">Tag</th>
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
                          {t.tag === "momentum" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                              <Zap className="h-2.5 w-2.5" /> MTM
                            </span>
                          ) : t.tag === "quick" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <Zap className="h-2.5 w-2.5" /> QUICK
                            </span>
                          ) : t.tag === "overheld" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              <Timer className="h-2.5 w-2.5" /> SLOW
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="p-1.5 text-right text-xs">{t.qty}</td>
                        <td className="p-1.5 text-right text-xs">{t.price.toFixed(2)}</td>
                        <td className={`p-1.5 text-right text-xs font-semibold ${t.pnl === undefined ? "text-muted-foreground" : pnlColor(t.pnl)}`}>
                          {t.pnl !== undefined ? (
                            <span>{fmt(t.pnl, true)} <span className="text-[9px] opacity-70">({t.holdDays}d)</span></span>
                          ) : "--"}
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
