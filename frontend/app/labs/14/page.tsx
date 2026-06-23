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
  ShieldCheck,
  TrendingDown,
  Mountain,
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
const STARTING_CASH = 150_000
const PROFIT_TARGET = 10_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2020-10-01").getTime() // start before the rally
const LEAD_IN_DAYS = 40
const SWING_WINDOW = 10 // 10-day window for swing detection
const NECKLINE_BREAK_CONFIRM = 2 // need 2 closes below neckline for confirmation

// ── Types ──

type TaskKey =
  | "boughtRally"
  | "patternDetected"
  | "soldBeforeBreak"
  | "necklineBroke"
  | "boughtLower"
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
  signal?: string
}

type PatternPhase =
  | "none"
  | "rallyUp"
  | "leftShoulder"
  | "headForming"
  | "headComplete"
  | "rightShoulder"
  | "necklineTest"
  | "breakdown"
  | "confirmed"

type SwingPoint = {
  dayIndex: number
  price: number
  date: string
  type: "high" | "low"
}

const TASK_LABELS: Record<TaskKey, string> = {
  boughtRally: "Buy a position during the rally",
  patternDetected: "Head & Shoulders pattern detected",
  soldBeforeBreak: "Sell your position before or at the neckline break",
  necklineBroke: "Neckline breakdown confirmed",
  boughtLower: "Buy back at a lower price after the breakdown",
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "boughtRally",
  "patternDetected",
  "soldBeforeBreak",
  "necklineBroke",
  "boughtLower",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 14: Head & Shoulders",
    body: `The Head & Shoulders is the most reliable reversal pattern in technical analysis. It signals the end of an uptrend. In this lab, you'll trade ${LAB_SYMBOL} through a real H&S formation. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "Anatomy of the Pattern",
    body: "The H&S has three peaks: a Left Shoulder, a higher Head, and a Right Shoulder (similar height to the left). The valleys between these peaks form the Neckline — the critical support level. When price breaks below the neckline, the reversal is confirmed.",
  },
  {
    title: "How to Trade It",
    body: "Strategy: Buy during the rally (before the pattern forms), then SELL when you see the right shoulder forming or when price approaches the neckline. After the neckline breaks, wait for the drop, then buy back at a lower price for the second profit.",
  },
  {
    title: "Pattern Detection",
    body: "This lab auto-detects swing highs and lows to identify the pattern. The Pattern Status panel shows which phase is forming. Watch for the progression: Rally → Left Shoulder → Head → Right Shoulder → Neckline Test → Breakdown.",
  },
  {
    title: "Your Tasks",
    body: `Buy during the rally, sell before the neckline breaks, wait for the breakdown confirmation, then buy back lower. Target: PKR ${PROFIT_TARGET.toLocaleString()} total profit from both trades.`,
  },
]

const PHASE_LABELS: Record<PatternPhase, string> = {
  none: "No Pattern",
  rallyUp: "Rally in Progress",
  leftShoulder: "Left Shoulder Forming",
  headForming: "Head Forming",
  headComplete: "Head Complete — Watch for Right Shoulder",
  rightShoulder: "Right Shoulder Forming",
  necklineTest: "Neckline Test — Sell Signal!",
  breakdown: "Neckline Breaking Down!",
  confirmed: "Breakdown Confirmed — Pattern Complete",
}

const PHASE_COLORS: Record<PatternPhase, string> = {
  none: "text-muted-foreground",
  rallyUp: "text-primary",
  leftShoulder: "text-amber-600 dark:text-amber-400",
  headForming: "text-amber-600 dark:text-amber-400",
  headComplete: "text-orange-600 dark:text-orange-400",
  rightShoulder: "text-orange-600 dark:text-orange-400",
  necklineTest: "text-red-600 dark:text-red-400",
  breakdown: "text-red-600 dark:text-red-400 animate-pulse",
  confirmed: "text-red-700 dark:text-red-300",
}

// ── Helpers ──

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(ts))
}

function findSwingHighs(klines: SimKlinePoint[], upToIndex: number, window: number): SwingPoint[] {
  const swings: SwingPoint[] = []
  for (let i = window; i <= upToIndex - window; i++) {
    let isHigh = true
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && klines[j].high >= klines[i].high) { isHigh = false; break }
    }
    if (isHigh) {
      swings.push({ dayIndex: i, price: klines[i].high, date: formatDate(klines[i].timestamp), type: "high" })
    }
  }
  return swings
}

function findSwingLows(klines: SimKlinePoint[], fromIdx: number, toIdx: number): SwingPoint | null {
  let minLow = Infinity
  let minIdx = -1
  for (let i = fromIdx; i <= toIdx; i++) {
    if (klines[i] && klines[i].low < minLow) {
      minLow = klines[i].low
      minIdx = i
    }
  }
  if (minIdx < 0) return null
  return { dayIndex: minIdx, price: minLow, date: formatDate(klines[minIdx].timestamp), type: "low" }
}

// ── Shared components ──

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const colors = ["#22c55e", "#38bdf8", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"]
    const pieces: { x: number; y: number; w: number; h: number; color: string; vx: number; vy: number; rot: number; vr: number; opacity: number }[] = []
    for (let i = 0; i < 150; i++) pieces.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * -1, w: Math.random() * 8 + 4, h: Math.random() * 6 + 2, color: colors[Math.floor(Math.random() * colors.length)], vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.2, opacity: 1 })
    let frame: number
    const animate = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); let alive = false; for (const p of pieces) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr; if (p.y > canvas.height) p.opacity -= 0.02; if (p.opacity <= 0) continue; alive = true; ctx.save(); ctx.globalAlpha = Math.max(0, p.opacity); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore() }; if (alive) frame = requestAnimationFrame(animate) }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[100]" style={{ width: "100vw", height: "100vh" }} />
}

function GuideOverlay({ step, total, title, body, onNext, onSkip, onBack }: { step: number; total: number; title: string; body: string; onNext: () => void; onSkip: () => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-emerald-500" /><span className="text-xs font-medium text-muted-foreground">Step {step + 1} of {total}</span></div>
          <button onClick={onSkip} className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Skip guide</button>
          <div className="flex items-center gap-2">{step > 0 && (<Button size="sm" variant="outline" onClick={onBack} className="cursor-pointer"><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>)}<Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onNext}>{step < total - 1 ? (<>Next <ChevronRight className="ml-1 h-4 w-4" /></>) : "Let's go!"}</Button></div>
        </div>
      </div>
    </div>
  )
}

function CompletionDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-emerald-500/50 bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20"><Check className="h-8 w-8 text-primary" /></div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Pattern Master!</h2>
        <p className="mb-6 text-sm text-muted-foreground">You successfully identified and traded a Head & Shoulders reversal. You sold before the breakdown and bought back lower — exactly how professionals trade chart patterns. This pattern recognition skill will serve you across all markets.</p>
        <div className="flex flex-col gap-2">
          <Link href="/labs"><Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">Back to Labs</Button></Link>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Keep Exploring</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──

export default function Lab14Page() {
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

  // Pattern tracking
  const [soldAtHigher, setSoldAtHigher] = useState(false) // sold before breakdown
  const [breakdownPrice, setBreakdownPrice] = useState<number | null>(null)
  const [boughtBackLower, setBoughtBackLower] = useState(false)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    boughtRally: false,
    patternDetected: false,
    soldBeforeBreak: false,
    necklineBroke: false,
    boughtLower: false,
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

  // ── H&S Pattern Detection ──
  const patternAnalysis = useMemo(() => {
    if (currentDayIndex < SWING_WINDOW * 3) return { phase: "none" as PatternPhase, swingHighs: [] as SwingPoint[], neckline: null as number | null, leftShoulder: null as SwingPoint | null, head: null as SwingPoint | null, rightShoulder: null as SwingPoint | null }

    const swingHighs = findSwingHighs(allKlines, currentDayIndex, SWING_WINDOW)

    // Need at least 3 swing highs
    if (swingHighs.length < 3) return { phase: "rallyUp" as PatternPhase, swingHighs, neckline: null, leftShoulder: null, head: null, rightShoulder: null }

    // Look at last 3 significant swing highs
    const recent = swingHighs.slice(-3)
    const [sh1, sh2, sh3] = recent

    // H&S check: middle peak is highest, shoulders are within 15% of each other
    const isHS = sh2.price > sh1.price && sh2.price > sh3.price &&
      Math.abs(sh1.price - sh3.price) / sh1.price < 0.15

    if (!isHS) {
      // Check if we have 2 peaks and price is rising
      if (swingHighs.length >= 2) {
        const last2 = swingHighs.slice(-2)
        if (last2[1].price > last2[0].price) return { phase: "headForming" as PatternPhase, swingHighs, neckline: null, leftShoulder: last2[0], head: null, rightShoulder: null }
        return { phase: "leftShoulder" as PatternPhase, swingHighs, neckline: null, leftShoulder: last2[0], head: null, rightShoulder: null }
      }
      return { phase: "rallyUp" as PatternPhase, swingHighs, neckline: null, leftShoulder: null, head: null, rightShoulder: null }
    }

    // Compute neckline from swing lows between the peaks
    const low1 = findSwingLows(allKlines, sh1.dayIndex, sh2.dayIndex)
    const low2 = findSwingLows(allKlines, sh2.dayIndex, sh3.dayIndex)
    const neckline = low1 && low2 ? Math.max(low1.price, low2.price) : (low1?.price ?? low2?.price ?? null)

    // Determine phase
    let phase: PatternPhase = "rightShoulder"

    if (neckline !== null) {
      // Count closes below neckline after right shoulder
      let closesBelowNeckline = 0
      for (let i = sh3.dayIndex; i <= currentDayIndex; i++) {
        if (allKlines[i] && allKlines[i].close < neckline) closesBelowNeckline++
      }

      if (closesBelowNeckline >= NECKLINE_BREAK_CONFIRM) {
        phase = "confirmed"
      } else if (currentPrice < neckline) {
        phase = "breakdown"
      } else if (currentPrice < neckline * 1.02) {
        phase = "necklineTest"
      } else {
        phase = "rightShoulder"
      }
    }

    return { phase, swingHighs, neckline, leftShoulder: sh1, head: sh2, rightShoulder: sh3 }
  }, [allKlines, currentDayIndex])

  const { phase, neckline, leftShoulder, head, rightShoulder } = patternAnalysis
  const isBreakdown = phase === "breakdown" || phase === "confirmed"
  const isNearNeckline = phase === "necklineTest"
  const patternFormed = leftShoulder && head && rightShoulder && neckline !== null

  // Track breakdown price
  useEffect(() => {
    if (isBreakdown && neckline !== null && breakdownPrice === null) {
      setBreakdownPrice(neckline)
    }
  }, [isBreakdown, neckline, breakdownPrice])

  // Pattern detected task
  useEffect(() => {
    if (patternFormed && !tasks.patternDetected) {
      setTasks((prev) => ({ ...prev, patternDetected: true }))
    }
  }, [patternFormed, tasks.patternDetected])

  // Neckline broke task
  useEffect(() => {
    if (isBreakdown && !tasks.necklineBroke) {
      setTasks((prev) => ({ ...prev, necklineBroke: true }))
    }
  }, [isBreakdown, tasks.necklineBroke])

  // Profit task
  useEffect(() => {
    if (profit >= PROFIT_TARGET && !tasks.madeProfit) setTasks((prev) => ({ ...prev, madeProfit: true }))
  }, [profit, tasks.madeProfit])

  const completedCount = TASK_ORDER.filter((k) => tasks[k]).length
  const allComplete = completedCount === TASK_ORDER.length

  useEffect(() => {
    if (allComplete && !completionShownRef.current) {
      completionShownRef.current = true; setShowConfetti(true); setShowCompletion(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [allComplete])

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

  // ── Handlers ──

  const handleBuy = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || !currentPrice) return
    const cost = qty * currentPrice
    if (cost > cash) return

    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)

    // Task: bought during rally (before pattern completes)
    if (!patternFormed && !tasks.boughtRally) {
      setTasks((prev) => ({ ...prev, boughtRally: true }))
    }

    // Task: bought lower after breakdown
    if (isBreakdown && breakdownPrice !== null && currentPrice < breakdownPrice * 0.95 && !boughtBackLower) {
      setBoughtBackLower(true)
      if (!tasks.boughtLower) setTasks((prev) => ({ ...prev, boughtLower: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      signal: isBreakdown ? "Post-Breakdown" : patternFormed ? "Pattern Active" : "Rally",
    }])
  }, [quantity, currentPrice, cash, holdings, patternFormed, isBreakdown, breakdownPrice, boughtBackLower, currentDayIndex, currentKline, tasks.boughtRally, tasks.boughtLower])

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

    // Task: sold before neckline break
    if (!isBreakdown && patternFormed && !soldAtHigher) {
      setSoldAtHigher(true)
      if (!tasks.soldBeforeBreak) setTasks((prev) => ({ ...prev, soldBeforeBreak: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl,
      signal: isBreakdown ? "Post-Breakdown" : isNearNeckline ? "Neckline Sell" : patternFormed ? "Pattern Sell" : "Rally Sell",
    }])
  }, [quantity, currentPrice, holdings, avgCost, isBreakdown, isNearNeckline, patternFormed, soldAtHigher, currentDayIndex, currentKline, tasks.soldBeforeBreak])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("200"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setSoldAtHigher(false); setBreakdownPrice(null); setBoughtBackLower(false)
    setTrades([]); tradeIdRef.current = 0
    setTasks({ boughtRally: false, patternDetected: false, soldBeforeBreak: false, necklineBroke: false, boughtLower: false, madeProfit: false })
    setGuideStep(0); setShowConfetti(false); setShowCompletion(false); completionShownRef.current = false
  }, [initialDayIndex])

  const fmt = (v: number, sign = false) => { const s = sign && v > 0 ? "+" : ""; return `PKR ${s}${v.toFixed(2)}` }
  const pnlColor = (v: number) => v > 0 ? "text-emerald-500 dark:text-emerald-400" : v < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"

  // Auth
  useEffect(() => { if (!authLoading && !user) window.location.replace("/signin") }, [authLoading, user])
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="text-sm text-muted-foreground">Loading...</div></div>
  if (!user) return null
  if (dataLoading) return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar /><main className="mx-auto max-w-6xl px-4 py-10 text-center"><FlaskConical className="mx-auto mb-4 h-8 w-8 animate-pulse text-emerald-500" /><p className="text-sm text-muted-foreground">Loading historical data for {LAB_SYMBOL}...</p></main>
    </div>
  )
  if (dataError) return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar /><main className="mx-auto max-w-3xl px-4 py-10"><Card className="border border-border/60 bg-card/90"><CardHeader><CardTitle>Lab Unavailable</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{dataError}</p><Link href="/labs"><Button variant="outline" className="cursor-pointer"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Labs</Button></Link></CardContent></Card></main>
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
        <GuideOverlay step={guideStep} total={GUIDE_STEPS.length} title={GUIDE_STEPS[guideStep].title} body={GUIDE_STEPS[guideStep].body}
          onNext={() => { guideStep < GUIDE_STEPS.length - 1 ? setGuideStep(guideStep + 1) : setGuideStep(null) }}
          onBack={() => setGuideStep((s) => (s === null ? 0 : Math.max(0, s - 1)))} onSkip={() => setGuideStep(null)} />
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/labs" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lab 14: Head &amp; Shoulders</h1>
              <p className="text-xs text-muted-foreground">{LAB_SYMBOL} &middot; {dateLabel} &middot; {daysRemaining} days remaining</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setGuideStep(0)} className="text-xs cursor-pointer"><FlaskConical className="mr-1 h-3.5 w-3.5" /> Restart Guide</Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs cursor-pointer"><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset Lab</Button>
          </div>
        </div>

        {/* Pattern Status Dashboard */}
        <div className={`rounded-lg border px-4 py-3 transition-all ${
          isBreakdown ? "border-red-500/80 bg-red-50 dark:bg-red-950/30" :
          isNearNeckline ? "border-orange-400/60 bg-orange-50 dark:bg-orange-900/20" :
          patternFormed ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20" :
          "border-border bg-card/90"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <Mountain className={`h-5 w-5 ${PHASE_COLORS[phase]}`} />
            <span className={`text-sm font-bold ${PHASE_COLORS[phase]}`}>{PHASE_LABELS[phase]}</span>
          </div>

          {/* Pattern anatomy */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`rounded-md border px-2 py-1.5 text-center ${leftShoulder ? "border-amber-300/60 bg-amber-50/50 dark:bg-amber-900/10" : "border-border bg-background/30"}`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Left Shoulder</div>
              <div className="text-xs font-semibold text-foreground">{leftShoulder ? `PKR ${leftShoulder.price.toFixed(2)}` : "--"}</div>
              {leftShoulder && <div className="text-[9px] text-muted-foreground">{leftShoulder.date}</div>}
            </div>
            <div className={`rounded-md border px-2 py-1.5 text-center ${head ? "border-red-300/60 bg-red-50/50 dark:bg-red-900/10" : "border-border bg-background/30"}`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Head</div>
              <div className="text-xs font-semibold text-foreground">{head ? `PKR ${head.price.toFixed(2)}` : "--"}</div>
              {head && <div className="text-[9px] text-muted-foreground">{head.date}</div>}
            </div>
            <div className={`rounded-md border px-2 py-1.5 text-center ${rightShoulder ? "border-amber-300/60 bg-amber-50/50 dark:bg-amber-900/10" : "border-border bg-background/30"}`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Right Shoulder</div>
              <div className="text-xs font-semibold text-foreground">{rightShoulder ? `PKR ${rightShoulder.price.toFixed(2)}` : "--"}</div>
              {rightShoulder && <div className="text-[9px] text-muted-foreground">{rightShoulder.date}</div>}
            </div>
            <div className={`rounded-md border px-2 py-1.5 text-center ${neckline !== null ? (isBreakdown ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" : "border-blue-300/60 bg-blue-50/50 dark:bg-blue-900/10") : "border-border bg-background/30"}`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Neckline</div>
              <div className={`text-xs font-semibold ${isBreakdown ? "text-red-600" : "text-foreground"}`}>{neckline !== null ? `PKR ${neckline.toFixed(2)}` : "--"}</div>
              {isBreakdown && <div className="text-[9px] font-medium text-red-600 dark:text-red-400">BROKEN</div>}
            </div>
          </div>
        </div>

        {/* Breakdown alert */}
        {isBreakdown && (
          <div className="flex items-center gap-3 rounded-lg border border-red-400/60 bg-red-50 px-4 py-3 dark:bg-red-900/20">
            <TrendingDown className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400 animate-pulse" />
            <div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-300">Neckline Breakdown!</div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80">
                Price has broken below the neckline at PKR {neckline?.toFixed(2)}. The H&S reversal is {phase === "confirmed" ? "confirmed" : "in progress"}. Wait for the drop to settle, then buy back lower.
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Timeline</span><Progress value={progressPercent} className="h-1.5 flex-1" /><span>{progressPercent}%</span>
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
              <CardHeader className="py-3"><CardTitle className="text-base text-foreground">Trade {LAB_SYMBOL}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Signal */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  isBreakdown ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" :
                  isNearNeckline ? "border-orange-400/60 bg-orange-50 dark:bg-orange-900/20" :
                  patternFormed ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20" :
                  "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                }`}>
                  {isBreakdown ? (
                    <><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs font-semibold text-red-700 dark:text-red-300">Breakdown — Buy back lower</span></>
                  ) : isNearNeckline ? (
                    <><AlertTriangle className="h-4 w-4 text-orange-500" /><span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Neckline test — SELL NOW</span></>
                  ) : patternFormed ? (
                    <><Mountain className="h-4 w-4 text-amber-500" /><span className="text-xs font-semibold text-amber-700 dark:text-amber-300">H&S forming — Prepare to sell</span></>
                  ) : (
                    <><ShieldCheck className="h-4 w-4 text-emerald-500" /><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Rally — Good to buy</span></>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Cost</div>
                    <div className="text-sm font-semibold text-foreground">{holdings > 0 ? `PKR ${avgCost.toFixed(2)}` : "--"}</div>
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
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}>
                    Buy
                  </Button>
                  <Button className={`w-full cursor-pointer ${
                    isNearNeckline || (patternFormed && !isBreakdown)
                      ? "bg-red-600 hover:bg-red-500 ring-2 ring-red-400/50"
                      : "bg-red-600 hover:bg-red-500"
                  }`} onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    {isNearNeckline ? "Sell (Neckline!)" : "Sell"}
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
                <div className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1"><SkipForward className="h-3.5 w-3.5" /> Time Skip</div>
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
                const label = TASK_LABELS[key]
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    done ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200" : "border-border bg-background/30 text-muted-foreground"
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
          <CardHeader className="py-3"><CardTitle className="text-base text-foreground">Trade History ({trades.length})</CardTitle></CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet. Buy during the rally, then watch for the pattern to form.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr><th className="text-left p-1.5">Date</th><th className="text-left p-1.5">Side</th><th className="text-center p-1.5">Signal</th><th className="text-right p-1.5">Qty</th><th className="text-right p-1.5">Price</th><th className="text-right p-1.5">P&L</th></tr>
                  </thead>
                  <tbody>
                    {[...trades].reverse().map((t) => (
                      <tr key={t.id} className="border-b border-border/40">
                        <td className="p-1.5 text-xs text-muted-foreground">{t.date}</td>
                        <td className="p-1.5"><span className={`text-xs font-semibold uppercase ${t.side === "buy" ? "text-emerald-500" : "text-red-500"}`}>{t.side}</span></td>
                        <td className="p-1.5 text-center">
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${
                            t.signal === "Rally" || t.signal === "Rally Sell" ? "border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" :
                            t.signal === "Post-Breakdown" ? "border-blue-400/60 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" :
                            "border-orange-400/60 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                          }`}>{t.signal ?? "--"}</span>
                        </td>
                        <td className="p-1.5 text-right text-xs">{t.qty}</td>
                        <td className="p-1.5 text-right text-xs">{t.price.toFixed(2)}</td>
                        <td className={`p-1.5 text-right text-xs font-semibold ${t.pnl === undefined ? "text-muted-foreground" : pnlColor(t.pnl)}`}>{t.pnl !== undefined ? fmt(t.pnl, true) : "--"}</td>
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
