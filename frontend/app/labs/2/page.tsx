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

const LAB_SYMBOL = "ENGROH"
const STARTING_CASH = 100_000
const PROFIT_TARGET = 5_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const LEAD_IN_DAYS = 60

// ── Types ──

type TaskKey =
  | "marketBuy"
  | "marketSell"
  | "placedLimit"
  | "limitFilled"
  | "cancelledOrder"
  | "madeProfit"

type Tasks = Record<TaskKey, boolean>

type PendingOrder = {
  id: number
  side: "buy" | "sell"
  qty: number
  limitPrice: number
  placedDayIndex: number
  placedDate: string
}

type TradeRecord = {
  id: number
  side: "buy" | "sell"
  qty: number
  price: number
  dayIndex: number
  date: string
  pnl?: number
  orderType: "market" | "limit"
}

const TASK_LABELS: Record<TaskKey, string> = {
  marketBuy: "Execute a market buy order",
  marketSell: "Execute a market sell order",
  placedLimit: "Place a limit order",
  limitFilled: "Have a limit order fill automatically",
  cancelledOrder: "Cancel a pending limit order",
  madeProfit: `Make a profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "marketBuy",
  "marketSell",
  "placedLimit",
  "limitFilled",
  "cancelledOrder",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 2: Market vs Limit Orders",
    body: `In this lab you'll learn the two fundamental order types using ${LAB_SYMBOL}. You start with PKR ${STARTING_CASH.toLocaleString()}. Understanding when to use each type is key to smart trading.`,
  },
  {
    title: "Market Orders",
    body: "A market order executes immediately at the current price. It's simple and guaranteed to fill — but you pay whatever the market is asking right now. Use it when you want to trade NOW.",
  },
  {
    title: "Limit Orders",
    body: "A limit order lets you set a target price. A limit BUY fills when the price drops to your target. A limit SELL fills when the price rises to your target. The order stays pending until the price is reached.",
  },
  {
    title: "Managing Pending Orders",
    body: "Your pending limit orders are shown below the trading panel. They fill automatically when you skip forward in time and the price reaches your limit. You can also cancel pending orders if you change your mind.",
  },
  {
    title: "Your Tasks",
    body: "Complete all 6 tasks: execute market buy and sell orders, place and fill a limit order, cancel a pending order, and make a profit. Good luck!",
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
          You now understand the difference between market and limit orders! Market orders execute
          instantly at the current price, while limit orders wait for your target price to be reached.
          Knowing when to use each type is a fundamental trading skill.
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

export default function Lab2Page() {
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
  const [limitPrice, setLimitPrice] = useState("")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [chartMode, setChartMode] = useState<"area" | "candles">("area")

  // Pending limit orders
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const orderIdRef = useRef(0)

  // Trade history
  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  // Fill alert
  const [fillAlert, setFillAlert] = useState<string | null>(null)

  const [tasks, setTasks] = useState<Tasks>({
    marketBuy: false,
    marketSell: false,
    placedLimit: false,
    limitFilled: false,
    cancelledOrder: false,
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

  // ── Task checks ──
  useEffect(() => {
    if (profit >= PROFIT_TARGET && !tasks.madeProfit) {
      setTasks((prev) => ({ ...prev, madeProfit: true }))
    }
  }, [profit, tasks.madeProfit])

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

  // ── Process pending orders during skip ──
  const processPendingOrders = useCallback((fromIndex: number, toIndex: number, currentCash: number, currentHoldings: number, currentAvgCost: number, currentRealizedPnl: number, orders: PendingOrder[]) => {
    let localCash = currentCash
    let localHoldings = currentHoldings
    let localAvgCost = currentAvgCost
    let localRealizedPnl = currentRealizedPnl
    const remaining = [...orders]
    const newTrades: TradeRecord[] = []
    const filledIndices: number[] = []

    for (let i = fromIndex + 1; i <= toIndex; i++) {
      const kline = allKlines[i]
      if (!kline) continue

      for (let j = 0; j < remaining.length; j++) {
        if (filledIndices.includes(j)) continue
        const order = remaining[j]

        if (order.side === "buy" && kline.low <= order.limitPrice) {
          const cost = order.qty * order.limitPrice
          if (cost <= localCash) {
            localAvgCost = localHoldings === 0
              ? order.limitPrice
              : (localAvgCost * localHoldings + cost) / (localHoldings + order.qty)
            localCash -= cost
            localHoldings += order.qty
            filledIndices.push(j)
            newTrades.push({
              id: 0, side: "buy", qty: order.qty, price: order.limitPrice,
              dayIndex: i, date: formatDate(kline.timestamp), orderType: "limit",
            })
          }
        } else if (order.side === "sell" && kline.high >= order.limitPrice) {
          if (order.qty <= localHoldings) {
            const proceeds = order.qty * order.limitPrice
            const costBasis = order.qty * localAvgCost
            const tradePnl = proceeds - costBasis
            localRealizedPnl += tradePnl
            localCash += proceeds
            localHoldings -= order.qty
            if (localHoldings === 0) localAvgCost = 0
            filledIndices.push(j)
            newTrades.push({
              id: 0, side: "sell", qty: order.qty, price: order.limitPrice,
              dayIndex: i, date: formatDate(kline.timestamp), pnl: tradePnl, orderType: "limit",
            })
          }
        }
      }
    }

    // Remove filled orders (reverse to maintain indices)
    const updatedPending = remaining.filter((_, idx) => !filledIndices.includes(idx))

    return {
      cash: localCash,
      holdings: localHoldings,
      avgCost: localAvgCost,
      realizedPnl: localRealizedPnl,
      pendingOrders: updatedPending,
      newTrades,
      filledCount: filledIndices.length,
    }
  }, [allKlines])

  // ── Handlers ──

  const handleMarketBuy = useCallback(() => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || !currentPrice) return
    const cost = qty * currentPrice
    if (cost > cash) return
    setCash((prev) => prev - cost)
    setAvgCost((prev) => (holdings === 0 ? currentPrice : (prev * holdings + cost) / (holdings + qty)))
    setHoldings((prev) => prev + qty)

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "buy", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", orderType: "market",
    }])

    if (!tasks.marketBuy) setTasks((prev) => ({ ...prev, marketBuy: true }))
  }, [quantity, currentPrice, cash, holdings, currentDayIndex, currentKline, tasks.marketBuy])

  const handleMarketSell = useCallback(() => {
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

    const id = ++tradeIdRef.current
    setTrades((prev) => [...prev, {
      id, side: "sell", qty, price: currentPrice, dayIndex: currentDayIndex,
      date: currentKline ? formatDate(currentKline.timestamp) : "--", pnl: tradePnl, orderType: "market",
    }])

    if (!tasks.marketSell) setTasks((prev) => ({ ...prev, marketSell: true }))
  }, [quantity, currentPrice, holdings, avgCost, currentDayIndex, currentKline, tasks.marketSell])

  const handlePlaceLimitOrder = useCallback((side: "buy" | "sell") => {
    const qty = Number(quantity)
    const price = Number(limitPrice)
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0 || !currentPrice) return

    // Validate limit price direction
    if (side === "buy" && price >= currentPrice) return // limit buy must be below current price
    if (side === "sell" && price <= currentPrice) return // limit sell must be above current price
    if (side === "sell" && qty > holdings) return // can't sell more than you hold

    const id = ++orderIdRef.current
    setPendingOrders((prev) => [...prev, {
      id, side, qty, limitPrice: price, placedDayIndex: currentDayIndex,
      placedDate: currentKline ? formatDate(currentKline.timestamp) : "--",
    }])

    if (!tasks.placedLimit) setTasks((prev) => ({ ...prev, placedLimit: true }))
  }, [quantity, limitPrice, currentPrice, holdings, currentDayIndex, currentKline, tasks.placedLimit])

  const handleCancelOrder = useCallback((orderId: number) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId))
    if (!tasks.cancelledOrder) setTasks((prev) => ({ ...prev, cancelledOrder: true }))
  }, [tasks.cancelledOrder])

  const handleSkip = useCallback((days: number) => {
    const targetIndex = Math.min(currentDayIndex + days, allKlines.length - 1)

    if (pendingOrders.length > 0) {
      const result = processPendingOrders(currentDayIndex, targetIndex, cash, holdings, avgCost, realizedPnl, pendingOrders)

      if (result.filledCount > 0) {
        setCash(result.cash)
        setHoldings(result.holdings)
        setAvgCost(result.avgCost)
        setRealizedPnl(result.realizedPnl)
        setPendingOrders(result.pendingOrders)

        const tradesWithIds = result.newTrades.map((t) => ({ ...t, id: ++tradeIdRef.current }))
        setTrades((prev) => [...prev, ...tradesWithIds])

        // Check limit filled task
        if (!tasks.limitFilled) {
          setTasks((prev) => ({ ...prev, limitFilled: true }))
        }

        setFillAlert(`${result.filledCount} limit order${result.filledCount > 1 ? "s" : ""} filled during time skip`)
      }
    }

    setCurrentDayIndex(targetIndex)
  }, [currentDayIndex, allKlines.length, pendingOrders, cash, holdings, avgCost, realizedPnl, processPendingOrders, tasks.limitFilled])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH)
    setHoldings(0); setAvgCost(0); setRealizedPnl(0)
    setQuantity("100"); setLimitPrice(""); setOrderType("market")
    setCurrentDayIndex(initialDayIndex)
    setPendingOrders([]); orderIdRef.current = 0
    setTrades([]); tradeIdRef.current = 0
    setFillAlert(null)
    setTasks({
      marketBuy: false, marketSell: false, placedLimit: false,
      limitFilled: false, cancelledOrder: false, madeProfit: false,
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
              <h1 className="text-2xl font-bold text-foreground">Lab 2: Market vs Limit Orders</h1>
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

        {/* Fill alert banner */}
        {fillAlert && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm">
            <Clock className="h-4 w-4 flex-shrink-0 text-emerald-500" />
            <span className="text-emerald-800 dark:text-emerald-200">{fillAlert}</span>
            <button onClick={() => setFillAlert(null)} className="ml-auto rounded p-0.5 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800/40">
              <X className="h-3.5 w-3.5" />
            </button>
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
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Holdings Value</div>
                    <div className="text-sm font-semibold text-foreground">{fmt(holdingsValue)}</div>
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

                {/* Order Type Toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition ${
                      orderType === "market"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/30 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setOrderType("market")}
                  >
                    <Zap className="h-3.5 w-3.5" /> Market Order
                  </button>
                  <button
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition ${
                      orderType === "limit"
                        ? "bg-blue-600 text-white"
                        : "bg-background/30 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setOrderType("limit")}
                  >
                    <Clock className="h-3.5 w-3.5" /> Limit Order
                  </button>
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Quantity</Label>
                  <Input className="bg-background/70 border-border text-foreground" type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
                </div>

                {/* Limit price (only shown for limit orders) */}
                {orderType === "limit" && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Limit Price (PKR)</Label>
                    <Input className="bg-background/70 border-border text-foreground" type="number" min={0}
                      value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      placeholder={currentPrice ? `Current: ${currentPrice.toFixed(2)}` : "PKR"} />
                    <p className="text-[10px] text-muted-foreground">
                      Buy limit: below current price &middot; Sell limit: above current price
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                {orderType === "market" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" onClick={handleMarketBuy}
                      disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) * currentPrice > cash || atEnd}>
                      <Zap className="mr-1 h-3.5 w-3.5" /> Buy
                    </Button>
                    <Button className="w-full bg-red-600 hover:bg-red-500 cursor-pointer" onClick={handleMarketSell}
                      disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || atEnd}>
                      <Zap className="mr-1 h-3.5 w-3.5" /> Sell
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="w-full bg-blue-600 hover:bg-blue-500 cursor-pointer" onClick={() => handlePlaceLimitOrder("buy")}
                      disabled={!currentPrice || Number(quantity) <= 0 || !Number(limitPrice) || Number(limitPrice) >= currentPrice || atEnd}>
                      <Clock className="mr-1 h-3.5 w-3.5" /> Limit Buy
                    </Button>
                    <Button className="w-full bg-blue-600 hover:bg-blue-500 cursor-pointer" onClick={() => handlePlaceLimitOrder("sell")}
                      disabled={!currentPrice || Number(quantity) <= 0 || Number(quantity) > holdings || !Number(limitPrice) || Number(limitPrice) <= currentPrice || atEnd}>
                      <Clock className="mr-1 h-3.5 w-3.5" /> Limit Sell
                    </Button>
                  </div>
                )}

                {/* Equity */}
                <div className="rounded-md border border-emerald-400/60 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Equity</div>
                  <div className="text-base font-bold text-foreground">{fmt(totalEquity)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Orders */}
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <Clock className="h-4 w-4 text-blue-500" /> Pending Orders ({pendingOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending limit orders. Place a limit order to see it here.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between rounded-lg border border-blue-400/40 bg-blue-50 dark:bg-blue-900/15 px-3 py-2">
                        <div>
                          <span className={`text-xs font-semibold uppercase ${order.side === "buy" ? "text-emerald-600" : "text-red-600"}`}>
                            Limit {order.side}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {order.qty} shares @ PKR {order.limitPrice.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 transition"
                          title="Cancel order"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skip buttons */}
            <Card className="border border-border/60 bg-card/90">
              <CardContent className="py-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <SkipForward className="h-3.5 w-3.5" /> Time Skip
                  {pendingOrders.length > 0 && (
                    <span className="ml-auto text-[10px] text-blue-600 dark:text-blue-400">Limit orders will be checked</span>
                  )}
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
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    done
                      ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-border bg-background/30 text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 flex-shrink-0" />}
                    <span className={done ? "line-through opacity-70" : ""}>{TASK_LABELS[key]}</span>
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
              <p className="text-sm text-muted-foreground">No trades yet. Execute a market or limit order to see your history here.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr>
                      <th className="text-left p-1.5">Date</th>
                      <th className="text-left p-1.5">Side</th>
                      <th className="text-left p-1.5">Type</th>
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
                          {t.orderType === "limit" ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-400/60 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                              <Clock className="h-2.5 w-2.5" /> Limit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              <Zap className="h-2.5 w-2.5" /> Market
                            </span>
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
