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
  CandlestickChart,
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

const LAB_SYMBOL = "ENGROH"
const STARTING_CASH = 120_000
const PROFIT_TARGET = 8_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const LEAD_IN_DAYS = 60
const PATTERN_WINDOW = 2 // buy within 2 candles of pattern
const TRADE_PROFIT_TARGET_PCT = 5
const PROFITABLE_PATTERN_TRADES_TARGET = 2
const FULL_CYCLES_TARGET = 3

// ── Types ──

type TaskKey =
  | "spottedPattern"
  | "boughtAfterPattern"
  | "profitablePatternTrade"
  | "multiplePatternTrades"
  | "fullCycles"
  | "madeProfit"

type Tasks = Record<TaskKey, boolean>

type PatternEvent = {
  dayIndex: number
  date: string
  prevOpen: number
  prevClose: number
  currOpen: number
  currClose: number
}

type TradeRecord = {
  id: number
  side: "buy" | "sell"
  qty: number
  price: number
  dayIndex: number
  date: string
  pnl?: number
  pnlPct?: number
  patternBased: boolean
}

const TASK_LABELS: Record<TaskKey, string> = {
  spottedPattern: "Spot a bullish engulfing pattern",
  boughtAfterPattern: "Buy within 2 candles of a bullish engulfing",
  profitablePatternTrade: `Sell a pattern trade for > ${TRADE_PROFIT_TARGET_PCT}% profit`,
  multiplePatternTrades: `Complete ${PROFITABLE_PATTERN_TRADES_TARGET} profitable pattern trades (> ${TRADE_PROFIT_TARGET_PCT}%)`,
  fullCycles: `Complete ${FULL_CYCLES_TARGET} full buy-sell cycles`,
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "spottedPattern",
  "boughtAfterPattern",
  "profitablePatternTrade",
  "multiplePatternTrades",
  "fullCycles",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 7: Bullish Engulfing",
    body: `Candlestick patterns are visual signals formed by price action. In this lab you'll learn to identify and trade the bullish engulfing pattern — one of the most reliable reversal signals. You start with PKR ${STARTING_CASH.toLocaleString()} trading ${LAB_SYMBOL}.`,
  },
  {
    title: "What is a Bullish Engulfing?",
    body: "A bullish engulfing pattern occurs when a small bearish (red) candle is followed by a larger bullish (green) candle whose body completely covers the previous candle's body. This signals that buyers have overwhelmed sellers — a potential trend reversal upward.",
  },
  {
    title: "How to Spot It",
    body: "Look for: 1) A red candle (close < open), then 2) A green candle that opens at or below the red candle's close AND closes at or above the red candle's open. The bigger the green candle relative to the red, the stronger the signal.",
  },
  {
    title: "Trading the Pattern",
    body: `When a bullish engulfing is detected, you have ${PATTERN_WINDOW} candles to enter a position. The pattern alert will flash and the buy button will glow. Your target is to sell for > ${TRADE_PROFIT_TARGET_PCT}% profit on each pattern trade.`,
  },
  {
    title: "Your Tasks",
    body: `Complete all 6 tasks: spot a pattern, trade it, make ${PROFITABLE_PATTERN_TRADES_TARGET} profitable pattern trades (>${TRADE_PROFIT_TARGET_PCT}%), complete ${FULL_CYCLES_TARGET} full cycles, and hit your PKR ${PROFIT_TARGET.toLocaleString()} profit target!`,
  },
]

// ── Helpers ──

function isBullishEngulfing(prev: SimKlinePoint, curr: SimKlinePoint): boolean {
  const prevBearish = prev.close < prev.open
  const currBullish = curr.close > curr.open
  return prevBearish && currBullish && curr.open <= prev.close && curr.close >= prev.open
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Lab Complete!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've learned to identify and trade bullish engulfing patterns! This powerful
          reversal signal helps you spot when buyers take control. Combined with other
          indicators, it's a key weapon in any trader's toolkit.
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

export default function Lab7Page() {
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

  // Pattern tracking
  const [detectedPatterns, setDetectedPatterns] = useState<PatternEvent[]>([])
  const [lastPatternIndex, setLastPatternIndex] = useState<number | null>(null)
  const [patternBuyActive, setPatternBuyActive] = useState(false) // bought after a pattern

  // Trade tracking
  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)
  const [profitablePatternTrades, setProfitablePatternTrades] = useState(0)
  const [fullCycles, setFullCycles] = useState(0)
  const [sellCount, setSellCount] = useState(0)

  const [tasks, setTasks] = useState<Tasks>({
    spottedPattern: false,
    boughtAfterPattern: false,
    profitablePatternTrade: false,
    multiplePatternTrades: false,
    fullCycles: false,
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
          .filter((k) => Number.isFinite(k.timestamp) && Number.isFinite(k.close) && k.timestamp <= DATA_CUTOFF_MS)
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

  // Detect patterns up to current day
  const currentPatterns = useMemo(() => {
    const patterns: PatternEvent[] = []
    for (let i = 1; i <= currentDayIndex && i < allKlines.length; i++) {
      if (isBullishEngulfing(allKlines[i - 1], allKlines[i])) {
        patterns.push({
          dayIndex: i,
          date: formatDate(allKlines[i].timestamp),
          prevOpen: allKlines[i - 1].open,
          prevClose: allKlines[i - 1].close,
          currOpen: allKlines[i].open,
          currClose: allKlines[i].close,
        })
      }
    }
    return patterns
  }, [allKlines, currentDayIndex])

  // Check if we're within the buy window of a recent pattern
  const activePattern = useMemo(() => {
    if (currentPatterns.length === 0) return null
    const latest = currentPatterns[currentPatterns.length - 1]
    if (currentDayIndex - latest.dayIndex <= PATTERN_WINDOW) return latest
    return null
  }, [currentPatterns, currentDayIndex])

  // Auto-detect new patterns and mark task
  useEffect(() => {
    if (currentPatterns.length > detectedPatterns.length) {
      setDetectedPatterns(currentPatterns)
      if (!tasks.spottedPattern) setTasks((prev) => ({ ...prev, spottedPattern: true }))
    }
  }, [currentPatterns, detectedPatterns.length, tasks.spottedPattern])

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
    if (profitablePatternTrades >= 1 && !tasks.profitablePatternTrade)
      setTasks((prev) => ({ ...prev, profitablePatternTrade: true }))
    if (profitablePatternTrades >= PROFITABLE_PATTERN_TRADES_TARGET && !tasks.multiplePatternTrades)
      setTasks((prev) => ({ ...prev, multiplePatternTrades: true }))
  }, [profitablePatternTrades, tasks.profitablePatternTrade, tasks.multiplePatternTrades])

  useEffect(() => {
    if (fullCycles >= FULL_CYCLES_TARGET && !tasks.fullCycles)
      setTasks((prev) => ({ ...prev, fullCycles: true }))
  }, [fullCycles, tasks.fullCycles])

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
      trades,
      tasks,
      guideStep,
      completionShown: completionShownRef.current,
    }),
    [avgCost, cash, currentDayIndex, guideStep, holdings, quantity, realizedPnl, tasks, trades]
  )

  const handleResume = useCallback((snapshot: Record<string, unknown>) => {
    resumeAppliedRef.current = true
    if (typeof snapshot.currentDayIndex === "number") setCurrentDayIndex(snapshot.currentDayIndex)
    if (typeof snapshot.cash === "number") setCash(snapshot.cash)
    if (snapshot.holdings !== undefined) setHoldings(snapshot.holdings as never)
    if (typeof snapshot.avgCost === "number") setAvgCost(snapshot.avgCost)
    if (typeof snapshot.realizedPnl === "number") setRealizedPnl(snapshot.realizedPnl)
    if (typeof snapshot.quantity === "string") setQuantity(snapshot.quantity)
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

  // Handlers

  const handleBuy = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || !currentPrice) return
    const cost = qty * currentPrice
    if (cost > cash) return
    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)

    const isPatternBuy = activePattern !== null
    if (isPatternBuy) {
      setPatternBuyActive(true)
      if (!tasks.boughtAfterPattern) setTasks((prev) => ({ ...prev, boughtAfterPattern: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      patternBased: isPatternBuy,
    }])
  }, [quantity, currentPrice, cash, holdings, currentDayIndex, currentKline, activePattern, tasks.boughtAfterPattern])

  const handleSell = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || qty > holdings || !currentPrice) return
    const proceeds = qty * currentPrice
    const costBasis = qty * avgCost
    const tradePnl = proceeds - costBasis
    const tradePnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
    setRealizedPnl((prev) => prev + tradePnl)
    setCash((prev) => prev + proceeds)

    const isFullSell = qty >= holdings
    setHoldings((prev) => {
      const remaining = prev - qty
      if (remaining === 0) setAvgCost(0)
      return remaining
    })

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, pnlPct: tradePnlPct, patternBased: patternBuyActive,
    }])

    // Count profitable pattern trades
    if (patternBuyActive && tradePnlPct >= TRADE_PROFIT_TARGET_PCT) {
      setProfitablePatternTrades((prev) => prev + 1)
    }

    // Count full cycles
    if (isFullSell) {
      setFullCycles((prev) => prev + 1)
      setPatternBuyActive(false)
    }
    setSellCount((prev) => prev + 1)
  }, [quantity, currentPrice, holdings, avgCost, currentDayIndex, currentKline, patternBuyActive])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setCurrentDayIndex(initialDayIndex)
    setDetectedPatterns([]); setLastPatternIndex(null); setPatternBuyActive(false)
    setTrades([]); tradeIdRef.current = 0; setProfitablePatternTrades(0)
    setFullCycles(0); setSellCount(0)
    setTasks({
      spottedPattern: false, boughtAfterPattern: false, profitablePatternTrade: false,
      multiplePatternTrades: false, fullCycles: false, madeProfit: false,
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
              <h1 className="text-2xl font-bold text-foreground">Lab 7: Trade a Bullish Engulfing</h1>
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

        {/* Pattern Alert Banner */}
        {activePattern && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3 dark:bg-amber-900/20 animate-pulse">
            <CandlestickChart className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Bullish Engulfing Detected!
              </div>
              <div className="text-xs text-amber-600/80 dark:text-amber-400/80">
                Spotted on {activePattern.date} — Buy window open for {PATTERN_WINDOW - (currentDayIndex - activePattern.dayIndex)} more candle{PATTERN_WINDOW - (currentDayIndex - activePattern.dayIndex) !== 1 ? "s" : ""}!
              </div>
            </div>
            <Zap className="h-5 w-5 flex-shrink-0 text-amber-500 animate-bounce" />
          </div>
        )}

        {/* Pattern Status */}
        <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Patterns Found</div>
              <div className="text-lg font-bold text-foreground">{currentPatterns.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pattern Trades (&gt;{TRADE_PROFIT_TARGET_PCT}%)</div>
              <div className="text-lg font-bold text-emerald-600">{profitablePatternTrades}/{PROFITABLE_PATTERN_TRADES_TARGET}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Full Cycles</div>
              <div className="text-lg font-bold text-foreground">{fullCycles}/{FULL_CYCLES_TARGET}</div>
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
          {/* Chart — candles only for this lab */}
          <Card className="min-w-0 border border-border/60 bg-card/90">
            <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <CandlestickChart className="h-4 w-4 text-amber-500" />
                {LAB_SYMBOL} Candlestick Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden" style={{ height: 380 }}>
              <PriceChart data={chartData} candles={candleData} volumeByTime={volumeByTime} viewMode="candles" lastPrice={currentPrice} height={380} timeMode="date" />
            </CardContent>
          </Card>

          {/* Trading Panel */}
          <div className="space-y-4">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="py-3">
                <CardTitle className="text-base text-foreground">Trade {LAB_SYMBOL}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
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

                {/* Unrealized P&L % */}
                {holdings > 0 && avgCost > 0 && (
                  <div className={`rounded-md border px-3 py-2 text-center ${
                    ((currentPrice - avgCost) / avgCost) * 100 >= TRADE_PROFIT_TARGET_PCT
                      ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-border bg-background/30"
                  }`}>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Position Return</div>
                    <div className={`text-sm font-bold ${pnlColor(currentPrice - avgCost)}`}>
                      {((currentPrice - avgCost) / avgCost * 100).toFixed(1)}%
                      {((currentPrice - avgCost) / avgCost) * 100 >= TRADE_PROFIT_TARGET_PCT && (
                        <span className="ml-1 text-xs text-emerald-500">Target reached!</span>
                      )}
                    </div>
                  </div>
                )}

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
                      activePattern
                        ? "bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/50"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}
                  >
                    {activePattern ? (
                      <><CandlestickChart className="mr-1 h-3.5 w-3.5" /> Pattern Buy</>
                    ) : "Buy"}
                  </Button>
                  <Button className="w-full bg-red-600 hover:bg-red-500 cursor-pointer" onClick={handleSell}
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
                let label = TASK_LABELS[key]
                if (key === "multiplePatternTrades") label = `Complete ${PROFITABLE_PATTERN_TRADES_TARGET} profitable pattern trades (${profitablePatternTrades}/${PROFITABLE_PATTERN_TRADES_TARGET})`
                if (key === "fullCycles") label = `Complete ${FULL_CYCLES_TARGET} full cycles (${fullCycles}/${FULL_CYCLES_TARGET})`
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

        {/* Recent Patterns + Trade History side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Patterns */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <CandlestickChart className="h-4 w-4 text-amber-500" />
                Detected Patterns ({currentPatterns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPatterns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bullish engulfing patterns detected yet. Skip forward to find one.</p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                  {[...currentPatterns].reverse().slice(0, 10).map((p, i) => {
                    const isActive = activePattern?.dayIndex === p.dayIndex
                    return (
                      <div key={p.dayIndex} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${
                        isActive
                          ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20"
                          : "border-border bg-background/30"
                      }`}>
                        <div className="flex gap-1">
                          {/* Mini candle visualization */}
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 rounded-sm bg-red-500" style={{ height: Math.max(6, Math.min(20, Math.abs(p.prevOpen - p.prevClose) * 2)) }} />
                            <span className="text-[8px] text-muted-foreground">Bear</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 rounded-sm bg-emerald-500" style={{ height: Math.max(8, Math.min(24, Math.abs(p.currClose - p.currOpen) * 2)) }} />
                            <span className="text-[8px] text-muted-foreground">Bull</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{p.date}</div>
                          <div className="text-muted-foreground">
                            Close: PKR {p.currClose.toFixed(2)}
                          </div>
                        </div>
                        {isActive && (
                          <span className="rounded-full border border-amber-400/60 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trade History */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-foreground">Trade History ({trades.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trades yet. Wait for a bullish engulfing pattern, then buy.</p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto pr-1">
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
                            {t.patternBased ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                <CandlestickChart className="h-2.5 w-2.5" /> BE
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="p-1.5 text-right text-xs">{t.qty}</td>
                          <td className="p-1.5 text-right text-xs">{t.price.toFixed(2)}</td>
                          <td className={`p-1.5 text-right text-xs font-semibold ${t.pnl === undefined ? "text-muted-foreground" : pnlColor(t.pnl)}`}>
                            {t.pnl !== undefined ? (
                              <>{fmt(t.pnl, true)} <span className="text-[9px]">({t.pnlPct?.toFixed(1)}%)</span></>
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
        </div>
      </main>
    </div>
  )
}
