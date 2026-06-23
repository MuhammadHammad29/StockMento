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
  Zap,
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

const LAB_SYMBOL = "LUCK"
const STARTING_CASH = 130_000
const PROFIT_TARGET = 8_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2022-08-01").getTime()
const LEAD_IN_DAYS = 25

// Swing detection parameters
const SWING_WINDOW = 7 // days to look back for swing detection
const SWING_CONFIRM = 3 // consecutive days to confirm reversal
const SWING_PROFIT_PCT = 5 // minimum % for a "profitable swing"
const MIN_HOLD_DAYS = 5 // patience task threshold
const SWING_TARGET = 3

// ── Types ──

type TaskKey =
  | "boughtSwingLow"
  | "soldSwingHigh"
  | "profitableSwing"
  | "multipleSwings"
  | "heldForSwing"
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
  swingTag: "swing-low" | "swing-high" | "none"
  holdDays?: number
}

type SwingPoint = {
  idx: number
  price: number
  type: "low" | "high"
  date: string
}

const TASK_LABELS: Record<TaskKey, string> = {
  boughtSwingLow: "Buy near a confirmed swing low",
  soldSwingHigh: "Sell near a confirmed swing high",
  profitableSwing: `Complete a profitable swing trade (≥${SWING_PROFIT_PCT}%)`,
  multipleSwings: `Complete ${SWING_TARGET} profitable swing trades`,
  heldForSwing: `Hold a position for ${MIN_HOLD_DAYS}+ days (patience)`,
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "boughtSwingLow",
  "soldSwingHigh",
  "profitableSwing",
  "multipleSwings",
  "heldForSwing",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 17: Catch the Swing",
    body: `Swing trading captures short-to-medium term price "swings" — buying at troughs and selling at peaks. In this lab you'll trade ${LAB_SYMBOL} through its oscillating price action. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "What Is a Swing?",
    body: "A swing is a price move from a trough (swing low) to a peak (swing high), or vice versa. Swing traders ride these waves — buying the dips and selling the rallies — rather than holding for the long term.",
  },
  {
    title: "Detecting Swing Points",
    body: `A swing low is confirmed when price has been falling and then reverses upward for ${SWING_CONFIRM}+ consecutive days. A swing high is confirmed when price has been rising and then reverses downward. The Swing Phase indicator shows the current direction.`,
  },
  {
    title: "Entry & Exit Strategy",
    body: `Buy near confirmed swing lows (when the upswing begins), and sell near confirmed swing highs (when the downswing begins). Aim for at least ${SWING_PROFIT_PCT}% profit per swing. Patience is key — don't exit too early.`,
  },
  {
    title: "Your Tasks",
    body: `Buy swing lows, sell swing highs, complete ${SWING_TARGET} profitable swings, and hit your profit target. The swing meter shows how far the current move has gone.`,
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Swing Trader!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've mastered swing trading — riding price oscillations from trough to peak.
          Swing trading requires patience, discipline, and the ability to recognize reversals.
          Combine with volume and momentum indicators to improve your timing.
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

export default function Lab17Page() {
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
  const [boughtOnSwingLow, setBoughtOnSwingLow] = useState(false)
  const [profitableSwingCount, setProfitableSwingCount] = useState(0)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    boughtSwingLow: false,
    soldSwingHigh: false,
    profitableSwing: false,
    multipleSwings: false,
    heldForSwing: false,
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
  const profit = totalEquity - STARTING_CASH

  // ── Swing Detection ──
  // Detect confirmed swing points using lookback
  const swingPoints = useMemo<SwingPoint[]>(() => {
    const points: SwingPoint[] = []
    if (allKlines.length < SWING_WINDOW * 2 + 1) return points

    for (let i = SWING_WINDOW; i <= currentDayIndex - SWING_CONFIRM; i++) {
      const price = allKlines[i].close
      let isLow = true
      let isHigh = true

      // Check window before
      for (let j = i - SWING_WINDOW; j < i; j++) {
        if (allKlines[j].close < price) isLow = false
        if (allKlines[j].close > price) isHigh = false
      }

      // Check confirmation after (SWING_CONFIRM days)
      for (let j = i + 1; j <= Math.min(i + SWING_CONFIRM, currentDayIndex); j++) {
        if (allKlines[j].close < price) isLow = false
        if (allKlines[j].close > price) isHigh = false
      }

      if (isLow) {
        // Avoid duplicate types: skip if last point was also a low
        if (points.length === 0 || points[points.length - 1].type !== "low") {
          points.push({ idx: i, price, type: "low", date: formatDate(allKlines[i].timestamp) })
        } else if (price < points[points.length - 1].price) {
          // Replace with lower low
          points[points.length - 1] = { idx: i, price, type: "low", date: formatDate(allKlines[i].timestamp) }
        }
      }
      if (isHigh) {
        if (points.length === 0 || points[points.length - 1].type !== "high") {
          points.push({ idx: i, price, type: "high", date: formatDate(allKlines[i].timestamp) })
        } else if (price > points[points.length - 1].price) {
          points[points.length - 1] = { idx: i, price, type: "high", date: formatDate(allKlines[i].timestamp) }
        }
      }
    }
    return points
  }, [allKlines, currentDayIndex])

  // Current swing phase
  const lastSwing = swingPoints.length > 0 ? swingPoints[swingPoints.length - 1] : null
  const prevSwing = swingPoints.length > 1 ? swingPoints[swingPoints.length - 2] : null
  const swingPhase = lastSwing?.type === "low" ? "upswing" : lastSwing?.type === "high" ? "downswing" : "unknown"

  // Swing amplitude: % move from last swing point to current price
  const swingAmplitude = lastSwing && lastSwing.price > 0
    ? ((currentPrice - lastSwing.price) / lastSwing.price) * 100
    : 0

  // Detect if we're near a fresh swing point (within 3 days)
  const nearSwingLow = lastSwing?.type === "low" && (currentDayIndex - lastSwing.idx) <= SWING_CONFIRM + 1
  const nearSwingHigh = lastSwing?.type === "high" && (currentDayIndex - lastSwing.idx) <= SWING_CONFIRM + 1

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
    if (profitableSwingCount >= 1 && !tasks.profitableSwing) setTasks((prev) => ({ ...prev, profitableSwing: true }))
    if (profitableSwingCount >= SWING_TARGET && !tasks.multipleSwings) setTasks((prev) => ({ ...prev, multipleSwings: true }))
  }, [profitableSwingCount, tasks.profitableSwing, tasks.multipleSwings])

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

    let tag: "swing-low" | "none" = "none"
    if (nearSwingLow) {
      tag = "swing-low"
      setBoughtOnSwingLow(true)
      if (!tasks.boughtSwingLow) setTasks((prev) => ({ ...prev, boughtSwingLow: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", swingTag: tag,
    }])
  }, [quantity, currentPrice, cash, holdings, nearSwingLow, currentDayIndex, currentKline, tasks.boughtSwingLow])

  const handleSell = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || qty > holdings || !currentPrice) return
    const proceeds = qty * currentPrice
    const costBasis = qty * avgCost
    const tradePnl = proceeds - costBasis
    const tradePctReturn = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
    setRealizedPnl((prev) => prev + tradePnl)
    setCash((prev) => prev + proceeds)

    const holdDays = buyDayIndex !== null ? currentDayIndex - buyDayIndex : 0

    setHoldings((prev) => {
      const remaining = prev - qty
      if (remaining === 0) {
        setAvgCost(0)
        setBuyDayIndex(null)
        setBoughtOnSwingLow(false)
      }
      return remaining
    })

    let tag: "swing-high" | "none" = "none"
    if (nearSwingHigh) {
      tag = "swing-high"
      if (!tasks.soldSwingHigh) setTasks((prev) => ({ ...prev, soldSwingHigh: true }))
    }

    // Profitable swing trade (bought on swing low, profit >= threshold)
    if (boughtOnSwingLow && tradePctReturn >= SWING_PROFIT_PCT) {
      setProfitableSwingCount((prev) => prev + 1)
    }

    // Patience task: held for MIN_HOLD_DAYS+
    if (holdDays >= MIN_HOLD_DAYS && !tasks.heldForSwing) {
      setTasks((prev) => ({ ...prev, heldForSwing: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, swingTag: tag, holdDays,
    }])
  }, [quantity, currentPrice, holdings, avgCost, nearSwingHigh, boughtOnSwingLow, buyDayIndex, currentDayIndex, currentKline, tasks.soldSwingHigh, tasks.heldForSwing])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setBuyDayIndex(null); setBoughtOnSwingLow(false); setProfitableSwingCount(0)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      boughtSwingLow: false, soldSwingHigh: false, profitableSwing: false,
      multipleSwings: false, heldForSwing: false, madeProfit: false,
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

  // Current hold duration
  const holdDuration = buyDayIndex !== null ? currentDayIndex - buyDayIndex : 0

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

  // Recent swing points for display (last 10)
  const recentSwings = swingPoints.slice(-10)

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
              <h1 className="text-2xl font-bold text-foreground">Lab 17: Catch the Swing</h1>
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

        {/* Swing Dashboard */}
        <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Swing Phase */}
            <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
              swingPhase === "upswing"
                ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                : swingPhase === "downswing"
                  ? "border-red-400/60 bg-red-50 dark:bg-red-900/20"
                  : "border-border bg-background/30"
            }`}>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Activity className="h-3 w-3" /> Swing Phase
              </div>
              <div className={`text-sm font-bold mt-0.5 ${
                swingPhase === "upswing" ? "text-primary"
                : swingPhase === "downswing" ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
              }`}>
                {swingPhase === "upswing" ? "UPSWING" : swingPhase === "downswing" ? "DOWNSWING" : "Detecting..."}
              </div>
              {lastSwing && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  From {lastSwing.type === "low" ? "swing low" : "swing high"} @ PKR {lastSwing.price.toFixed(1)}
                </div>
              )}
            </div>

            {/* Swing Amplitude Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Swing Move</span>
                <span className={`font-semibold ${swingAmplitude >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {swingAmplitude >= 0 ? "+" : ""}{swingAmplitude.toFixed(1)}%
                </span>
              </div>
              {/* Swing bar — centered, shows amplitude */}
              <div className="relative h-6 rounded-lg overflow-hidden bg-muted/30 border border-border">
                <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40 z-10" />
                {/* 5% target markers */}
                <div className="absolute inset-y-0 z-5 border-l border-dashed border-emerald-400/50" style={{ left: "75%" }} />
                <div className="absolute inset-y-0 z-5 border-l border-dashed border-red-400/50" style={{ left: "25%" }} />
                {/* Amplitude bar */}
                {swingAmplitude >= 0 ? (
                  <div
                    className={`absolute inset-y-1 rounded-r transition-all duration-300 ${
                      swingAmplitude >= SWING_PROFIT_PCT ? "bg-emerald-500/70" : "bg-emerald-300/50"
                    }`}
                    style={{ left: "50%", width: `${Math.min(50, (swingAmplitude / 15) * 50)}%` }}
                  />
                ) : (
                  <div
                    className={`absolute inset-y-1 rounded-l transition-all duration-300 ${
                      Math.abs(swingAmplitude) >= SWING_PROFIT_PCT ? "bg-red-500/70" : "bg-red-300/50"
                    }`}
                    style={{ right: "50%", width: `${Math.min(50, (Math.abs(swingAmplitude) / 15) * 50)}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                <span className="text-red-600">-{SWING_PROFIT_PCT}%</span>
                <span>0%</span>
                <span className="text-emerald-600">+{SWING_PROFIT_PCT}%</span>
              </div>
            </div>

            {/* Last Swing / Signal */}
            <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
              nearSwingLow
                ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                : nearSwingHigh
                  ? "border-red-400/60 bg-red-50 dark:bg-red-900/20"
                  : "border-border bg-background/30"
            }`}>
              {nearSwingLow ? (
                <>
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <ArrowDown className="h-3 w-3" /> Swing Low Confirmed
                  </div>
                  <div className="text-[10px] font-bold text-primary mt-1 animate-pulse">
                    BUY SIGNAL
                  </div>
                </>
              ) : nearSwingHigh ? (
                <>
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-red-700 dark:text-red-300">
                    <ArrowUp className="h-3 w-3" /> Swing High Confirmed
                  </div>
                  <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 animate-pulse">
                    SELL SIGNAL
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Activity className="h-3 w-3" /> Signal
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Wait for swing reversal...
                  </div>
                </>
              )}
            </div>
          </div>
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
                {/* Signal Alert */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  nearSwingLow ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20" :
                  nearSwingHigh ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" :
                  "border-border bg-background/30"
                }`}>
                  {nearSwingLow ? (
                    <><TrendingDown className="h-4 w-4 text-emerald-500" /><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Swing low confirmed — Buy the reversal</span></>
                  ) : nearSwingHigh ? (
                    <><TrendingUp className="h-4 w-4 text-red-500" /><span className="text-xs font-semibold text-red-700 dark:text-red-300">Swing high confirmed — Sell into the peak</span></>
                  ) : swingPhase === "upswing" ? (
                    <><TrendingUp className="h-4 w-4 text-emerald-500/50" /><span className="text-xs text-muted-foreground">Upswing in progress — hold or wait for peak</span></>
                  ) : swingPhase === "downswing" ? (
                    <><TrendingDown className="h-4 w-4 text-red-500/50" /><span className="text-xs text-muted-foreground">Downswing in progress — wait for trough</span></>
                  ) : (
                    <><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Detecting swing pattern...</span></>
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
                      {holdings > 0 ? `Hold: ${holdDuration}d` : "Swings"}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {holdings > 0 ? (
                        <span className={holdDuration >= MIN_HOLD_DAYS ? "text-emerald-500" : ""}>
                          {holdDuration}/{MIN_HOLD_DAYS}d
                        </span>
                      ) : (
                        `${profitableSwingCount}/${SWING_TARGET}`
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
                    nearSwingLow ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-emerald-400/50 animate-pulse" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`} onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}>
                    Buy{nearSwingLow ? " (Swing!)" : ""}
                  </Button>
                  <Button className={`w-full cursor-pointer ${
                    nearSwingHigh ? "bg-red-600 hover:bg-red-500 ring-2 ring-red-400/50 animate-pulse" : "bg-red-600 hover:bg-red-500"
                  }`} onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    Sell{nearSwingHigh ? " (Swing!)" : ""}
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

        {/* Swing Points Log */}
        {recentSwings.length > 0 && (
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Swing Points ({swingPoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recentSwings.map((sp, i) => (
                  <div
                    key={i}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      sp.type === "low"
                        ? "border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-red-400/60 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                    }`}
                  >
                    {sp.type === "low" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                    {sp.date} @ PKR {sp.price.toFixed(1)}
                    {/* Show amplitude between consecutive swings */}
                    {i > 0 && (
                      <span className="text-[9px] opacity-70 ml-1">
                        ({((sp.price - recentSwings[i - 1].price) / recentSwings[i - 1].price * 100) >= 0 ? "+" : ""}
                        {((sp.price - recentSwings[i - 1].price) / recentSwings[i - 1].price * 100).toFixed(1)}%)
                      </span>
                    )}
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
                if (key === "multipleSwings") label = `Complete ${SWING_TARGET} profitable swings (${profitableSwingCount}/${SWING_TARGET})`
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
              <p className="text-sm text-muted-foreground">No trades yet. Wait for a confirmed swing low to buy.</p>
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
                          {t.swingTag === "swing-low" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <ArrowDown className="h-2.5 w-2.5" /> Swing L
                            </span>
                          ) : t.swingTag === "swing-high" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              <ArrowUp className="h-2.5 w-2.5" /> Swing H
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
