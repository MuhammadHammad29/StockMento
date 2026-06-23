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
const STARTING_CASH = 100_000
const PROFIT_TARGET = 5_000
// Cap historical data at Jan 2026
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
// Start 2 months after earliest available data
const LEAD_IN_DAYS = 60

type TaskKey =
  | "bought100"
  | "sold100"
  | "skipped1d"
  | "skipped1w"
  | "skipped1m"
  | "madeProfit"

type Tasks = Record<TaskKey, boolean>

const TASK_LABELS: Record<TaskKey, string> = {
  bought100: "Buy 100 shares",
  sold100: "Sell 100 shares",
  skipped1d: "Skip 1 day",
  skipped1w: "Skip 1 week",
  skipped1m: "Skip 1 month",
  madeProfit: `Make a profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "bought100",
  "sold100",
  "skipped1d",
  "skipped1w",
  "skipped1m",
  "madeProfit",
]

// Guide steps for the walkthrough
const GUIDE_STEPS = [
  {
    target: "lab-welcome",
    title: "Welcome to Lab 1!",
    body: `This lab introduces you to the trading simulator. You'll practice buying and selling ${LAB_SYMBOL} stock using real historical PSX data. Complete all tasks to finish the lab.`,
  },
  {
    target: "lab-chart",
    title: "Price Chart",
    body: "This chart shows historical stock prices. You can switch between a line chart and candlestick view. The data starts 2 months in so you have context before trading.",
  },
  {
    target: "lab-trading",
    title: "Trading Panel",
    body: `Use this panel to buy and sell shares of ${LAB_SYMBOL}. Enter a quantity and click Buy or Sell. Your cash balance and holdings update in real time.`,
  },
  {
    target: "lab-skip",
    title: "Time Skip",
    body: "These buttons let you jump forward in time — 1 day, 1 week, or 1 month. Prices update as you skip forward through the historical data.",
  },
  {
    target: "lab-tasks",
    title: "Task Checklist",
    body: "Complete all six tasks below to finish the lab. Each task lights up green when done. Good luck!",
  },
]

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
      x: number
      y: number
      w: number
      h: number
      color: string
      vx: number
      vy: number
      rot: number
      vr: number
      opacity: number
    }[] = []

    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * -1,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      })
    }

    let frame: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of pieces) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.rot += p.vr
        if (p.y > canvas.height) {
          p.opacity -= 0.02
        }
        if (p.opacity <= 0) continue
        alive = true
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (alive) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ width: "100vw", height: "100vh" }}
    />
  )
}

function GuideOverlay({
  step,
  total,
  title,
  body,
  onNext,
  onSkip,
  onBack,
}: {
  step: number
  total: number
  title: string
  body: string
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Step {step + 1} of {total}
            </span>
          </div>
          <button
            onClick={onSkip}
            className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Skip guide
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBack}
                className="cursor-pointer"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onNext}
            >
              {step < total - 1 ? (
                <>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </>
              ) : (
                "Let's go!"
              )}
            </Button>
          </div>
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
          You've successfully completed Lab 1 and learned the basics of the trading simulator.
          You know how to buy, sell, skip through time, and track your profit.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/labs">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
              Back to Labs
            </Button>
          </Link>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Keep Exploring
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Lab1Page() {
  const { user, loading: authLoading } = useAuth()

  // Historical data
  const [allKlines, setAllKlines] = useState<SimKlinePoint[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Simulation state
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_CASH)
  const [holdings, setHoldings] = useState(0)
  const [avgCost, setAvgCost] = useState(0)
  const [realizedPnl, setRealizedPnl] = useState(0)
  const [quantity, setQuantity] = useState("100")
  const [chartMode, setChartMode] = useState<"area" | "candles">("area")

  // Tasks + UI
  const [tasks, setTasks] = useState<Tasks>({
    bought100: false,
    sold100: false,
    skipped1d: false,
    skipped1w: false,
    skipped1m: false,
    madeProfit: false,
  })
  const [guideStep, setGuideStep] = useState<number | null>(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const completionShownRef = useRef(false)

  // Initial day index once data loads
  const initialDayIndex = useMemo(() => {
    if (!allKlines.length) return 0
    // Find index ~60 days in
    return Math.min(LEAD_IN_DAYS, allKlines.length - 1)
  }, [allKlines])

  // Fetch historical klines
  useEffect(() => {
    let active = true
    const load = async () => {
      setDataLoading(true)
      setDataError(null)
      try {
        const data = await simulatorApi.klines(LAB_SYMBOL, "1d")
        if (!active) return
        const filtered = data
          .filter(
            (k) =>
              Number.isFinite(k.timestamp) &&
              Number.isFinite(k.close) &&
              k.timestamp <= DATA_CUTOFF_MS
          )
          .sort((a, b) => a.timestamp - b.timestamp)
        if (filtered.length < LEAD_IN_DAYS + 10) {
          setDataError("Not enough historical data available for this lab.")
          return
        }
        setAllKlines(filtered)
        setCurrentDayIndex(Math.min(LEAD_IN_DAYS, filtered.length - 1))
      } catch {
        if (active) setDataError("Failed to load historical data. Please try again.")
      } finally {
        if (active) setDataLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  // Visible data up to current day
  const visibleKlines = useMemo(
    () => allKlines.slice(0, currentDayIndex + 1),
    [allKlines, currentDayIndex]
  )

  const currentKline = visibleKlines[visibleKlines.length - 1] ?? null
  const currentPrice = currentKline?.close ?? 0
  const holdingsValue = holdings * currentPrice
  const totalEquity = cash + holdingsValue
  const unrealizedPnl = holdings > 0 ? (currentPrice - avgCost) * holdings : 0
  const profit = totalEquity - STARTING_CASH

  // Chart data
  const { chartData, candleData, volumeByTime } = useMemo(() => {
    const volMap: Record<string, number> = {}
    const candles = visibleKlines.map((k) => {
      const time = k.timestamp / 1000
      const vol = Number(k.volume ?? 0)
      if (Number.isFinite(vol)) {
        volMap[String(Math.round(time * 1000))] = vol
      }
      return { time, open: k.open, high: k.high, low: k.low, close: k.close }
    })
    const area = candles.map((c) => ({ time: c.time, value: c.close }))
    return { chartData: area, candleData: candles, volumeByTime: volMap }
  }, [visibleKlines])

  // Current date label
  const dateLabel = currentKline
    ? new Intl.DateTimeFormat("en-PK", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(new Date(currentKline.timestamp))
    : "--"

  const daysRemaining = allKlines.length - 1 - currentDayIndex
  const progressPercent = allKlines.length
    ? Math.round((currentDayIndex / (allKlines.length - 1)) * 100)
    : 0

  // Check profit task
  useEffect(() => {
    if (profit >= PROFIT_TARGET && !tasks.madeProfit) {
      setTasks((prev) => ({ ...prev, madeProfit: true }))
    }
  }, [profit, tasks.madeProfit])

  // Check all tasks complete
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

  // Handlers
  const handleBuy = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || !currentPrice) return
    const cost = qty * currentPrice
    if (cost > cash) return
    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)
    if (qty >= 100) setTasks((prev) => ({ ...prev, bought100: true }))
  }, [quantity, currentPrice, cash, holdings])

  const handleSell = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || qty > holdings || !currentPrice) return
    const proceeds = qty * currentPrice
    const costBasis = qty * avgCost
    setRealizedPnl((prev) => prev + (proceeds - costBasis))
    setCash((prev) => prev + proceeds)
    setHoldings((prev) => {
      const remaining = prev - qty
      if (remaining === 0) setAvgCost(0)
      return remaining
    })
    if (qty >= 100) setTasks((prev) => ({ ...prev, sold100: true }))
  }, [quantity, currentPrice, holdings, avgCost])

  const handleSkip = useCallback(
    (days: number, taskKey: TaskKey) => {
      setCurrentDayIndex((prev) => Math.min(prev + days, allKlines.length - 1))
      setTasks((prev) => ({ ...prev, [taskKey]: true }))
    },
    [allKlines.length]
  )

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH)
    setHoldings(0)
    setAvgCost(0)
    setRealizedPnl(0)
    setQuantity("100")
    setCurrentDayIndex(initialDayIndex)
    setTasks({
      bought100: false,
      sold100: false,
      skipped1d: false,
      skipped1w: false,
      skipped1m: false,
      madeProfit: false,
    })
    setGuideStep(0)
    setShowConfetti(false)
    setShowCompletion(false)
    completionShownRef.current = false
  }, [initialDayIndex])

  // Format helpers
  const fmt = (v: number, sign = false) => {
    const s = sign && v > 0 ? "+" : ""
    return `PKR ${s}${v.toFixed(2)}`
  }
  const pnlColor = (v: number) =>
    v > 0
      ? "text-emerald-500 dark:text-emerald-400"
      : v < 0
        ? "text-red-500 dark:text-red-400"
        : "text-muted-foreground"

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.replace("/signin")
    }
  }, [authLoading, user])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }
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
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Lab Unavailable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{dataError}</p>
              <Link href="/labs">
                <Button variant="outline" className="cursor-pointer">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Labs
                </Button>
              </Link>
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
        <GuideOverlay
          step={guideStep}
          total={GUIDE_STEPS.length}
          title={GUIDE_STEPS[guideStep].title}
          body={GUIDE_STEPS[guideStep].body}
          onNext={() => {
            if (guideStep < GUIDE_STEPS.length - 1) {
              setGuideStep(guideStep + 1)
            } else {
              setGuideStep(null)
            }
          }}
          onBack={() => setGuideStep((s) => (s === null ? 0 : Math.max(0, s - 1)))}
          onSkip={() => setGuideStep(null)}
        />
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/labs"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lab 1: Introduction</h1>
              <p className="text-xs text-muted-foreground">
                {LAB_SYMBOL} &middot; {dateLabel} &middot; {daysRemaining} trading days remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGuideStep(0)}
              className="text-xs cursor-pointer"
            >
              <FlaskConical className="mr-1 h-3.5 w-3.5" />
              Restart Guide
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs cursor-pointer"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset Lab
            </Button>
          </div>
        </div>

        {/* Progress bar for timeline */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Timeline</span>
          <Progress value={progressPercent} className="h-1.5 flex-1" />
          <span>{progressPercent}%</span>
        </div>

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" id="lab-chart">
          {/* Chart */}
          <Card className="min-w-0 border border-border/60 bg-card/90">
            <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
              <CardTitle className="text-base text-foreground">{LAB_SYMBOL} Price</CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={chartMode === "area" ? "default" : "outline"}
                  onClick={() => setChartMode("area")}
                  className="h-7 px-2 text-xs"
                >
                  Line
                </Button>
                <Button
                  size="sm"
                  variant={chartMode === "candles" ? "default" : "outline"}
                  onClick={() => setChartMode("candles")}
                  className="h-7 px-2 text-xs"
                >
                  Candles
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden" style={{ height: 380 }}>
              <PriceChart
                data={chartData}
                candles={candleData}
                volumeByTime={volumeByTime}
                viewMode={chartMode}
                lastPrice={currentPrice}
                height={380}
                timeMode="date"
              />
            </CardContent>
          </Card>

          {/* Trading Panel */}
          <div className="space-y-4" id="lab-trading">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="py-3">
                <CardTitle className="text-base text-foreground">Trade {LAB_SYMBOL}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Price</div>
                    <div className="text-sm font-semibold text-foreground">
                      {currentPrice ? `PKR ${currentPrice.toFixed(2)}` : "--"}
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
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Holdings Value</div>
                    <div className="text-sm font-semibold text-foreground">{fmt(holdingsValue)}</div>
                  </div>
                </div>

                {/* P&L */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-border bg-background/30 px-2 py-1.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Unrealized</div>
                    <div className={`text-xs font-semibold ${pnlColor(unrealizedPnl)}`}>
                      {fmt(unrealizedPnl, true)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-2 py-1.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Realized</div>
                    <div className={`text-xs font-semibold ${pnlColor(realizedPnl)}`}>
                      {fmt(realizedPnl, true)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-2 py-1.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total P&L</div>
                    <div className={`text-xs font-semibold ${pnlColor(profit)}`}>
                      {fmt(profit, true)}
                    </div>
                  </div>
                </div>

                {/* Quantity + Buy/Sell */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Quantity</Label>
                  <Input
                    className="bg-background/70 border-border text-foreground"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    onClick={handleBuy}
                    disabled={
                      !currentPrice ||
                      Number(quantity) <= 0 ||
                      Number(quantity) * currentPrice > cash ||
                      currentDayIndex >= allKlines.length - 1
                    }
                  >
                    Buy
                  </Button>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-500 cursor-pointer"
                    onClick={handleSell}
                    disabled={
                      !currentPrice ||
                      Number(quantity) <= 0 ||
                      Number(quantity) > holdings ||
                      currentDayIndex >= allKlines.length - 1
                    }
                  >
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
            <Card className="border border-border/60 bg-card/90" id="lab-skip">
              <CardContent className="py-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <SkipForward className="h-3.5 w-3.5" />
                  Time Skip
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer"
                    onClick={() => handleSkip(1, "skipped1d")}
                    disabled={currentDayIndex >= allKlines.length - 1}
                  >
                    +1 Day
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer"
                    onClick={() => handleSkip(5, "skipped1w")}
                    disabled={currentDayIndex >= allKlines.length - 1}
                  >
                    +1 Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer"
                    onClick={() => handleSkip(22, "skipped1m")}
                    disabled={currentDayIndex >= allKlines.length - 1}
                  >
                    +1 Month
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Task Checklist */}
        <Card className="border border-border/60 bg-card/90" id="lab-tasks">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base text-foreground">
              Tasks ({completedCount}/{TASK_ORDER.length})
            </CardTitle>
            <Progress
              value={(completedCount / TASK_ORDER.length) * 100}
              className="h-2 w-32"
            />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TASK_ORDER.map((key) => {
                const done = tasks[key]
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      done
                        ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                        : "border-border bg-background/30 text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className={done ? "line-through opacity-70" : ""}>
                      {TASK_LABELS[key]}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
