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
  Coins,
  TrendingUp,
  RefreshCw,
  Wallet,
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

// ── Config ──

const STOCKS = ["EFERT", "OGDC", "LUCK"] as const
type StockSymbol = (typeof STOCKS)[number]

const STOCK_COLORS: Record<StockSymbol, string> = {
  EFERT: "#a855f7",
  OGDC: "#3b82f6",
  LUCK: "#22c55e",
}

const STOCK_SECTORS: Record<StockSymbol, string> = {
  EFERT: "Fertilizer",
  OGDC: "Oil & Gas",
  LUCK: "Cement",
}

// Simulated annual dividend yield (%)
const DIVIDEND_YIELDS: Record<StockSymbol, number> = {
  EFERT: 5.0,
  OGDC: 4.0,
  LUCK: 3.0,
}

// Dividends paid every ~63 trading days (~quarterly)
const DIVIDEND_INTERVAL_DAYS = 63

const STARTING_CASH = 400_000
const PROFIT_TARGET = 15_000
const DATA_CUTOFF_MS = new Date("2026-01-31T23:59:59").getTime()
const DATA_START_MS = new Date("2022-06-01").getTime()
const LEAD_IN_DAYS = 5
const MIN_DIVIDEND_STOCKS = 2
const REINVEST_WINDOW_DAYS = 5

// ── Types ──

type TaskKey =
  | "receivedFirstDividend"
  | "dividendFromTwo"
  | "reinvestedDividend"
  | "allThreeOwned"
  | "totalDividendsTarget"
  | "madeProfit"

type Tasks = Record<TaskKey, boolean>

type StockHolding = { qty: number; avgCost: number }

type TradeRecord = {
  id: number
  symbol: StockSymbol
  side: "buy" | "sell" | "dividend" | "reinvest"
  qty: number
  price: number
  dayIndex: number
  date: string
  pnl?: number
}

type DividendEvent = {
  dayIndex: number
  date: string
  symbol: StockSymbol
  shares: number
  perShare: number
  total: number
  reinvested: boolean
}

const TASK_LABELS: Record<TaskKey, string> = {
  receivedFirstDividend: "Receive your first dividend payment",
  dividendFromTwo: `Collect dividends from ${MIN_DIVIDEND_STOCKS}+ different stocks`,
  reinvestedDividend: "Reinvest a dividend (buy within 5 days of payout)",
  allThreeOwned: "Own all 3 dividend stocks simultaneously",
  totalDividendsTarget: "Collect PKR 8,000+ in total dividends",
  madeProfit: `Achieve total profit of PKR ${PROFIT_TARGET.toLocaleString()}`,
}

const TASK_ORDER: TaskKey[] = [
  "receivedFirstDividend",
  "dividendFromTwo",
  "reinvestedDividend",
  "allThreeOwned",
  "totalDividendsTarget",
  "madeProfit",
]

const GUIDE_STEPS = [
  {
    title: "Welcome to Lab 22: Dividend Strategy",
    body: `Dividends are regular cash payments companies make to shareholders. In this lab, you'll build an income-generating portfolio from 3 PSX dividend payers. Starting cash: PKR ${STARTING_CASH.toLocaleString()}.`,
  },
  {
    title: "The 3 Dividend Stocks",
    body: "EFERT (~5% yield, Fertilizer), OGDC (~4% yield, Oil & Gas), LUCK (~3% yield, Cement). Higher-yield stocks pay more income but may have less price growth. Diversifying across all three balances income and growth.",
  },
  {
    title: "Quarterly Dividends",
    body: "Every ~63 trading days, each stock you own pays a dividend based on its annual yield. The dividend is calculated per share and added directly to your cash balance. You must own shares on the payout day to receive it.",
  },
  {
    title: "Reinvesting Dividends",
    body: "The power of compounding: when you receive a dividend, buy more shares within 5 days to 'reinvest' it. This grows your position over time and earns even larger future dividends.",
  },
  {
    title: "Your Tasks",
    body: `Collect dividends from 2+ stocks, reinvest at least once, own all 3 stocks, and accumulate PKR 8,000+ in total dividends. Hit a profit target of PKR ${PROFIT_TARGET.toLocaleString()} through dividends + capital gains.`,
  },
]

// ── Helpers ──

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-PK", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(ts))
}

function computeQuarterlyDividend(annualYield: number, price: number, shares: number): number {
  // Quarterly = annual / 4
  return (annualYield / 100 / 4) * price * shares
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
    const pieces: { x: number; y: number; w: number; h: number; color: string; vx: number; vy: number; rot: number; vr: number; opacity: number }[] = []
    for (let i = 0; i < 150; i++) {
      pieces.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * -1, w: Math.random() * 8 + 4, h: Math.random() * 6 + 2, color: colors[Math.floor(Math.random() * colors.length)], vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.2, opacity: 1 })
    }
    let frame: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of pieces) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr; if (p.y > canvas.height) p.opacity -= 0.02; if (p.opacity <= 0) continue; alive = true; ctx.save(); ctx.globalAlpha = Math.max(0, p.opacity); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore() }
      if (alive) frame = requestAnimationFrame(animate)
    }
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
        <h2 className="mb-2 text-2xl font-bold text-foreground">Dividend Investor!</h2>
        <p className="mb-6 text-sm text-muted-foreground">You've mastered the dividend strategy. Collecting regular income from stocks and reinvesting it creates a powerful compounding effect. Over time, dividend reinvestment can dramatically grow your portfolio — patience and consistency are the keys.</p>
        <div className="flex flex-col gap-2">
          <Link href="/labs"><Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">Back to Labs</Button></Link>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Keep Exploring</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──

export default function Lab22Page() {
  const { user, loading: authLoading } = useAuth()

  const [allData, setAllData] = useState<Record<StockSymbol, SimKlinePoint[]>>({} as Record<StockSymbol, SimKlinePoint[]>)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [cash, setCash] = useState(STARTING_CASH)
  const [holdings, setHoldings] = useState<Record<StockSymbol, StockHolding>>(
    () => Object.fromEntries(STOCKS.map((s) => [s, { qty: 0, avgCost: 0 }])) as Record<StockSymbol, StockHolding>
  )
  const [selectedStock, setSelectedStock] = useState<StockSymbol>("EFERT")
  const [quantity, setQuantity] = useState("100")
  const [chartMode, setChartMode] = useState<"area" | "candles">("candles")

  const [trades, setTrades] = useState<TradeRecord[]>([])
  const tradeIdRef = useRef(0)

  // Dividend tracking
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([])
  const [totalDividends, setTotalDividends] = useState(0)
  const [lastDividendDay, setLastDividendDay] = useState<Record<StockSymbol, number>>(
    () => Object.fromEntries(STOCKS.map((s) => [s, -DIVIDEND_INTERVAL_DAYS])) as Record<StockSymbol, number>
  )
  const [dividendStocks, setDividendStocks] = useState<Set<StockSymbol>>(new Set())
  const [lastDividendReceivedDay, setLastDividendReceivedDay] = useState(-999)
  const [pendingDividendNotification, setPendingDividendNotification] = useState<{symbol: StockSymbol; total: number; perShare: number} | null>(null)

  const [tasks, setTasks] = useState<Tasks>({
    receivedFirstDividend: false, dividendFromTwo: false, reinvestedDividend: false,
    allThreeOwned: false, totalDividendsTarget: false, madeProfit: false,
  })
  const [guideStep, setGuideStep] = useState<number | null>(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const completionShownRef = useRef(false)

  // Common data length
  const dataLength = useMemo(() => {
    const lengths = STOCKS.map((s) => allData[s]?.length ?? 0)
    return lengths.length > 0 ? Math.min(...lengths) : 0
  }, [allData])

  const initialDayIndex = useMemo(() => {
    if (dataLength === 0) return 0
    return Math.min(LEAD_IN_DAYS, dataLength - 1)
  }, [dataLength])

  // Fetch all stocks
  useEffect(() => {
    let active = true
    const load = async () => {
      setDataLoading(true); setDataError(null)
      try {
        const results = await Promise.all(STOCKS.map((s) => simulatorApi.klines(s, "1d")))
        if (!active) return
        const data: Record<string, SimKlinePoint[]> = {}
        for (let i = 0; i < STOCKS.length; i++) {
          const filtered = results[i]
            .filter((k) => Number.isFinite(k.timestamp) && Number.isFinite(k.close) && k.timestamp >= DATA_START_MS && k.timestamp <= DATA_CUTOFF_MS)
            .sort((a, b) => a.timestamp - b.timestamp)
          data[STOCKS[i]] = filtered
        }
        const minLen = Math.min(...Object.values(data).map((d) => d.length))
        if (minLen < LEAD_IN_DAYS + 10) { setDataError("Not enough historical data."); return }
        for (const s of STOCKS) data[s] = data[s].slice(0, minLen)
        setAllData(data as Record<StockSymbol, SimKlinePoint[]>)
        setCurrentDayIndex(Math.min(LEAD_IN_DAYS, minLen - 1))
      } catch { if (active) setDataError("Failed to load historical data.") }
      finally { if (active) setDataLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [])

  // Current prices
  const currentPrices = useMemo(() => {
    const prices: Record<StockSymbol, number> = {} as Record<StockSymbol, number>
    for (const s of STOCKS) {
      const klines = allData[s]
      prices[s] = klines && currentDayIndex < klines.length ? klines[currentDayIndex].close : 0
    }
    return prices
  }, [allData, currentDayIndex])

  const currentKline = allData[selectedStock]?.[currentDayIndex] ?? null

  // Portfolio calculations
  const holdingsValue = useMemo(() => {
    let total = 0
    for (const s of STOCKS) total += holdings[s].qty * currentPrices[s]
    return total
  }, [holdings, currentPrices])

  const totalEquity = cash + holdingsValue
  const profit = totalEquity - STARTING_CASH

  // Annual dividend income estimate
  const estimatedAnnualIncome = useMemo(() => {
    let income = 0
    for (const s of STOCKS) {
      if (holdings[s].qty > 0) {
        income += (DIVIDEND_YIELDS[s] / 100) * currentPrices[s] * holdings[s].qty
      }
    }
    return income
  }, [holdings, currentPrices])

  const portfolioYield = holdingsValue > 0 ? (estimatedAnnualIncome / holdingsValue) * 100 : 0

  const stocksOwned = STOCKS.filter((s) => holdings[s].qty > 0).length

  // Days until next dividend for each stock
  const daysUntilDividend = useMemo(() => {
    const days: Record<StockSymbol, number> = {} as Record<StockSymbol, number>
    for (const s of STOCKS) {
      const daysSince = currentDayIndex - lastDividendDay[s]
      days[s] = Math.max(0, DIVIDEND_INTERVAL_DAYS - daysSince)
    }
    return days
  }, [currentDayIndex, lastDividendDay])

  // Process dividends when day changes
  const processDividendsRef = useRef(currentDayIndex)
  useEffect(() => {
    const prevDay = processDividendsRef.current
    if (currentDayIndex <= prevDay) {
      processDividendsRef.current = currentDayIndex
      return
    }
    processDividendsRef.current = currentDayIndex

    // Check each day from prevDay+1 to currentDayIndex for dividend payouts
    for (let day = prevDay + 1; day <= currentDayIndex; day++) {
      for (const s of STOCKS) {
        const daysSinceLastDiv = day - lastDividendDay[s]
        if (daysSinceLastDiv >= DIVIDEND_INTERVAL_DAYS && holdings[s].qty > 0) {
          const price = allData[s]?.[day]?.close ?? 0
          if (price <= 0) continue
          const perShare = (DIVIDEND_YIELDS[s] / 100 / 4) * price
          const total = perShare * holdings[s].qty

          setCash((p) => p + total)
          setTotalDividends((p) => p + total)
          setLastDividendDay((p) => ({ ...p, [s]: day }))
          setDividendStocks((p) => new Set(p).add(s))
          setLastDividendReceivedDay(day)

          const kline = allData[s]?.[day]
          const dateStr = kline ? formatDate(kline.timestamp) : `Day ${day}`

          setDividendEvents((p) => [...p, {
            dayIndex: day, date: dateStr, symbol: s,
            shares: holdings[s].qty, perShare, total, reinvested: false,
          }])

          const id = ++tradeIdRef.current
          setTrades((p) => [...p, {
            id, symbol: s, side: "dividend", qty: holdings[s].qty,
            price: perShare, dayIndex: day, date: dateStr, pnl: total,
          }])

          // Show notification for most recent dividend
          if (day === currentDayIndex) {
            setPendingDividendNotification({ symbol: s, total, perShare })
          }
        }
      }
    }
  }, [currentDayIndex, holdings, allData, lastDividendDay])

  // Chart data
  const { chartData, candleData, volumeByTime } = useMemo(() => {
    const klines = allData[selectedStock]
    if (!klines) return { chartData: [], candleData: [], volumeByTime: {} }
    const visible = klines.slice(0, currentDayIndex + 1)
    const volMap: Record<string, number> = {}
    const candles = visible.map((k) => {
      const time = k.timestamp / 1000
      const vol = Number(k.volume ?? 0)
      if (Number.isFinite(vol)) volMap[String(Math.round(time * 1000))] = vol
      return { time, open: k.open, high: k.high, low: k.low, close: k.close }
    })
    const area = candles.map((c) => ({ time: c.time, value: c.close }))
    return { chartData: area, candleData: candles, volumeByTime: volMap }
  }, [allData, selectedStock, currentDayIndex])

  const dateLabel = currentKline ? formatDate(currentKline.timestamp) : "--"
  const daysRemaining = dataLength - 1 - currentDayIndex
  const progressPercent = dataLength ? Math.round((currentDayIndex / (dataLength - 1)) * 100) : 0

  // Task checks
  useEffect(() => {
    if (dividendEvents.length > 0 && !tasks.receivedFirstDividend) setTasks((p) => ({ ...p, receivedFirstDividend: true }))
    if (dividendStocks.size >= MIN_DIVIDEND_STOCKS && !tasks.dividendFromTwo) setTasks((p) => ({ ...p, dividendFromTwo: true }))
    if (stocksOwned === 3 && !tasks.allThreeOwned) setTasks((p) => ({ ...p, allThreeOwned: true }))
    if (totalDividends >= 8000 && !tasks.totalDividendsTarget) setTasks((p) => ({ ...p, totalDividendsTarget: true }))
    if (profit >= PROFIT_TARGET && !tasks.madeProfit) setTasks((p) => ({ ...p, madeProfit: true }))
  }, [dividendEvents, dividendStocks, stocksOwned, totalDividends, profit, tasks])

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
    const price = currentPrices[selectedStock]
    if (!Number.isFinite(qty) || qty <= 0 || !price) return
    const cost = qty * price
    if (cost > cash) return
    setCash((p) => p - cost)
    setHoldings((p) => {
      const h = p[selectedStock]
      const newQty = h.qty + qty
      const newAvg = h.qty === 0 ? price : (h.avgCost * h.qty + cost) / newQty
      return { ...p, [selectedStock]: { qty: newQty, avgCost: newAvg } }
    })

    // Reinvest check: bought within REINVEST_WINDOW_DAYS of receiving a dividend
    if ((currentDayIndex - lastDividendReceivedDay) <= REINVEST_WINDOW_DAYS && dividendEvents.length > 0 && !tasks.reinvestedDividend) {
      setTasks((p) => ({ ...p, reinvestedDividend: true }))
    }

    const id = ++tradeIdRef.current
    setTrades((p) => [...p, { id, symbol: selectedStock, side: "buy", qty, price, dayIndex: currentDayIndex, date: currentKline ? formatDate(currentKline.timestamp) : "--" }])
  }, [quantity, selectedStock, currentPrices, cash, currentDayIndex, currentKline, lastDividendReceivedDay, dividendEvents, tasks.reinvestedDividend])

  const handleSell = useCallback(() => {
    const qty = Number(quantity)
    const price = currentPrices[selectedStock]
    const h = holdings[selectedStock]
    if (!Number.isFinite(qty) || qty <= 0 || qty > h.qty || !price) return
    const proceeds = qty * price
    const pnl = (price - h.avgCost) * qty
    setCash((p) => p + proceeds)
    setHoldings((p) => {
      const remaining = h.qty - qty
      return { ...p, [selectedStock]: { qty: remaining, avgCost: remaining === 0 ? 0 : h.avgCost } }
    })

    const id = ++tradeIdRef.current
    setTrades((p) => [...p, { id, symbol: selectedStock, side: "sell", qty, price, dayIndex: currentDayIndex, date: currentKline ? formatDate(currentKline.timestamp) : "--", pnl }])
  }, [quantity, selectedStock, currentPrices, holdings, currentDayIndex, currentKline])

  const handleSkip = useCallback((days: number) => {
    setPendingDividendNotification(null)
    setCurrentDayIndex((p) => Math.min(p + days, dataLength - 1))
  }, [dataLength])

  const handleReset = useCallback(() => {
    setCash(STARTING_CASH); setQuantity("100"); setCurrentDayIndex(initialDayIndex); setChartMode("candles")
    setSelectedStock("EFERT")
    setHoldings(Object.fromEntries(STOCKS.map((s) => [s, { qty: 0, avgCost: 0 }])) as Record<StockSymbol, StockHolding>)
    setTrades([]); tradeIdRef.current = 0
    setDividendEvents([]); setTotalDividends(0)
    setLastDividendDay(Object.fromEntries(STOCKS.map((s) => [s, -DIVIDEND_INTERVAL_DAYS])) as Record<StockSymbol, number>)
    setDividendStocks(new Set()); setLastDividendReceivedDay(-999)
    setPendingDividendNotification(null)
    processDividendsRef.current = initialDayIndex
    setTasks({ receivedFirstDividend: false, dividendFromTwo: false, reinvestedDividend: false, allThreeOwned: false, totalDividendsTarget: false, madeProfit: false })
    setGuideStep(0); setShowConfetti(false); setShowCompletion(false); completionShownRef.current = false
  }, [initialDayIndex])

  const fmt = (v: number, sign = false) => { const s = sign && v > 0 ? "+" : ""; return `PKR ${s}${v.toFixed(0)}` }
  const pnlColor = (v: number) => v > 0 ? "text-emerald-500 dark:text-emerald-400" : v < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"

  // Auth
  useEffect(() => { if (!authLoading && !user) window.location.replace("/signin") }, [authLoading, user])
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><div className="text-sm text-muted-foreground">Loading...</div></div>
  if (!user) return null
  if (dataLoading) return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar /><main className="mx-auto max-w-6xl px-4 py-10 text-center"><FlaskConical className="mx-auto mb-4 h-8 w-8 animate-pulse text-emerald-500" /><p className="text-sm text-muted-foreground">Loading 3 dividend stocks...</p></main>
    </div>
  )
  if (dataError) return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar /><main className="mx-auto max-w-3xl px-4 py-10"><Card className="border border-border/60 bg-card/90"><CardHeader><CardTitle>Lab Unavailable</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{dataError}</p><Link href="/labs"><Button variant="outline" className="cursor-pointer"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Labs</Button></Link></CardContent></Card></main>
    </div>
  )

  const atEnd = currentDayIndex >= dataLength - 1
  const selPrice = currentPrices[selectedStock]
  const selHolding = holdings[selectedStock]
  const selUnrealizedPnl = selHolding.qty > 0 ? (selPrice - selHolding.avgCost) * selHolding.qty : 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar />
      {showConfetti && <Confetti />}
      {showCompletion && <CompletionDialog onClose={() => setShowCompletion(false)} />}
      {guideStep !== null && guideStep < GUIDE_STEPS.length && (
        <GuideOverlay step={guideStep} total={GUIDE_STEPS.length} title={GUIDE_STEPS[guideStep].title} body={GUIDE_STEPS[guideStep].body}
          onNext={() => { guideStep < GUIDE_STEPS.length - 1 ? setGuideStep(guideStep + 1) : setGuideStep(null) }} onBack={() => setGuideStep((s) => (s === null ? 0 : Math.max(0, s - 1)))} onSkip={() => setGuideStep(null)} />
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/labs" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground transition hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lab 22: Dividend Strategy</h1>
              <p className="text-xs text-muted-foreground">{dateLabel} &middot; {daysRemaining} days remaining</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setGuideStep(0)} className="text-xs cursor-pointer"><FlaskConical className="mr-1 h-3.5 w-3.5" /> Restart Guide</Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs cursor-pointer"><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset Lab</Button>
          </div>
        </div>

        {/* Dividend Notification Banner */}
        {pendingDividendNotification && (
          <div className="flex items-center justify-between rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Dividend Received!</span>
                <span className="ml-2 text-sm text-amber-700 dark:text-amber-300">
                  {pendingDividendNotification.symbol} paid PKR {pendingDividendNotification.perShare.toFixed(2)}/share — total PKR {pendingDividendNotification.total.toFixed(0)} added to cash
                </span>
              </div>
            </div>
            <button onClick={() => setPendingDividendNotification(null)} className="text-amber-600 hover:text-amber-800 dark:text-amber-400"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Dividend Income Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-card/90 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Coins className="h-3 w-3" /> Total Dividends</div>
            <div className={`text-sm font-bold ${totalDividends > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
              PKR {totalDividends.toFixed(0)}
            </div>
            <div className="text-[10px] text-muted-foreground">{totalDividends >= 8000 ? "Target reached!" : `${((totalDividends / 8000) * 100).toFixed(0)}% of 8,000`}</div>
          </div>
          <div className="rounded-lg border border-border bg-card/90 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><TrendingUp className="h-3 w-3" /> Portfolio Yield</div>
            <div className="text-sm font-bold text-foreground">{portfolioYield.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">~PKR {(estimatedAnnualIncome / 4).toFixed(0)}/qtr</div>
          </div>
          <div className="rounded-lg border border-border bg-card/90 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><Wallet className="h-3 w-3" /> Cash</div>
            <div className="text-sm font-semibold text-foreground">{fmt(cash)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card/90 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><TrendingUp className="h-3 w-3" /> Total P&L</div>
            <div className={`text-sm font-bold ${pnlColor(profit)}`}>{fmt(profit, true)}</div>
          </div>
        </div>

        {/* Dividend Countdown Bars */}
        <div className="rounded-lg border border-border bg-card/90 px-4 py-3">
          <div className="flex items-center gap-1 mb-2 text-xs font-medium text-muted-foreground"><Coins className="h-3.5 w-3.5" /> Next Dividend Payouts</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {STOCKS.map((s) => {
              const daysLeft = daysUntilDividend[s]
              const pct = ((DIVIDEND_INTERVAL_DAYS - daysLeft) / DIVIDEND_INTERVAL_DAYS) * 100
              const hasShares = holdings[s].qty > 0
              const estPayout = hasShares ? computeQuarterlyDividend(DIVIDEND_YIELDS[s], currentPrices[s], holdings[s].qty) : 0
              return (
                <div key={s} className={`rounded-md border px-3 py-2 ${hasShares ? "border-border bg-background/30" : "border-border/50 bg-muted/20 opacity-60"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STOCK_COLORS[s] }} />
                      <span className="text-xs font-semibold">{s}</span>
                      <span className="text-[10px] text-muted-foreground">({DIVIDEND_YIELDS[s]}% yield)</span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {daysLeft === 0 ? "Due!" : `${daysLeft}d`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: STOCK_COLORS[s] + "99" }} />
                  </div>
                  {hasShares && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Est. payout: PKR {estPayout.toFixed(0)} ({holdings[s].qty} sh)
                    </div>
                  )}
                  {!hasShares && <div className="text-[10px] text-muted-foreground mt-1">No shares — buy to earn dividends</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Timeline</span><Progress value={progressPercent} className="h-1.5 flex-1" /><span>{progressPercent}%</span>
        </div>

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* Chart + Stock Selector */}
          <Card className="min-w-0 border border-border/60 bg-card/90">
            <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-2">
                {STOCKS.map((s) => (
                  <button key={s} onClick={() => setSelectedStock(s)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      s === selectedStock ? "text-white" : "text-muted-foreground hover:text-foreground bg-muted/30"
                    }`}
                    style={s === selectedStock ? { backgroundColor: STOCK_COLORS[s] } : {}}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant={chartMode === "area" ? "default" : "outline"} onClick={() => setChartMode("area")} className="h-7 px-2 text-xs">Line</Button>
                <Button size="sm" variant={chartMode === "candles" ? "default" : "outline"} onClick={() => setChartMode("candles")} className="h-7 px-2 text-xs">Candles</Button>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden" style={{ height: 380 }}>
              <PriceChart data={chartData} candles={candleData} volumeByTime={volumeByTime} viewMode={chartMode} lastPrice={selPrice} height={380} timeMode="date" />
            </CardContent>
          </Card>

          {/* Trading Panel */}
          <div className="space-y-4">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="py-3">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  Trade <span className="px-1.5 py-0.5 rounded text-xs text-white" style={{ backgroundColor: STOCK_COLORS[selectedStock] }}>{selectedStock}</span>
                  <span className="text-xs text-muted-foreground font-normal">{STOCK_SECTORS[selectedStock]} &middot; {DIVIDEND_YIELDS[selectedStock]}% yield</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Price</div>
                    <div className="text-sm font-semibold text-foreground">PKR {selPrice.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Holding</div>
                    <div className="text-sm font-semibold text-foreground">{selHolding.qty} shares</div>
                  </div>
                  {selHolding.qty > 0 && (
                    <>
                      <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Cost</div>
                        <div className="text-sm font-semibold text-foreground">PKR {selHolding.avgCost.toFixed(2)}</div>
                      </div>
                      <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">P&L</div>
                        <div className={`text-sm font-semibold ${pnlColor(selUnrealizedPnl)}`}>{fmt(selUnrealizedPnl, true)}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Reinvest hint */}
                {(currentDayIndex - lastDividendReceivedDay) <= REINVEST_WINDOW_DAYS && dividendEvents.length > 0 && !tasks.reinvestedDividend && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Buy now to reinvest your dividend! ({REINVEST_WINDOW_DAYS - (currentDayIndex - lastDividendReceivedDay)}d left)</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Quantity</Label>
                  <Input className="bg-background/70 border-border text-foreground" type="number" min={1} value={quantity}
                    onChange={(e) => setQuantity(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleBuy}
                    disabled={!selPrice || Number(quantity) <= 0 || Number(quantity) * selPrice > cash || atEnd}>
                    Buy {selectedStock}
                  </Button>
                  <Button className="w-full cursor-pointer bg-red-600 hover:bg-red-500" onClick={handleSell}
                    disabled={!selPrice || Number(quantity) <= 0 || Number(quantity) > selHolding.qty || atEnd}>
                    Sell {selectedStock}
                  </Button>
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

            {/* Stock Overview */}
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="py-2"><CardTitle className="text-sm text-foreground">All Positions</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {STOCKS.map((s) => {
                  const h = holdings[s]
                  const price = currentPrices[s]
                  const pnl = h.qty > 0 ? (price - h.avgCost) * h.qty : 0
                  return (
                    <button key={s} onClick={() => setSelectedStock(s)}
                      className={`w-full flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs transition ${
                        s === selectedStock ? "border-foreground/30 bg-muted/40" : "border-border bg-background/20 hover:bg-muted/20"
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STOCK_COLORS[s] }} />
                        <span className="font-semibold">{s}</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">{DIVIDEND_YIELDS[s]}%</span>
                        <span className="text-muted-foreground">{h.qty > 0 ? `${h.qty} sh` : "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {h.qty > 0 && <span className={`font-semibold ${pnlColor(pnl)}`}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}</span>}
                        <span className="text-muted-foreground">PKR {price.toFixed(1)}</span>
                      </div>
                    </button>
                  )
                })}
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
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    done ? "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200" : "border-border bg-background/30 text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 flex-shrink-0" />}
                    <span className={done ? "line-through opacity-70" : ""}>{TASK_LABELS[key]}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dividend History */}
        {dividendEvents.length > 0 && (
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="py-3"><CardTitle className="text-base text-foreground flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" /> Dividend History ({dividendEvents.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[200px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr><th className="text-left p-1.5">Date</th><th className="text-left p-1.5">Stock</th><th className="text-right p-1.5">Shares</th><th className="text-right p-1.5">Per Share</th><th className="text-right p-1.5">Total</th></tr>
                  </thead>
                  <tbody>
                    {[...dividendEvents].reverse().map((d, i) => (
                      <tr key={i} className="border-b border-border/40">
                        <td className="p-1.5 text-xs text-muted-foreground">{d.date}</td>
                        <td className="p-1.5"><span className="inline-flex items-center gap-1 text-xs font-semibold"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: STOCK_COLORS[d.symbol] }} />{d.symbol}</span></td>
                        <td className="p-1.5 text-right text-xs">{d.shares}</td>
                        <td className="p-1.5 text-right text-xs">PKR {d.perShare.toFixed(2)}</td>
                        <td className="p-1.5 text-right text-xs font-semibold text-amber-600 dark:text-amber-400">+PKR {d.total.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 flex justify-between text-xs">
                <span className="text-muted-foreground">Total dividends collected</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">PKR {totalDividends.toFixed(0)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade History */}
        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="py-3"><CardTitle className="text-base text-foreground">Trade History ({trades.length})</CardTitle></CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades yet. Buy dividend stocks and hold them to collect quarterly payouts.</p>
            ) : (
              <div className="max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur text-xs">
                    <tr><th className="text-left p-1.5">Date</th><th className="text-left p-1.5">Stock</th><th className="text-left p-1.5">Type</th><th className="text-right p-1.5">Qty</th><th className="text-right p-1.5">Price</th><th className="text-right p-1.5">P&L</th></tr>
                  </thead>
                  <tbody>
                    {[...trades].reverse().map((t) => (
                      <tr key={t.id} className="border-b border-border/40">
                        <td className="p-1.5 text-xs text-muted-foreground">{t.date}</td>
                        <td className="p-1.5"><span className="inline-flex items-center gap-1 text-xs font-semibold"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: STOCK_COLORS[t.symbol] }} />{t.symbol}</span></td>
                        <td className="p-1.5">
                          <span className={`text-xs font-semibold uppercase ${
                            t.side === "buy" ? "text-emerald-500" : t.side === "sell" ? "text-red-500" : "text-amber-500"
                          }`}>{t.side === "dividend" ? "DIV" : t.side}</span>
                        </td>
                        <td className="p-1.5 text-right text-xs">{t.qty}</td>
                        <td className="p-1.5 text-right text-xs">{t.side === "dividend" ? `${t.price.toFixed(2)}/sh` : t.price.toFixed(2)}</td>
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
