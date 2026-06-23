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
  HeartCrack,
  TrendingDown,
  TrendingUp,
  Timer,
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
const PROFIT_TARGET = 8_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2019-12-01").getTime() // start near the crash
const LEAD_IN_DAYS = 30 // short lead-in so user starts ~Jan 2020
const DIP_THRESHOLD_PCT = 15 // must survive a 15% dip
const HOLD_DAYS_TARGET = 40 // hold at least 40 trading days

// ── Types ──

type TaskKey =
  | "boughtPosition"
  | "experienced15pctDip"
  | "heldThroughDip"
  | "recoveredFromDip"
  | "soldProfitably"
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
  panicSell?: boolean
}

const TASK_LABELS: Record<TaskKey, string> = {
  boughtPosition: "Buy at least 100 shares",
  experienced15pctDip: "Experience a 15%+ dip from your entry price",
  heldThroughDip: "Hold through the dip — do NOT panic sell",
  recoveredFromDip: "Position recovers to profit after a 15%+ dip",
  soldProfitably: "Sell your position at a profit",
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "boughtPosition",
  "experienced15pctDip",
  "heldThroughDip",
  "recoveredFromDip",
  "soldProfitably",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 11: Avoid Panic Selling",
    body: `The biggest mistake retail traders make? Selling at the bottom of a crash. In this lab, you'll experience a real market crash using ${LAB_SYMBOL} (March 2020 PSX crash). Your goal: hold through the fear. You start with PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "The Psychology of a Crash",
    body: "When prices drop 20-40%, your brain screams 'SELL!' This is the fight-or-flight response. But historically, markets recover. Those who panic sell lock in losses, while those who hold recover their capital — and often profit.",
  },
  {
    title: "The Panic Meter",
    body: "Watch the Panic Meter as prices fall. It simulates the emotional pressure you'd feel in a real crash. The messages will try to convince you to sell. Your job: resist. Remember, the crash is temporary — the loss is only real if you sell.",
  },
  {
    title: "What If You Panic Sell?",
    body: "If you sell during a 15%+ dip, the 'Held Through Dip' task will permanently fail. You'll see a 'What If' counter showing what your position would be worth if you'd held. This is the regret every panic seller feels.",
  },
  {
    title: "Your Tasks",
    body: `Buy a position, watch it crash 15%+, hold through the dip, wait for recovery, and sell at a profit. Target: PKR ${PROFIT_TARGET.toLocaleString()} total profit. The market WILL recover — trust the process!`,
  },
]

// Panic messages that escalate with drawdown
function getPanicMessage(drawdownPct: number): { message: string; level: "calm" | "uneasy" | "fear" | "panic" | "extreme" } {
  if (drawdownPct < 3) return { message: "Markets fluctuate. This is normal.", level: "calm" }
  if (drawdownPct < 7) return { message: "A small dip. Stay focused on your strategy.", level: "calm" }
  if (drawdownPct < 12) return { message: "Your position is declining... other traders are getting nervous.", level: "uneasy" }
  if (drawdownPct < 18) return { message: "Significant losses mounting. Are you sure you want to hold? Maybe cut your losses?", level: "fear" }
  if (drawdownPct < 25) return { message: "ALERT: Down over 15%! Traders around you are selling. The market may never recover...", level: "panic" }
  if (drawdownPct < 35) return { message: "CRITICAL: Your capital is evaporating! Every day you hold, you lose more. Sell NOW before it's too late!", level: "extreme" }
  return { message: "CATASTROPHIC LOSSES! This could go to zero! Are you really going to watch your money disappear?!", level: "extreme" }
}

const panicLevelColors = {
  calm: "text-primary",
  uneasy: "text-amber-600 dark:text-amber-400",
  fear: "text-orange-600 dark:text-orange-400",
  panic: "text-red-600 dark:text-red-400",
  extreme: "text-red-600 dark:text-red-400 animate-pulse",
}

const panicMeterColors = {
  calm: "bg-emerald-500",
  uneasy: "bg-amber-500",
  fear: "bg-orange-500",
  panic: "bg-red-500",
  extreme: "bg-red-600 animate-pulse",
}

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
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Diamond Hands!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You held through a devastating crash and came out profitable. Most retail traders
          panic sell at the bottom and miss the recovery. You've proven you have the emotional
          discipline to weather market storms. Remember: the loss isn't real until you sell.
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

export default function Lab11Page() {
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

  // Panic selling tracking
  const [maxDipFromEntry, setMaxDipFromEntry] = useState(0) // deepest dip %
  const [hasExperiencedDip, setHasExperiencedDip] = useState(false)
  const [panicSold, setPanicSold] = useState(false)
  const [hasRecovered, setHasRecovered] = useState(false)
  const [buyDayIndex, setBuyDayIndex] = useState<number | null>(null)

  // "What if" tracking after panic sell
  const [panicSellPrice, setPanicSellPrice] = useState<number | null>(null)
  const [panicSellQty, setPanicSellQty] = useState(0)
  const [whatIfAvgCost, setWhatIfAvgCost] = useState(0)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    boughtPosition: false,
    experienced15pctDip: false,
    heldThroughDip: true, // starts true, fails if panic sell
    recoveredFromDip: false,
    soldProfitably: false,
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

  // Dip from entry
  const dipFromEntryPct = holdings > 0 && avgCost > 0
    ? Math.max(0, ((avgCost - currentPrice) / avgCost) * 100)
    : 0
  const isUnderwater = holdings > 0 && currentPrice < avgCost
  const isInDip = dipFromEntryPct >= DIP_THRESHOLD_PCT
  const panic = holdings > 0 ? getPanicMessage(dipFromEntryPct) : getPanicMessage(0)

  // What-if value (after panic sell)
  const whatIfValue = panicSold && panicSellQty > 0
    ? panicSellQty * currentPrice
    : null
  const whatIfPnl = whatIfValue !== null && whatIfAvgCost > 0
    ? whatIfValue - (panicSellQty * whatIfAvgCost)
    : null

  // Days held
  const daysHeld = buyDayIndex !== null ? currentDayIndex - buyDayIndex : 0

  // Track deepest dip and task updates
  useEffect(() => {
    if (holdings > 0 && dipFromEntryPct > maxDipFromEntry) {
      setMaxDipFromEntry(dipFromEntryPct)
    }
    if (dipFromEntryPct >= DIP_THRESHOLD_PCT && !hasExperiencedDip) {
      setHasExperiencedDip(true)
      if (!tasks.experienced15pctDip) setTasks((prev) => ({ ...prev, experienced15pctDip: true }))
    }
    // Recovery: was in a 15%+ dip, now profitable again
    if (hasExperiencedDip && holdings > 0 && currentPrice > avgCost && !hasRecovered && !panicSold) {
      setHasRecovered(true)
      if (!tasks.recoveredFromDip) setTasks((prev) => ({ ...prev, recoveredFromDip: true }))
    }
  }, [holdings, dipFromEntryPct, maxDipFromEntry, hasExperiencedDip, currentPrice, avgCost, hasRecovered, panicSold, tasks.experienced15pctDip, tasks.recoveredFromDip])

  // Profit task
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
    const newHoldings = holdings + qty
    const newAvgCost = holdings === 0 ? currentPrice : (avgCost * holdings + cost) / newHoldings
    setCash((prev) => prev - cost)
    setAvgCost(newAvgCost)
    setHoldings(newHoldings)
    if (buyDayIndex === null) setBuyDayIndex(currentDayIndex)

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
    }])

    if (qty >= 100 && !tasks.boughtPosition) {
      setTasks((prev) => ({ ...prev, boughtPosition: true }))
    }
  }, [quantity, currentPrice, cash, holdings, avgCost, buyDayIndex, currentDayIndex, currentKline, tasks.boughtPosition])

  const handleSell = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || qty > holdings || !currentPrice) return
    const proceeds = qty * currentPrice
    const costBasis = qty * avgCost
    const tradePnl = proceeds - costBasis
    const isPanicSell = isInDip || (isUnderwater && dipFromEntryPct >= DIP_THRESHOLD_PCT)

    if (isPanicSell && !panicSold) {
      setPanicSold(true)
      setPanicSellPrice(currentPrice)
      setPanicSellQty(qty)
      setWhatIfAvgCost(avgCost)
      if (tasks.heldThroughDip) setTasks((prev) => ({ ...prev, heldThroughDip: false }))
    }

    setRealizedPnl((prev) => prev + tradePnl)
    setCash((prev) => prev + proceeds)
    setHoldings((prev) => {
      const remaining = prev - qty
      if (remaining === 0) {
        setAvgCost(0)
        if (tradePnl > 0 && !tasks.soldProfitably) {
          setTasks((p) => ({ ...p, soldProfitably: true }))
        }
      }
      return remaining
    })

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, panicSell: isPanicSell,
    }])

    // Profitable sell task (only if fully closing)
    if (qty >= holdings && tradePnl > 0 && !tasks.soldProfitably) {
      setTasks((prev) => ({ ...prev, soldProfitably: true }))
    }
  }, [quantity, currentPrice, holdings, avgCost, isInDip, isUnderwater, dipFromEntryPct, panicSold, currentDayIndex, currentKline, tasks.heldThroughDip, tasks.soldProfitably])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("200"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setMaxDipFromEntry(0); setHasExperiencedDip(false); setPanicSold(false)
    setHasRecovered(false); setBuyDayIndex(null)
    setPanicSellPrice(null); setPanicSellQty(0); setWhatIfAvgCost(0)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      boughtPosition: false, experienced15pctDip: false, heldThroughDip: true,
      recoveredFromDip: false, soldProfitably: false, madeProfit: false,
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
              <h1 className="text-2xl font-bold text-foreground">Lab 11: Avoid Panic Selling</h1>
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

        {/* Panic Meter — only shows when holding */}
        {holdings > 0 && (
          <div className={`rounded-lg border px-4 py-3 transition-all ${
            panic.level === "extreme" ? "border-red-500/80 bg-red-50 dark:bg-red-950/30" :
            panic.level === "panic" ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" :
            panic.level === "fear" ? "border-orange-400/60 bg-orange-50 dark:bg-orange-900/20" :
            panic.level === "uneasy" ? "border-amber-400/60 bg-amber-50 dark:bg-amber-900/20" :
            "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {isUnderwater ? (
                <HeartCrack className={`h-5 w-5 flex-shrink-0 ${panicLevelColors[panic.level]}`} />
              ) : (
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Panic Meter</span>
                  <span className={`text-xs font-bold ${panicLevelColors[panic.level]}`}>
                    {isUnderwater ? `-${dipFromEntryPct.toFixed(1)}%` : `+${((currentPrice - avgCost) / avgCost * 100).toFixed(1)}%`}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${panicMeterColors[panic.level]}`}
                    style={{ width: `${Math.min(100, (dipFromEntryPct / 40) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <p className={`text-sm italic ${panicLevelColors[panic.level]}`}>
              &ldquo;{panic.message}&rdquo;
            </p>
          </div>
        )}

        {/* Panic sell warning */}
        {panicSold && (
          <div className="flex items-center gap-3 rounded-lg border border-red-400/60 bg-red-50 px-4 py-3 dark:bg-red-900/20">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-700 dark:text-red-300">
                You Panic Sold!
              </div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80">
                You sold at PKR {panicSellPrice?.toFixed(2)} during the dip. The &ldquo;Held Through Dip&rdquo; task has failed.
              </div>
            </div>
          </div>
        )}

        {/* What-If Counter — shows after panic sell */}
        {panicSold && whatIfValue !== null && whatIfPnl !== null && (
          <div className="rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">What If You Had Held?</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">You Sold At</div>
                <div className="text-sm font-bold text-red-600">PKR {panicSellPrice?.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Current Price</div>
                <div className={`text-sm font-bold ${currentPrice > (panicSellPrice ?? 0) ? "text-emerald-600" : "text-red-600"}`}>
                  PKR {currentPrice.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Missed P&L</div>
                <div className={`text-sm font-bold ${whatIfPnl > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmt(whatIfPnl, true)}
                </div>
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

                {/* Position Status */}
                {holdings > 0 && (
                  <div className={`rounded-md border px-3 py-2 ${
                    isUnderwater
                      ? "border-red-400/60 bg-red-50 dark:bg-red-900/20"
                      : "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {isUnderwater ? (
                          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Position</span>
                      </div>
                      <span className={`text-xs font-bold ${pnlColor(unrealizedPnl)}`}>
                        {fmt(unrealizedPnl, true)} ({isUnderwater ? "-" : "+"}{Math.abs((currentPrice - avgCost) / avgCost * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">Deepest dip: -{maxDipFromEntry.toFixed(1)}%</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Timer className="h-2.5 w-2.5" /> Held {daysHeld} days
                      </span>
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
                    isInDip
                      ? "bg-red-700 hover:bg-red-600 ring-2 ring-red-400/50 animate-pulse"
                      : "bg-red-600 hover:bg-red-500"
                  }`} onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    {isInDip ? "SELL (Panic?)" : "Sell"}
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
                const label = TASK_LABELS[key]
                const isFailable = key === "heldThroughDip"
                const isFailed = isFailable && !done
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    isFailed
                      ? "border-red-400/60 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200"
                      : done
                        ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                        : "border-border bg-background/30 text-muted-foreground"
                  }`}>
                    {isFailed ? (
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    ) : done ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className={isFailed ? "line-through opacity-70" : done ? "line-through opacity-70" : ""}>{label}</span>
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
              <p className="text-sm text-muted-foreground">No trades yet. Buy a position and prepare for the ride.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-center p-1.5">Type</th>
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
                          {t.panicSell ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              <HeartCrack className="h-2.5 w-2.5" /> PANIC
                            </span>
                          ) : t.side === "sell" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <ShieldCheck className="h-2.5 w-2.5" /> Calm
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
