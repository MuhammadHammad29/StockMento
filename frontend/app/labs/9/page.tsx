"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FlaskConical,
  RotateCcw,
  Shield,
  ShieldAlert,
  SkipForward,
  X,
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
const STARTING_CASH = 200_000
const MAX_POSITION_PCT = 50 // never put more than 50% in one trade
const MAX_DRAWDOWN_PCT = 10 // keep drawdown under 10%
const TOTAL_TRADES_TARGET = 5
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const LEAD_IN_DAYS = 60

// ── Types ──

type TaskKey =
  | "setStopLoss"
  | "stopTriggered"
  | "positionDiscipline"
  | "drawdownSafe"
  | "completedTrades"
  | "endedProfitable"

type Tasks = Record<TaskKey, boolean>

type TradeRecord = {
  id: number
  side: "buy" | "sell"
  qty: number
  price: number
  dayIndex: number
  date: string
  pnl?: number
  trigger?: "manual" | "stop-loss"
}

const TASK_LABELS: Record<TaskKey, string> = {
  setStopLoss: "Set a stop-loss price on a buy",
  stopTriggered: "Have a stop-loss trigger automatically",
  positionDiscipline: `Never exceed ${MAX_POSITION_PCT}% of capital in a single position`,
  drawdownSafe: `Keep max drawdown under ${MAX_DRAWDOWN_PCT}%`,
  completedTrades: `Complete ${TOTAL_TRADES_TARGET} trades (buys + sells)`,
  endedProfitable: "End with more equity than you started",
}

const TASK_ORDER: TaskKey[] = [
  "setStopLoss",
  "stopTriggered",
  "positionDiscipline",
  "drawdownSafe",
  "completedTrades",
  "endedProfitable",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 9: Risk Management",
    body: `This is the most important skill in trading — protecting your capital. You'll trade ${LAB_SYMBOL} starting with PKR ${STARTING_CASH.toLocaleString()} and learn to use stop losses, manage position sizes, and control drawdowns.`,
  },
  {
    title: "Stop-Loss Orders",
    body: "When buying, you can set a stop-loss price. If the stock drops to that price while you skip forward, your position automatically sells at the stop price. This limits your downside on any trade.",
  },
  {
    title: "Position Sizing",
    body: `Never put more than ${MAX_POSITION_PCT}% of your capital into a single position. The panel shows what percentage of your equity each trade represents. Staying disciplined here is key to long-term survival.`,
  },
  {
    title: "Drawdown Management",
    body: `Drawdown is how far your equity has fallen from its peak. You need to keep your maximum drawdown under ${MAX_DRAWDOWN_PCT}%. The drawdown tracker at the top helps you monitor this in real time.`,
  },
  {
    title: "Your Tasks",
    body: "Complete all 6 tasks. Set and trigger a stop loss, maintain position discipline, keep drawdown controlled, make 5 trades, and end with more money than you started. Good luck!",
  },
]

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
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Lab Complete!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've learned the fundamentals of risk management! You know how to set stop losses,
          size positions properly, and keep drawdowns under control. These skills will protect
          your capital in real trading.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/labs"><Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">Back to Labs</Button></Link>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Keep Exploring</Button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(ts))
}

// ── Main ──

export default function Lab9Page() {
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
  const [stopLossPrice, setStopLossPrice] = useState("")
  const [activeStopLoss, setActiveStopLoss] = useState<number | null>(null)
  const [chartMode, setChartMode] = useState<"area" | "candles">("candles")

  // Drawdown tracking
  const [peakEquity, setPeakEquity] = useState(STARTING_CASH)
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(0)
  // Position discipline — tracks whether any buy ever exceeded the limit
  const [positionEverExceeded, setPositionEverExceeded] = useState(false)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    setStopLoss: false,
    stopTriggered: false,
    positionDiscipline: false,
    drawdownSafe: false,
    completedTrades: false,
    endedProfitable: false,
  })
  const [guideStep, setGuideStep] = useState<number | null>(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const completionShownRef = useRef(false)
  // Track stop-loss toast messages
  const [stopLossAlert, setStopLossAlert] = useState<string | null>(null)

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
        if (filtered.length < LEAD_IN_DAYS + 10) { setDataError("Not enough historical data available for this lab."); return }
        setAllKlines(filtered)
        setCurrentDayIndex(Math.min(LEAD_IN_DAYS, filtered.length - 1))
      } catch { if (active) setDataError("Failed to load historical data. Please try again.") }
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

  // Drawdown
  const currentDrawdownPct = peakEquity > 0 ? ((peakEquity - totalEquity) / peakEquity) * 100 : 0

  // Update peak equity and max drawdown
  useEffect(() => {
    if (totalEquity > peakEquity) {
      setPeakEquity(totalEquity)
    }
    const dd = peakEquity > 0 ? ((peakEquity - totalEquity) / peakEquity) * 100 : 0
    if (dd > maxDrawdownPct) {
      setMaxDrawdownPct(dd)
    }
  }, [totalEquity, peakEquity, maxDrawdownPct])

  // Position % for current trade preview
  const tradeQty = Number(quantity) || 0
  const tradeCost = tradeQty * currentPrice
  const tradePositionPct = totalEquity > 0 ? (tradeCost / totalEquity) * 100 : 0
  const currentPositionPct = totalEquity > 0 ? (holdingsValue / totalEquity) * 100 : 0

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

  const totalTradeCount = trades.length

  // ── Stop-loss check during skip ──
  const checkStopLoss = useCallback((fromIndex: number, toIndex: number) => {
    if (activeStopLoss === null || holdings <= 0) return false
    for (let i = fromIndex + 1; i <= toIndex; i++) {
      const kline = allKlines[i]
      if (!kline) continue
      // Check if the low of any day hits the stop-loss
      if (kline.low <= activeStopLoss) {
        // Execute stop-loss sell at stop price
        const sellPrice = activeStopLoss
        const proceeds = holdings * sellPrice
        const costBasis = holdings * avgCost
        const tradePnl = proceeds - costBasis
        const id = ++tradeIdRef.current
        setTrades((prev) => [...prev, {
          id, side: "sell", qty: holdings, price: sellPrice, dayIndex: i,
          date: formatDate(kline.timestamp), pnl: tradePnl, trigger: "stop-loss",
        }])
        setRealizedPnl((prev) => prev + tradePnl)
        setCash((prev) => prev + proceeds)
        setHoldings(0)
        setAvgCost(0)
        setActiveStopLoss(null)
        setStopLossAlert(`Stop-loss triggered at PKR ${sellPrice.toFixed(2)} on ${formatDate(kline.timestamp)}`)
        // Update tasks
        setTasks((prev) => ({ ...prev, stopTriggered: true }))
        // Set day index to the trigger day
        setCurrentDayIndex(i)
        return true
      }
    }
    return false
  }, [activeStopLoss, holdings, avgCost, allKlines])

  // ── Task checks ──
  // Position discipline: checked continuously — must never exceed limit
  // We start it as false and only set true at the end if positionEverExceeded is still false
  // completedTrades
  useEffect(() => {
    if (totalTradeCount >= TOTAL_TRADES_TARGET && !tasks.completedTrades) {
      setTasks((prev) => ({ ...prev, completedTrades: true }))
    }
  }, [totalTradeCount, tasks.completedTrades])

  // endedProfitable — checked when holdings are 0 and at least one sell happened
  useEffect(() => {
    if (holdings === 0 && trades.some((t) => t.side === "sell") && totalEquity > STARTING_CASH && !tasks.endedProfitable) {
      setTasks((prev) => ({ ...prev, endedProfitable: true }))
    }
  }, [holdings, trades, totalEquity, tasks.endedProfitable])

  // positionDiscipline — true as long as user never exceeded the limit
  useEffect(() => {
    if (!positionEverExceeded && trades.length > 0 && !tasks.positionDiscipline) {
      setTasks((prev) => ({ ...prev, positionDiscipline: true }))
    }
  }, [positionEverExceeded, trades.length, tasks.positionDiscipline])

  // drawdownSafe — true as long as max drawdown stayed under limit, checked after trades
  useEffect(() => {
    if (maxDrawdownPct < MAX_DRAWDOWN_PCT && trades.length > 0 && !tasks.drawdownSafe) {
      setTasks((prev) => ({ ...prev, drawdownSafe: true }))
    }
    // If drawdown exceeded, un-mark it
    if (maxDrawdownPct >= MAX_DRAWDOWN_PCT && tasks.drawdownSafe) {
      setTasks((prev) => ({ ...prev, drawdownSafe: false }))
    }
  }, [maxDrawdownPct, trades.length, tasks.drawdownSafe])

  // Same for position discipline — if exceeded, un-mark
  useEffect(() => {
    if (positionEverExceeded && tasks.positionDiscipline) {
      setTasks((prev) => ({ ...prev, positionDiscipline: false }))
    }
  }, [positionEverExceeded, tasks.positionDiscipline])

  const completedCount = TASK_ORDER.filter((k) => tasks[k]).length
  const allComplete = completedCount === TASK_ORDER.length
  useEffect(() => {
    if (allComplete && !completionShownRef.current) {
      completionShownRef.current = true
      setShowConfetti(true)
      setShowCompletion(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [allComplete])

  // ── Handlers ──

  const handleBuy = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || !currentPrice) return
    const cost = qty * currentPrice
    if (cost > cash) return

    // Check position sizing
    const newHoldingsValue = (holdings + qty) * currentPrice
    const newPositionPct = totalEquity > 0 ? (newHoldingsValue / totalEquity) * 100 : 0
    if (newPositionPct > MAX_POSITION_PCT) {
      setPositionEverExceeded(true)
    }

    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)

    // Set stop loss if provided
    const slPrice = Number(stopLossPrice)
    if (Number.isFinite(slPrice) && slPrice > 0 && slPrice < currentPrice) {
      setActiveStopLoss(slPrice)
      setTasks((prev) => ({ ...prev, setStopLoss: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", trigger: "manual",
    }])
  }, [quantity, currentPrice, cash, holdings, totalEquity, stopLossPrice, currentDayIndex, currentKline])

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
      if (remaining === 0) {
        setAvgCost(0)
        setActiveStopLoss(null)
      }
      return remaining
    })
    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", pnl: tradePnl, trigger: "manual",
    }])
  }, [quantity, currentPrice, holdings, avgCost, currentDayIndex, currentKline])

  const handleSkip = useCallback((days: number) => {
    const targetIndex = Math.min(currentDayIndex + days, allKlines.length - 1)
    // Check stop-loss before advancing
    const triggered = checkStopLoss(currentDayIndex, targetIndex)
    if (!triggered) {
      setCurrentDayIndex(targetIndex)
    }
    // If triggered, checkStopLoss already set the day index
  }, [currentDayIndex, allKlines.length, checkStopLoss])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH)
    setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setStopLossPrice("")
    setActiveStopLoss(null)
    setCurrentDayIndex(initialDayIndex)
    setPeakEquity(STARTING_CASH); setMaxDrawdownPct(0)
    setPositionEverExceeded(false)
    setTrades([]); tradeIdRef.current = 0
    setStopLossAlert(null)
    setTasks({
      setStopLoss: false, stopTriggered: false, positionDiscipline: false,
      drawdownSafe: false, completedTrades: false, endedProfitable: false,
    })
    setGuideStep(0); setShowConfetti(false); setShowCompletion(false)
    completionShownRef.current = false
  }, [initialDayIndex])

  // Format helpers
  const fmt = (v: number, sign = false) => {
    const s = sign && v > 0 ? "+" : ""
    return `PKR ${s}${v.toFixed(2)}`
  }
  const pnlColor = (v: number) =>
    v > 0 ? "text-emerald-500 dark:text-emerald-400" : v < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) window.location.replace("/signin")
  }, [authLoading, user])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="text-sm text-muted-foreground">Loading...</div></div>
  if (!user) return null

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <UserNavbar />
        <main className="mx-auto max-w-6xl px-4 py-10 text-center">
          <FlaskConical className="mx-auto mb-4 h-8 w-8 animate-pulse text-emerald-500" />
          <p className="text-sm text-muted-foreground">Loading historical data for {LAB_SYMBOL}...</p>
        </main>
      </div>
    )
  }
  if (dataError) {
    return (
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
  }

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
              <h1 className="text-2xl font-bold text-foreground">Lab 9: Risk Management</h1>
              <p className="text-xs text-muted-foreground">{LAB_SYMBOL} &middot; {dateLabel} &middot; {daysRemaining} trading days remaining</p>
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

        {/* Stop-loss alert banner */}
        {stopLossAlert && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/60 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 text-red-500" />
            <span className="text-red-800 dark:text-red-200">{stopLossAlert}</span>
            <button onClick={() => setStopLossAlert(null)} className="ml-auto rounded p-0.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-800/40">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Drawdown + Risk Dashboard */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card/90 px-3 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Peak Equity</div>
            <div className="text-sm font-semibold text-foreground">{fmt(peakEquity)}</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center ${
            currentDrawdownPct >= MAX_DRAWDOWN_PCT
              ? "border-red-400/60 bg-red-50 dark:bg-red-900/20"
              : currentDrawdownPct >= MAX_DRAWDOWN_PCT * 0.7
                ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20"
                : "border-border bg-card/90"
          }`}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Current Drawdown</div>
            <div className={`text-sm font-semibold ${currentDrawdownPct >= MAX_DRAWDOWN_PCT ? "text-red-500" : currentDrawdownPct > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
              {currentDrawdownPct.toFixed(1)}%
            </div>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center ${
            maxDrawdownPct >= MAX_DRAWDOWN_PCT ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" : "border-border bg-card/90"
          }`}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Max Drawdown</div>
            <div className={`text-sm font-semibold ${maxDrawdownPct >= MAX_DRAWDOWN_PCT ? "text-red-500" : "text-foreground"}`}>
              {maxDrawdownPct.toFixed(1)}% / {MAX_DRAWDOWN_PCT}%
            </div>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center ${
            currentPositionPct > MAX_POSITION_PCT ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" : "border-border bg-card/90"
          }`}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Position Size</div>
            <div className={`text-sm font-semibold ${currentPositionPct > MAX_POSITION_PCT ? "text-red-500" : "text-foreground"}`}>
              {currentPositionPct.toFixed(1)}% / {MAX_POSITION_PCT}%
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
                {/* Active stop-loss indicator */}
                {activeStopLoss !== null && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        Stop-loss active at PKR {activeStopLoss.toFixed(2)}
                      </span>
                    </div>
                    <button onClick={() => setActiveStopLoss(null)} className="text-[10px] text-amber-600 underline-offset-2 hover:underline dark:text-amber-300">Remove</button>
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

                {/* Quantity + Stop Loss */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Quantity</Label>
                    <Input className="bg-background/70 border-border text-foreground" type="number" min={1} value={quantity}
                      onChange={(e) => setQuantity(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Stop Loss
                    </Label>
                    <Input className="bg-background/70 border-border text-foreground" type="number" min={0}
                      value={stopLossPrice} onChange={(e) => setStopLossPrice(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      placeholder={currentPrice ? `< ${currentPrice.toFixed(0)}` : "PKR"} />
                  </div>
                </div>

                {/* Trade preview — position % warning */}
                {tradeQty > 0 && currentPrice > 0 && (
                  <div className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${
                    tradePositionPct > MAX_POSITION_PCT
                      ? "border border-red-400/60 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      : "text-muted-foreground"
                  }`}>
                    {tradePositionPct > MAX_POSITION_PCT && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
                    This trade = {tradePositionPct.toFixed(1)}% of equity ({fmt(tradeCost)})
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={handleBuy}
                    disabled={!currentPrice || tradeQty <= 0 || tradeCost > cash || currentDayIndex >= allKlines.length - 1}>
                    Buy
                  </Button>
                  <Button className="w-full bg-red-600 hover:bg-red-500 cursor-pointer" onClick={handleSell}
                    disabled={!currentPrice || tradeQty <= 0 || tradeQty > holdings || currentDayIndex >= allKlines.length - 1}>
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

            {/* Skip buttons */}
            <Card className="border border-border/60 bg-card/90">
              <CardContent className="py-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <SkipForward className="h-3.5 w-3.5" /> Time Skip
                  {activeStopLoss !== null && (
                    <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-400">Stop-loss will be checked</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(1)} disabled={currentDayIndex >= allKlines.length - 1}>+1 Day</Button>
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(5)} disabled={currentDayIndex >= allKlines.length - 1}>+1 Week</Button>
                  <Button variant="outline" size="sm" className="text-xs cursor-pointer" onClick={() => handleSkip(22)} disabled={currentDayIndex >= allKlines.length - 1}>+1 Month</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Task Checklist */}
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
                if (key === "completedTrades") label = `Complete ${TOTAL_TRADES_TARGET} trades (${totalTradeCount}/${TOTAL_TRADES_TARGET})`
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
              <p className="text-sm text-muted-foreground">No trades yet. Buy or sell to see your history here.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-left p-1.5">Trigger</th>
                      <th className="text-right p-1.5">Qty</th>
                      <th className="text-right p-1.5">Price</th>
                      <th className="text-right p-1.5">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trades].reverse().map((t) => (
                      <tr key={t.id} className="border-b border-border/40">
                        <td className="p-1.5 text-xs text-muted-foreground">{t.date}</td>
                        <td className="p-1.5">
                          <span className={`text-xs font-semibold uppercase ${t.side === "buy" ? "text-emerald-500" : "text-red-500"}`}>{t.side}</span>
                        </td>
                        <td className="p-1.5">
                          {t.trigger === "stop-loss" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                              <Shield className="h-2.5 w-2.5" /> SL
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Manual</span>
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
