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
  Flame,
  TrendingUp,
  Zap,
  Clock,
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

const LAB_SYMBOL = "NETSOL"
const STARTING_CASH = 120_000
const PROFIT_TARGET = 7_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const LEAD_IN_DAYS = 60
const SPIKE_PCT = 7 // 7%+ single-day move = spike (PSX circuit breaker)
const SPIKE_DANGER_DAYS = 3 // danger zone lasts 3 days after spike
const PULLBACK_SMA = 5 // buy below 5-day SMA = buying the dip
const COMPLETED_TRADES_TARGET = 3

// ── Types ──

type TaskKey =
  | "avoidedSpike"
  | "boughtDip"
  | "neverChasedSpike"
  | "profitableTrade"
  | "completedTrades"
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
  chasedSpike?: boolean
  boughtDip?: boolean
}

type SpikeEvent = {
  dayIndex: number
  date: string
  changePct: number
  price: number
}

const TASK_LABELS: Record<TaskKey, string> = {
  avoidedSpike: "A spike occurs and you do NOT buy during the danger zone",
  boughtDip: "Buy during a pullback (price below 5-day SMA)",
  neverChasedSpike: "Complete lab without ever buying after a spike",
  profitableTrade: "Complete a profitable trade",
  completedTrades: `Complete ${COMPLETED_TRADES_TARGET} full buy-sell cycles`,
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "avoidedSpike",
  "boughtDip",
  "neverChasedSpike",
  "profitableTrade",
  "completedTrades",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 12: Don't Chase the Spike",
    body: `FOMO (Fear Of Missing Out) causes traders to buy AFTER a big price spike, right when smart money is selling. In this lab, you'll trade ${LAB_SYMBOL} — a volatile stock with frequent 7%+ spikes that often reverse. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "What is a Spike?",
    body: `When a stock jumps ${SPIKE_PCT}%+ in a single day, it triggers a "spike alert". PSX stocks often hit the 7.5% circuit breaker. After such moves, the price frequently pulls back 10-25% over the following days as early buyers take profits.`,
  },
  {
    title: "The FOMO Trap",
    body: `After a spike, your brain says "it's going to keep going up, buy NOW!" This is the FOMO trap. The danger zone lasts ${SPIKE_DANGER_DAYS} days after a spike. Buying during this window is "chasing" — and usually leads to losses when the reversal comes.`,
  },
  {
    title: "Buy the Dip Instead",
    body: "Smart traders wait for the pullback. When the price drops below its 5-day moving average after a spike, THAT is your entry. You buy at a discount while FOMO chasers are holding bags. Patience beats impulse every time.",
  },
  {
    title: "Your Tasks",
    body: `Resist buying during spike danger zones, wait for pullbacks, make ${COMPLETED_TRADES_TARGET} profitable trades, and never chase a spike. If you buy after ANY spike, the discipline task permanently fails!`,
  },
]

// FOMO messages that try to lure the user into buying
function getFomoMessage(spikePct: number, daysAfter: number): string {
  if (daysAfter === 0) {
    if (spikePct >= 10) return "MASSIVE MOVE! This stock is EXPLODING! Everyone is buying — you'll miss the rocket! 🚀"
    return "BIG SPIKE! This could be the start of something huge! Get in before it's too late!"
  }
  if (daysAfter === 1) return "Still up from the spike! The momentum is real! Last chance to join the rally!"
  return "The move might continue... are you really going to miss out on these gains?"
}

// ── Helpers ──

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(ts))
}

function computeSma(klines: SimKlinePoint[], endIdx: number, period: number): number | null {
  if (endIdx < period - 1) return null
  let sum = 0
  for (let i = endIdx - period + 1; i <= endIdx; i++) sum += klines[i].close
  return sum / period
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">FOMO Conquered!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You resisted the temptation to chase spikes and bought on pullbacks instead.
          This emotional discipline separates successful traders from the crowd.
          Remember: if you're buying because everyone else is, you're already too late.
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

export default function Lab12Page() {
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

  // Spike/FOMO tracking
  const [spikeHistory, setSpikeHistory] = useState<SpikeEvent[]>([])
  const [chasedCount, setChasedCount] = useState(0)
  const [avoidedCount, setAvoidedCount] = useState(0)
  const [completedCycles, setCompletedCycles] = useState(0)
  const [hasProfitableTrade, setHasProfitableTrade] = useState(false)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    avoidedSpike: false,
    boughtDip: false,
    neverChasedSpike: true, // failable — starts true
    profitableTrade: false,
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

  // Detect spike at current day
  const currentDaySpike = useMemo(() => {
    if (currentDayIndex < 1 || !allKlines[currentDayIndex] || !allKlines[currentDayIndex - 1]) return null
    const prev = allKlines[currentDayIndex - 1]
    const curr = allKlines[currentDayIndex]
    const changePct = ((curr.close - prev.close) / prev.close) * 100
    if (changePct >= SPIKE_PCT) return changePct
    return null
  }, [allKlines, currentDayIndex])

  // Is current day in a spike danger zone? (within SPIKE_DANGER_DAYS of any spike)
  const dangerZone = useMemo(() => {
    // Check recent days for spikes
    for (let d = 0; d < SPIKE_DANGER_DAYS; d++) {
      const checkIdx = currentDayIndex - d
      if (checkIdx < 1) continue
      const prev = allKlines[checkIdx - 1]
      const curr = allKlines[checkIdx]
      if (!prev || !curr) continue
      const changePct = ((curr.close - prev.close) / prev.close) * 100
      if (changePct >= SPIKE_PCT) {
        return { daysAfter: d, spikePct: changePct, spikePrice: curr.close }
      }
    }
    return null
  }, [allKlines, currentDayIndex])

  const isInDangerZone = dangerZone !== null
  const fomoMessage = dangerZone ? getFomoMessage(dangerZone.spikePct, dangerZone.daysAfter) : null

  // 5-day SMA for pullback detection
  const sma5 = useMemo(() => computeSma(allKlines, currentDayIndex, PULLBACK_SMA), [allKlines, currentDayIndex])
  const isBelowSma = sma5 !== null && currentPrice < sma5
  const isPullback = isBelowSma && !isInDangerZone

  // Detect new spikes as user advances
  useEffect(() => {
    if (currentDaySpike !== null && currentKline) {
      const date = formatDate(currentKline.timestamp)
      // Check if we already logged this spike
      const exists = spikeHistory.some((s) => s.dayIndex === currentDayIndex)
      if (!exists) {
        setSpikeHistory((prev) => [...prev, {
          dayIndex: currentDayIndex,
          date,
          changePct: currentDaySpike,
          price: currentPrice,
        }])
      }
    }
  }, [currentDaySpike, currentDayIndex, currentKline, currentPrice, spikeHistory])

  // Check if user avoided a spike (spike danger zone passed without buying)
  useEffect(() => {
    // Look at spikes that are now past their danger zone
    for (const spike of spikeHistory) {
      if (currentDayIndex > spike.dayIndex + SPIKE_DANGER_DAYS) {
        // Check if any buy trades happened during the danger zone
        const chasedDuring = trades.some(
          (t) => t.side === "buy" && t.dayIndex >= spike.dayIndex && t.dayIndex <= spike.dayIndex + SPIKE_DANGER_DAYS
        )
        if (!chasedDuring && !tasks.avoidedSpike) {
          setAvoidedCount((prev) => {
            const next = prev + 1
            if (next >= 1) setTasks((p) => ({ ...p, avoidedSpike: true }))
            return next
          })
          // Only count once per spike - remove from future checks by using a ref
        }
      }
    }
  // Intentionally limited deps - we check on day advance
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDayIndex])

  // Task checks
  useEffect(() => {
    if (profit >= PROFIT_TARGET && !tasks.madeProfit) setTasks((prev) => ({ ...prev, madeProfit: true }))
  }, [profit, tasks.madeProfit])

  useEffect(() => {
    if (completedCycles >= COMPLETED_TRADES_TARGET && !tasks.completedTrades)
      setTasks((prev) => ({ ...prev, completedTrades: true }))
  }, [completedCycles, tasks.completedTrades])

  useEffect(() => {
    if (hasProfitableTrade && !tasks.profitableTrade)
      setTasks((prev) => ({ ...prev, profitableTrade: true }))
  }, [hasProfitableTrade, tasks.profitableTrade])

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

    const chased = isInDangerZone
    const dip = isPullback

    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)

    if (chased) {
      setChasedCount((prev) => prev + 1)
      if (tasks.neverChasedSpike) setTasks((prev) => ({ ...prev, neverChasedSpike: false }))
    }

    if (dip && !tasks.boughtDip) {
      setTasks((prev) => ({ ...prev, boughtDip: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      chasedSpike: chased, boughtDip: dip,
    }])
  }, [quantity, currentPrice, cash, holdings, isInDangerZone, isPullback, currentDayIndex, currentKline, tasks.neverChasedSpike, tasks.boughtDip])

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
        setCompletedCycles((p) => p + 1)
        if (tradePnl > 0) setHasProfitableTrade(true)
      }
      return remaining
    })

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", pnl: tradePnl,
    }])
  }, [quantity, currentPrice, holdings, avgCost, currentDayIndex, currentKline])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setSpikeHistory([]); setChasedCount(0); setAvoidedCount(0)
    setCompletedCycles(0); setHasProfitableTrade(false)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      avoidedSpike: false, boughtDip: false, neverChasedSpike: true,
      profitableTrade: false, completedTrades: false, madeProfit: false,
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
              <h1 className="text-2xl font-bold text-foreground">Lab 12: Don&apos;t Chase the Spike</h1>
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

        {/* FOMO Alert — Spike Danger Zone */}
        {isInDangerZone && dangerZone && (
          <div className="rounded-lg border border-orange-500/80 bg-gradient-to-r from-orange-50 to-red-50 px-4 py-3 dark:from-orange-950/30 dark:to-red-950/30 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/20">
                <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                    SPIKE DANGER ZONE
                  </span>
                  <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-800 dark:text-orange-200">
                    +{dangerZone.spikePct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> Day {dangerZone.daysAfter + 1}/{SPIKE_DANGER_DAYS}
                  </span>
                </div>
                <p className="text-xs italic text-orange-600/90 dark:text-orange-400/90">
                  &ldquo;{fomoMessage}&rdquo;
                </p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                  Buying now = chasing. Wait for the pullback!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pullback opportunity */}
        {isPullback && !isInDangerZone && (
          <div className="rounded-lg border border-emerald-400/60 bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Pullback Detected — Good Entry Zone
                </span>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                  Price is below the 5-day SMA (PKR {sma5?.toFixed(2)}). Smart money buys the dip.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chased spike warning */}
        {chasedCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-400/60 bg-red-50 px-4 py-3 dark:bg-red-900/20">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-300">
                You Chased {chasedCount} Spike{chasedCount > 1 ? "s" : ""}!
              </div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80">
                The &ldquo;Never Chased&rdquo; task has failed. Reset to try a perfect run.
              </div>
            </div>
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Spikes Seen
              </div>
              <div className="text-lg font-bold text-foreground">{spikeHistory.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Spikes Avoided
              </div>
              <div className="text-lg font-bold text-emerald-600">{avoidedCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3" /> Spikes Chased
              </div>
              <div className={`text-lg font-bold ${chasedCount > 0 ? "text-red-600" : "text-foreground"}`}>{chasedCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Completed Cycles
              </div>
              <div className="text-lg font-bold text-foreground">{completedCycles}/{COMPLETED_TRADES_TARGET}</div>
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
                {/* Market Status */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  isInDangerZone
                    ? "border-orange-400/60 bg-orange-50 dark:bg-orange-900/20"
                    : isPullback
                      ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-border bg-background/30"
                }`}>
                  {isInDangerZone ? (
                    <>
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Danger Zone — Don&apos;t buy!</span>
                    </>
                  ) : isPullback ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Pullback — Good entry</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Normal — Wait for pullback</span>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">SMA(5)</div>
                    <div className={`text-sm font-semibold ${isBelowSma ? "text-emerald-500" : "text-foreground"}`}>
                      {sma5 ? `PKR ${sma5.toFixed(2)}` : "--"}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Cash</div>
                    <div className="text-sm font-semibold text-foreground">{fmt(cash)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Holdings</div>
                    <div className="text-sm font-semibold text-foreground">{holdings} shares</div>
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
                  <Button
                    className={`w-full cursor-pointer ${
                      isInDangerZone
                        ? "bg-orange-700 hover:bg-orange-600 ring-2 ring-orange-400/50"
                        : isPullback
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-emerald-400/50"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}
                  >
                    {isInDangerZone ? "Buy (FOMO!)" : isPullback ? "Buy (Dip!)" : "Buy"}
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
                if (key === "completedTrades") label = `Complete ${COMPLETED_TRADES_TARGET} cycles (${completedCycles}/${COMPLETED_TRADES_TARGET})`
                const isFailable = key === "neverChasedSpike"
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

        {/* Spike History */}
        {spikeHistory.length > 0 && (
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="py-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" /> Spike Log ({spikeHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5">
                {[...spikeHistory].reverse().map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded border border-orange-200/60 bg-orange-50/50 px-3 py-1.5 dark:border-orange-800/40 dark:bg-orange-900/10">
                    <span className="text-xs text-muted-foreground">{s.date}</span>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">+{s.changePct.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">PKR {s.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade History */}
        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-foreground">Trade History ({trades.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet. Wait for a pullback — don&apos;t chase the spike!</p>
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
                          {t.chasedSpike ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-400/60 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                              <Flame className="h-2.5 w-2.5" /> FOMO
                            </span>
                          ) : t.boughtDip ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <ShieldCheck className="h-2.5 w-2.5" /> DIP
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
