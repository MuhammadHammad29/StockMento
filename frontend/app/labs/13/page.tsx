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
  Minus,
  RotateCcw,
  SkipForward,
  X,
  TrendingUp,
  TrendingDown,
  BarChart3,
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

const LAB_SYMBOL = "ENGROH"
const STARTING_CASH = 120_000
const PROFIT_TARGET = 7_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2021-06-01").getTime()
const LEAD_IN_DAYS = 40
const CHANNEL_PERIOD = 20 // 20-day Donchian channel
const LOWER_ZONE_PCT = 30 // lower 30% = buy zone
const UPPER_ZONE_PCT = 30 // upper 30% = sell zone
const BOUNCE_TARGET = 3

// ── Types ──

type TaskKey =
  | "boughtLowerChannel"
  | "soldUpperChannel"
  | "completedBounce"
  | "multipleBounces"
  | "soldAboveMidline"
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
  channelZone: "lower" | "upper" | "mid"
}

const TASK_LABELS: Record<TaskKey, string> = {
  boughtLowerChannel: "Buy in the lower 30% of the channel",
  soldUpperChannel: "Sell in the upper 30% of the channel",
  completedBounce: "Complete a profitable lower-to-upper bounce trade",
  multipleBounces: `Complete ${BOUNCE_TARGET} profitable bounce trades`,
  soldAboveMidline: "Sell at or above the channel midline",
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "boughtLowerChannel",
  "soldUpperChannel",
  "completedBounce",
  "multipleBounces",
  "soldAboveMidline",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 13: Channel Bounce",
    body: `Price channels form when a stock oscillates between a ceiling and floor. In this lab, you'll trade ${LAB_SYMBOL} by buying at the lower channel and selling at the upper channel — a strategy called range trading. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "The Donchian Channel",
    body: `The channel is defined by the ${CHANNEL_PERIOD}-day high (upper line) and ${CHANNEL_PERIOD}-day low (lower line). The midline sits halfway between them. Price tends to bounce between these boundaries in sideways markets.`,
  },
  {
    title: "Channel Zones",
    body: `The channel is divided into three zones: the Buy Zone (lower ${LOWER_ZONE_PCT}%), the Neutral Zone (middle), and the Sell Zone (upper ${UPPER_ZONE_PCT}%). Buy when price enters the lower zone and sell when it reaches the upper zone or midline.`,
  },
  {
    title: "Channel Width = Volatility",
    body: "A wide channel means high volatility — bigger swings, bigger profit potential per bounce. A narrow channel means the stock is coiling and may break out. Watch the channel width indicator for clues.",
  },
  {
    title: "Your Tasks",
    body: `Buy in the lower channel zone, sell in the upper zone, complete ${BOUNCE_TARGET} profitable bounces, and hit your profit target. The channel visualiser shows exactly where you are in the range.`,
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Channel Master!</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          You've mastered channel trading — buying at the lower boundary and selling at the upper.
          This range-bound strategy works beautifully in sideways markets. Combine it with volume
          analysis and trend identification for even better results.
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

export default function Lab13Page() {
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

  const [boughtInLower, setBoughtInLower] = useState(false)
  const [bounceCount, setBounceCount] = useState(0)

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  const [tasks, setTasks] = useState<Tasks>({
    boughtLowerChannel: false,
    soldUpperChannel: false,
    completedBounce: false,
    multipleBounces: false,
    soldAboveMidline: false,
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

  // ── Donchian Channel ──
  const channel = useMemo(() => {
    if (currentDayIndex < CHANNEL_PERIOD) return null
    let minLow = Infinity, maxHigh = -Infinity
    for (let i = currentDayIndex - CHANNEL_PERIOD; i < currentDayIndex; i++) {
      const k = allKlines[i]
      if (!k) continue
      if (k.low < minLow) minLow = k.low
      if (k.high > maxHigh) maxHigh = k.high
    }
    const mid = (maxHigh + minLow) / 2
    const width = maxHigh - minLow
    const widthPct = minLow > 0 ? (width / minLow) * 100 : 0
    return { upper: maxHigh, lower: minLow, mid, width, widthPct }
  }, [allKlines, currentDayIndex])

  // Channel position percentage (0% = lower, 100% = upper)
  const channelPositionPct = channel && channel.width > 0
    ? ((currentPrice - channel.lower) / channel.width) * 100
    : 50

  // Zone detection
  const inLowerZone = channelPositionPct <= LOWER_ZONE_PCT
  const inUpperZone = channelPositionPct >= (100 - UPPER_ZONE_PCT)
  const aboveMidline = channel ? currentPrice >= channel.mid : false
  const zone: "lower" | "upper" | "mid" = inLowerZone ? "lower" : inUpperZone ? "upper" : "mid"

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
    if (bounceCount >= 1 && !tasks.completedBounce) setTasks((prev) => ({ ...prev, completedBounce: true }))
    if (bounceCount >= BOUNCE_TARGET && !tasks.multipleBounces) setTasks((prev) => ({ ...prev, multipleBounces: true }))
  }, [bounceCount, tasks.completedBounce, tasks.multipleBounces])

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

    if (inLowerZone) {
      setBoughtInLower(true)
      if (!tasks.boughtLowerChannel) setTasks((prev) => ({ ...prev, boughtLowerChannel: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", channelZone: zone,
    }])
  }, [quantity, currentPrice, cash, holdings, inLowerZone, zone, currentDayIndex, currentKline, tasks.boughtLowerChannel])

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
      if (remaining === 0) { setAvgCost(0); setBoughtInLower(false) }
      return remaining
    })

    // Task: sold in upper channel
    if (inUpperZone && !tasks.soldUpperChannel) {
      setTasks((prev) => ({ ...prev, soldUpperChannel: true }))
    }

    // Task: sold above midline
    if (aboveMidline && !tasks.soldAboveMidline) {
      setTasks((prev) => ({ ...prev, soldAboveMidline: true }))
    }

    // Task: profitable bounce (bought lower, sold upper)
    if (boughtInLower && inUpperZone && tradePnl > 0) {
      setBounceCount((prev) => prev + 1)
    }

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--",
      pnl: tradePnl, channelZone: zone,
    }])
  }, [quantity, currentPrice, holdings, avgCost, inUpperZone, aboveMidline, boughtInLower, zone, currentDayIndex, currentKline, tasks.soldUpperChannel, tasks.soldAboveMidline])

  const handleSkip = useCallback((days: number) => {
    setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
  }, [allKlines.length])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setBoughtInLower(false); setBounceCount(0)
    setTrades([]); tradeIdRef.current = 0
    setTasks({
      boughtLowerChannel: false, soldUpperChannel: false, completedBounce: false,
      multipleBounces: false, soldAboveMidline: false, madeProfit: false,
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
              <h1 className="text-2xl font-bold text-foreground">Lab 13: Trade a Channel Bounce</h1>
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

        {/* Channel Dashboard */}
        {channel && (
          <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_1fr] gap-4 items-center">
              {/* Lower Channel */}
              <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                inLowerZone ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20" : "border-border bg-background/30"
              }`}>
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <ArrowDown className="h-3 w-3" /> Lower Channel
                </div>
                <div className={`text-sm font-semibold ${inLowerZone ? "text-primary" : "text-foreground"}`}>
                  PKR {channel.lower.toFixed(2)}
                </div>
                {inLowerZone && <div className="text-[10px] font-medium text-primary">BUY ZONE</div>}
              </div>

              {/* Channel Visualiser */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Channel Position</span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Width: {channel.widthPct.toFixed(1)}%
                  </span>
                </div>
                {/* Channel bar with three zones */}
                <div className="relative h-6 rounded-lg overflow-hidden flex">
                  {/* Lower zone */}
                  <div className={`h-full transition-colors ${inLowerZone ? "bg-emerald-200 dark:bg-emerald-900/40" : "bg-emerald-100/50 dark:bg-emerald-900/10"}`}
                    style={{ width: `${LOWER_ZONE_PCT}%` }} />
                  {/* Mid zone */}
                  <div className="h-full bg-muted/30 flex-1" />
                  {/* Upper zone */}
                  <div className={`h-full transition-colors ${inUpperZone ? "bg-red-200 dark:bg-red-900/40" : "bg-red-100/50 dark:bg-red-900/10"}`}
                    style={{ width: `${UPPER_ZONE_PCT}%` }} />
                  {/* Midline marker */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30 z-10" />
                  {/* Price position dot */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 shadow-sm transition-all duration-300 z-20 ${
                      inLowerZone ? "bg-emerald-500 border-emerald-300" : inUpperZone ? "bg-red-500 border-red-300" : "bg-foreground border-foreground/50"
                    }`}
                    style={{ left: `calc(${Math.max(2, Math.min(98, channelPositionPct))}% - 8px)` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                  <span className="text-emerald-600">Buy Zone</span>
                  <span>Midline: PKR {channel.mid.toFixed(2)}</span>
                  <span className="text-red-600">Sell Zone</span>
                </div>
              </div>

              {/* Upper Channel */}
              <div className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                inUpperZone ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" : "border-border bg-background/30"
              }`}>
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <ArrowUp className="h-3 w-3" /> Upper Channel
                </div>
                <div className={`text-sm font-semibold ${inUpperZone ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                  PKR {channel.upper.toFixed(2)}
                </div>
                {inUpperZone && <div className="text-[10px] font-medium text-red-600 dark:text-red-400">SELL ZONE</div>}
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
                {/* Zone Signal */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  inLowerZone ? "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20" :
                  inUpperZone ? "border-red-400/60 bg-red-50 dark:bg-red-900/20" :
                  "border-border bg-background/30"
                }`}>
                  {inLowerZone ? (
                    <><TrendingDown className="h-4 w-4 text-emerald-500" /><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Lower Channel — Buy the bounce</span></>
                  ) : inUpperZone ? (
                    <><TrendingUp className="h-4 w-4 text-red-500" /><span className="text-xs font-semibold text-red-700 dark:text-red-300">Upper Channel — Sell into strength</span></>
                  ) : (
                    <><Minus className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Mid-Channel — Wait for a zone entry</span></>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Bounces</div>
                    <div className="text-sm font-semibold text-foreground">{bounceCount}/{BOUNCE_TARGET}</div>
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
                    inLowerZone ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-emerald-400/50" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`} onClick={handleBuy}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}>
                    Buy{inLowerZone ? " (Channel)" : ""}
                  </Button>
                  <Button className={`w-full cursor-pointer ${
                    inUpperZone ? "bg-red-600 hover:bg-red-500 ring-2 ring-red-400/50" : "bg-red-600 hover:bg-red-500"
                  }`} onClick={handleSell}
                    disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                    Sell{inUpperZone ? " (Channel)" : ""}
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
                if (key === "multipleBounces") label = `Complete ${BOUNCE_TARGET} bounces (${bounceCount}/${BOUNCE_TARGET})`
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
              <p className="text-sm text-muted-foreground">No trades yet. Wait for price to reach the lower channel zone.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-center p-1.5">Zone</th>
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
                          {t.channelZone === "lower" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <ArrowDown className="h-2.5 w-2.5" /> Low
                            </span>
                          ) : t.channelZone === "upper" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400/60 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                              <ArrowUp className="h-2.5 w-2.5" /> High
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Mid</span>
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
