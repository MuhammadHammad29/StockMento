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
  Timer,
  Zap,
  AlertTriangle,
  Target,
  Flame,
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

const LAB_SYMBOL = "HUBC"
const STARTING_CASH = 150_000
const PROFIT_TARGET = 6_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2024-09-24").getTime()
const LEAD_IN_DAYS = 5

// Scalping parameters
const MAX_HOLD_DAYS = 1 // must exit by next day
const SCALP_TARGET_PCT = 1 // 1%+ = good scalp
const SCALP_COUNT_TARGET = 8
const STREAK_TARGET = 3

// ── Types ──

type TaskKey =
  | "firstScalp"
  | "targetScalp"
  | "scalperStreak"
  | "multipleScalps"
  | "neverOverheld"
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
  tag: "scalp" | "overheld" | "loss" | "none"
}

const TASK_LABELS: Record<TaskKey, string> = {
  firstScalp: "Complete your first profitable scalp",
  targetScalp: `Achieve ${SCALP_TARGET_PCT}%+ return on a single scalp`,
  scalperStreak: `Win ${STREAK_TARGET} scalps in a row without a loss`,
  multipleScalps: `Complete ${SCALP_COUNT_TARGET} successful scalps`,
  neverOverheld: `Never hold longer than ${MAX_HOLD_DAYS} day`,
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "firstScalp",
  "targetScalp",
  "scalperStreak",
  "multipleScalps",
  "neverOverheld",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 20: Quick Scalps",
    body: `Scalping is the fastest trading style — grabbing tiny profits from small price moves, over and over. In this lab you'll scalp ${LAB_SYMBOL}, one of PSX's most liquid stocks. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "The Scalper's Rules",
    body: `Rule #1: Speed. You must exit every position within ${MAX_HOLD_DAYS} day. No exceptions. Rule #2: Small targets. Aim for ${SCALP_TARGET_PCT}%+ per trade — don't get greedy. Rule #3: Volume. Take many small bites, not one big one.`,
  },
  {
    title: "Reading the Daily Range",
    body: "The Daily Range meter shows today's high-low spread as a percentage. A wide range (3%+) means more scalping room. Use price oscillation within the daily range to time your entry and exit.",
  },
  {
    title: "Building a Streak",
    body: `Consistency matters more than size. Build winning streaks — ${STREAK_TARGET} profitable scalps in a row proves you have discipline. One bad trade can wipe out many small wins, so cut losses fast.`,
  },
  {
    title: "Your Tasks",
    body: `Complete ${SCALP_COUNT_TARGET} successful scalps, build a ${STREAK_TARGET}-trade winning streak, never overhold, and hit your profit target. Think fast, trade fast.`,
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Master Scalper!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've mastered scalping — the art of many small, quick profits. Scalping demands
          lightning reflexes, iron discipline, and the ability to cut losses instantly. In real
          markets, watch out for transaction costs that can eat into thin margins. Focus on
          the most liquid stocks with tight bid-ask spreads.
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

export default function Lab20Page() {
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

  const [buyDayIndex, setBuyDayIndex] = useState<number | null>(null)
  const [scalpCount, setScalpCount] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    firstScalp: false,
    targetScalp: false,
    scalperStreak: false,
    multipleScalps: false,
    neverOverheld: true, // failable
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
  const unrealizedPctReturn = holdings > 0 && avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
  const profit = totalEquity - STARTING_CASH

  // Hold duration
  const holdDuration = buyDayIndex !== null ? currentDayIndex - buyDayIndex : 0
  const isOverheld = holdDuration > MAX_HOLD_DAYS && holdings > 0

  // Daily range
  const dailyRangePct = currentKline && currentKline.close > 0
    ? ((currentKline.high - currentKline.low) / currentKline.close) * 100
    : 0
  const wideRange = dailyRangePct >= 3

  // Day change
  const prevKline = currentDayIndex > 0 ? allKlines[currentDayIndex - 1] : null
  const dayChangePct = prevKline && prevKline.close > 0
    ? ((currentPrice - prevKline.close) / prevKline.close) * 100
    : 0

  // Overhold check
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
    if (scalpCount >= 1 && !tasks.firstScalp) setTasks((prev) => ({ ...prev, firstScalp: true }))
    if (scalpCount >= SCALP_COUNT_TARGET && !tasks.multipleScalps) setTasks((prev) => ({ ...prev, multipleScalps: true }))
  }, [scalpCount, tasks.firstScalp, tasks.multipleScalps])

  useEffect(() => {
    if (bestStreak >= STREAK_TARGET && !tasks.scalperStreak) setTasks((prev) => ({ ...prev, scalperStreak: true }))
  }, [bestStreak, tasks.scalperStreak])

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

    if (holdings === 0) setBuyDayIndex(currentDayIndex)

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", tag: "none",
    }])
  }, [quantity, currentPrice, cash, holdings, currentDayIndex, currentKline])

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
    let tag: "scalp" | "overheld" | "loss" | "none" = "none"

    if (hd > MAX_HOLD_DAYS) {
      tag = "overheld"
      setCurrentStreak(0)
    } else if (tradePnl > 0) {
      tag = "scalp"
      setScalpCount((prev) => prev + 1)
      setCurrentStreak((prev) => {
        const newStreak = prev + 1
        setBestStreak((best) => Math.max(best, newStreak))
        return newStreak
      })
      if (tradePctReturn >= SCALP_TARGET_PCT && !tasks.targetScalp) {
        setTasks((prev) => ({ ...prev, targetScalp: true }))
      }
    } else {
      tag = "loss"
      setCurrentStreak(0)
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
  }, [quantity, currentPrice, holdings, avgCost, buyDayIndex, currentDayIndex, currentKline, tasks.targetScalp])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setBuyDayIndex(null); setScalpCount(0); setCurrentStreak(0); setBestStreak(0)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      firstScalp: false, targetScalp: false, scalperStreak: false,
      multipleScalps: false, neverOverheld: true, madeProfit: false,
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

  // Range bar width
  const rangeBarPct = Math.min(100, (dailyRangePct / 6) * 100)

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
              <h1 className="text-2xl font-bold text-foreground">Lab 20: Quick Scalps</h1>
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

        {/* Scalper Dashboard */}
        <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            {/* Daily Range */}
            <div className={`rounded-lg border px-3 py-2 transition-colors ${
              wideRange ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20" : "border-border bg-background/30"
            }`}>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Target className="h-3 w-3" /> Daily Range
              </div>
              <div className="relative h-3 mt-1 rounded-full overflow-hidden bg-muted/30">
                <div className={`h-full rounded-full transition-all duration-300 ${wideRange ? "bg-amber-500" : "bg-foreground/30"}`}
                  style={{ width: `${rangeBarPct}%` }} />
              </div>
              <div className="text-center mt-0.5">
                <span className={`text-sm font-bold ${wideRange ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {dailyRangePct.toFixed(1)}%
                </span>
                {wideRange && <span className="text-[9px] text-amber-600 ml-1">Wide</span>}
              </div>
            </div>

            {/* Hold Timer */}
            <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
              isOverheld ? "border-red-500/60 bg-red-50 dark:bg-red-900/20" :
              holdings > 0 ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20" :
              "border-border bg-background/30"
            }`}>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Timer className="h-3 w-3" /> Hold
              </div>
              {holdings > 0 ? (
                <div className={`text-sm font-bold mt-0.5 ${isOverheld ? "text-red-600 animate-pulse" : holdDuration >= MAX_HOLD_DAYS ? "text-amber-600 animate-pulse" : "text-foreground"}`}>
                  {isOverheld ? "OVERDUE!" : holdDuration >= MAX_HOLD_DAYS ? "SELL!" : `Day ${holdDuration}`}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mt-1">Ready</div>
              )}
            </div>

            {/* Scalp Counter */}
            <div className="rounded-lg border border-border bg-background/30 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Zap className="h-3 w-3" /> Scalps
              </div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {scalpCount}/{SCALP_COUNT_TARGET}
              </div>
            </div>

            {/* Streak */}
            <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
              currentStreak >= STREAK_TARGET ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20" : "border-border bg-background/30"
            }`}>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Flame className="h-3 w-3" /> Streak
              </div>
              <div className={`text-sm font-bold mt-0.5 ${currentStreak >= STREAK_TARGET ? "text-primary" : "text-foreground"}`}>
                {currentStreak}
                {currentStreak >= STREAK_TARGET && <span className="text-[9px] ml-1">Hot!</span>}
              </div>
              <div className="text-[9px] text-muted-foreground">Best: {bestStreak}</div>
            </div>
          </div>
        </div>

        {/* Overhold Warning */}
        {isOverheld && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-50 dark:bg-red-900/20 px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">
              Position held {holdDuration} days! Max is {MAX_HOLD_DAYS}. Sell immediately!
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
                <CardTitle className="text-base text-foreground">Scalp {LAB_SYMBOL}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Day info */}
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/30 px-3 py-2">
                  {dayChangePct >= 0 ? <ArrowUp className="h-4 w-4 text-emerald-500" /> : <ArrowDown className="h-4 w-4 text-red-500" />}
                  <span className="text-xs text-muted-foreground">Day change:</span>
                  <span className={`text-xs font-bold ${pnlColor(dayChangePct)}`}>
                    {dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%
                  </span>
                  {holdings > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground ml-2">Position:</span>
                      <span className={`text-xs font-bold ${pnlColor(unrealizedPctReturn)}`}>
                        {unrealizedPctReturn >= 0 ? "+" : ""}{unrealizedPctReturn.toFixed(2)}%
                      </span>
                    </>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Win Rate</div>
                    <div className="text-sm font-semibold text-foreground">
                      {trades.filter((t) => t.tag === "scalp").length > 0
                        ? `${Math.round((scalpCount / trades.filter((t) => t.side === "sell").length) * 100)}%`
                        : "--"}
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
                  <Button className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd || holdings > 0}>
                    {holdings > 0 ? "In Position" : "Buy (Scalp)"}
                  </Button>
                  <Button className={`w-full cursor-pointer ${
                    (holdings > 0 && (holdDuration >= MAX_HOLD_DAYS || unrealizedPctReturn >= SCALP_TARGET_PCT))
                      ? "bg-red-600 hover:bg-red-500 ring-2 ring-red-400/50 animate-pulse"
                      : "bg-red-600 hover:bg-red-500"
                  }`} onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    Sell{holdDuration >= MAX_HOLD_DAYS && holdings > 0 ? " (Now!)" : unrealizedPctReturn >= SCALP_TARGET_PCT ? " (Take!)" : ""}
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
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(1)} disabled={atEnd}>+1 Day</Button>
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(3)} disabled={atEnd}>+3 Days</Button>
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
                if (key === "multipleScalps") label = `Complete ${SCALP_COUNT_TARGET} scalps (${scalpCount}/${SCALP_COUNT_TARGET})`
                if (key === "scalperStreak") label = `Win ${STREAK_TARGET} in a row (best: ${bestStreak})`
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    failed
                      ? "border-red-400/60 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200"
                      : done
                        ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                        : "border-border bg-background/30 text-muted-foreground"
                  }`}>
                    {failed ? <X className="h-4 w-4 flex-shrink-0 text-red-500" /> :
                     done ? <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> :
                     <Circle className="h-4 w-4 flex-shrink-0" />}
                    <span className={done || failed ? "line-through opacity-70" : ""}>{label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Trade History */}
        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-foreground">Scalp Log ({trades.filter(t => t.side === "sell").length} trades)</CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scalps yet. Buy on a wide-range day and sell for a quick {SCALP_TARGET_PCT}%+ profit.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-center p-1.5">Result</th>
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
                          {t.tag === "scalp" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <Zap className="h-2.5 w-2.5" /> WIN
                            </span>
                          ) : t.tag === "loss" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              <X className="h-2.5 w-2.5" /> LOSS
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
                            <span>
                              {fmt(t.pnl, true)}
                              <span className="text-[9px] opacity-70 ml-0.5">
                                ({t.pctReturn !== undefined ? `${t.pctReturn >= 0 ? "+" : ""}${t.pctReturn.toFixed(1)}%` : ""})
                              </span>
                            </span>
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
