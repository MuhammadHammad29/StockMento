"use client"

/**
 * Labs index — guided hands-on exercises on historical PSX data.
 */

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  FlaskConical,
  Lock,
  Clock,
  Target,
  ArrowRight,
  Search,
  X,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import UserNavbar from "@/components/navigation/UserNavbar"
import { useAuth } from "@/lib/auth-context"
import { labsApi } from "@/lib/api"
import type { PublicLabSummary } from "@/lib/types"

type Difficulty = "Beginner" | "Intermediate" | "Advanced"

type Lab = {
  id: number
  title: string
  description: string
  difficulty: Difficulty
  estimatedMinutes: number
  stock: string
  available: boolean
  module: string
  routePath?: string
}

const LABS: Lab[] = [
  { id: 1, title: "Execute Your First Trade", module: "Foundations", description: "Learn the basics of the trading simulator. Buy and sell stocks, skip through time, and make your first profit using historical PSX data.", difficulty: "Beginner", estimatedMinutes: 10, stock: "LUCK", available: true },
  { id: 2, title: "Market vs Limit Orders", module: "Foundations", description: "Understand the difference between market orders (instant execution) and limit orders (execute at a target price). Learn to manage pending orders.", difficulty: "Beginner", estimatedMinutes: 15, stock: "ENGROH", available: true },
  { id: 3, title: "Spot a Bullish Breakout", module: "Trends", description: "Learn to identify bullish breakouts using the 20-day high as resistance. Buy when price breaks out and sell for a 10%+ profit.", difficulty: "Beginner", estimatedMinutes: 15, stock: "ENGROH", available: true },
  { id: 4, title: "Trade with Support & Resistance", module: "Trends", description: "Identify the 40-day support and resistance levels. Buy near the price floor, sell near the ceiling, and profit from range bounces.", difficulty: "Beginner", estimatedMinutes: 15, stock: "PPL", available: true },
  { id: 5, title: "Trade with SMA Crossover", module: "Indicators", description: "Use the 20-day Simple Moving Average to time your entries and exits. Trade with the trend and build profitable positions.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "OGDC", available: true },
  { id: 6, title: "Avoid the Overbought Trap", module: "Indicators", description: "Learn to use RSI to identify overbought conditions. Avoid buying when RSI exceeds 70 and protect your capital.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "MEBL", available: true },
  { id: 7, title: "Trade a Bullish Engulfing", module: "Candlesticks", description: "Spot bullish engulfing candlestick patterns and time your entry to capture upside moves. Buy within 2 candles of the signal.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "ENGROH", available: true },
  { id: 8, title: "Spot a Bearish Reversal", module: "Candlesticks", description: "Identify shooting stars, dojis, and bearish engulfing patterns. Sell within 3 candles to avoid the drop that follows.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "LUCK", available: true },
  { id: 9, title: "Risk Management", module: "Risk", description: "Learn to set stop losses, manage position sizes, and control drawdowns. Protect your capital through volatile conditions.", difficulty: "Advanced", estimatedMinutes: 30, stock: "HUBC", available: true },
  { id: 10, title: "Position Sizing Discipline", module: "Risk", description: "Keep every buy under 30% of your equity and manage drawdown below 15%. Build the discipline that separates professionals from gamblers.", difficulty: "Advanced", estimatedMinutes: 25, stock: "OGDC", available: true },
  { id: 11, title: "Avoid Panic Selling", module: "Psychology", description: "Experience a real market crash and resist the urge to sell. Hold through a 15%+ dip and watch the recovery. Can you beat your emotions?", difficulty: "Advanced", estimatedMinutes: 20, stock: "LUCK", available: true },
  { id: 12, title: "Don't Chase the Spike", module: "Psychology", description: "Resist FOMO when a stock spikes 7%+. Avoid buying in the danger zone and wait for the pullback. NETSOL's volatile history will test your discipline.", difficulty: "Advanced", estimatedMinutes: 20, stock: "NETSOL", available: true },
  { id: 13, title: "Trade a Channel Bounce", module: "Charting", description: "Trade the 20-day Donchian channel. Buy at the lower boundary, sell at the upper. Master range-bound trading with channel visualization.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "ENGROH", available: true },
  { id: 14, title: "Head & Shoulders Breakdown", module: "Charting", description: "Identify the head and shoulders reversal pattern on LUCK's 2021 chart. Spot the left shoulder, head, and right shoulder, then sell before the neckline breaks down.", difficulty: "Advanced", estimatedMinutes: 25, stock: "LUCK", available: true },
  { id: 15, title: "Trade a MACD Signal", module: "Advanced Indicators", description: "Master the MACD indicator — buy on bullish crossovers, sell on bearish reversals, and use the histogram to confirm momentum before trading.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "MEBL", available: true },
  { id: 16, title: "Bollinger Band Bounce", module: "Advanced Indicators", description: "Trade mean-reversion using Bollinger Bands on PPL. Buy when price touches the oversold lower band, sell when it reaches the overbought upper band.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "PPL", available: true },
  { id: 17, title: "Catch the Swing", module: "Strategies", description: "Ride LUCK's price oscillations by buying confirmed swing lows and selling at swing highs. Complete 3 profitable swings of 5%+ each.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "LUCK", available: true },
  { id: 18, title: "Trade a Breakout", module: "Strategies", description: "Spot consolidation patterns on EFERT, then buy the decisive breakout above resistance with volume confirmation. Hold through the follow-through for 10%+ gains.", difficulty: "Intermediate", estimatedMinutes: 20, stock: "EFERT", available: true },
  { id: 19, title: "Quick Momentum Trade", module: "Advanced Strategies", description: "Trade HCAR's explosive daily moves — buy on 2%+ momentum days and exit within 3 days. Speed and discipline are everything. Never overhold.", difficulty: "Advanced", estimatedMinutes: 20, stock: "HCAR", available: true },
  { id: 20, title: "Quick Scalps", module: "Advanced Strategies", description: "Scalp HUBC for tiny, rapid profits — buy and sell within 1 day, take 1%+ gains, and build a winning streak. 8 successful scalps to complete.", difficulty: "Advanced", estimatedMinutes: 15, stock: "HUBC", available: true },
  { id: 21, title: "Build a Mini Portfolio", module: "Portfolio", description: "Diversify across 5 PSX blue chips — LUCK, OGDC, HUBC, EFERT, MARI. Manage allocation, rebalance when positions drift, and grow your portfolio to a PKR 20,000 profit.", difficulty: "Advanced", estimatedMinutes: 25, stock: "Multi-Stock", available: true },
  { id: 22, title: "Dividend Strategy", module: "Portfolio", description: "Build an income portfolio from 3 dividend-paying stocks — EFERT (5%), OGDC (4%), LUCK (3%). Collect quarterly dividends, reinvest for compounding, and hit PKR 8,000+ in total dividends.", difficulty: "Advanced", estimatedMinutes: 25, stock: "Multi-Stock", available: true },
]

const DIFF_CHIPS: { label: string; value: Difficulty | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Beginner", value: "Beginner" },
  { label: "Intermediate", value: "Intermediate" },
  { label: "Advanced", value: "Advanced" },
]

const DIFF_DOT: Record<Difficulty, string> = {
  Beginner: "bg-[color:var(--bull)]",
  Intermediate: "bg-[color:var(--chart-3)]",
  Advanced: "bg-[color:var(--bear)]",
}

const DIFF_CHIP_CLASS: Record<Difficulty, string> = {
  Beginner: "bg-primary-soft text-accent-foreground",
  Intermediate: "bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]",
  Advanced: "bg-[color:var(--bear)]/10 text-[color:var(--bear)]",
}

export default function LabsPage() {
  const { user, loading } = useAuth()
  const [filter, setFilter] = useState<(typeof DIFF_CHIPS)[number]["value"]>("All")
  const [query, setQuery] = useState("")
  const [dbLabs, setDbLabs] = useState<Lab[]>([])

  useEffect(() => {
    if (!loading && !user) window.location.replace("/signin")
  }, [loading, user])

  useEffect(() => {
    if (!user) return

    let active = true
    const loadLabs = async () => {
      try {
        const labs = await labsApi.list()
        if (active && labs.length > 0) {
          setDbLabs(labs.map(mapPublicLab))
        }
      } catch {
        if (active) setDbLabs([])
      }
    }

    void loadLabs()
    return () => {
      active = false
    }
  }, [user])

  const labs = dbLabs.length > 0 ? dbLabs : LABS

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return labs.filter((lab) => {
      const matchDiff = filter === "All" || lab.difficulty === filter
      const matchQuery =
        !q ||
        lab.title.toLowerCase().includes(q) ||
        lab.description.toLowerCase().includes(q) ||
        lab.stock.toLowerCase().includes(q) ||
        lab.module.toLowerCase().includes(q)
      return matchDiff && matchQuery
    })
  }, [filter, labs, query])

  const byModule = useMemo(() => {
    const groups = new Map<string, Lab[]>()
    for (const lab of filtered) {
      const key = lab.module
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(lab)
    }
    return groups
  }, [filtered])

  const counts = useMemo(() => {
    const byDiff: Record<Difficulty, number> = { Beginner: 0, Intermediate: 0, Advanced: 0 }
    for (const lab of labs) byDiff[lab.difficulty]++
    return byDiff
  }, [labs])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UserNavbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <FlaskConical className="h-3 w-3" />
              Trading labs
            </div>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Hands-on exercises on real PSX data.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Guided scenarios from first trade to portfolio construction. Each lab uses historical data —
              no risk, full practice.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border/60">
            <MiniStat label="Total" value={labs.length.toString()} />
            <MiniStat label="Beginner" value={counts.Beginner.toString()} />
            <MiniStat label="Intermed." value={counts.Intermediate.toString()} />
            <MiniStat label="Advanced" value={counts.Advanced.toString()} />
          </div>
        </header>

        {/* Filters */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search labs, stocks, modules…"
              className="h-10 pl-10 pr-10 bg-surface-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 p-1">
            {DIFF_CHIPS.map((opt) => {
              const active = opt.value === filter
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Labs grouped by module */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-12 text-center">
            <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="font-display mt-4 text-lg font-semibold text-foreground">
              No labs match
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search or clear your filter.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(byModule.entries()).map(([module, labs]) => (
              <div key={module}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {module}
                  </h2>
                  <div className="h-px flex-1 mx-4 bg-border" />
                  <span className="num text-[11px] text-muted-foreground">
                    {labs.length} lab{labs.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {labs.map((lab) => (
                    <LabCard key={lab.id} lab={lab} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function LabCard({ lab }: { lab: Lab }) {
  const disabled = !lab.available
  const Body = (
    <div
      className={`card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-1 p-5 ${disabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
            {lab.available ? <FlaskConical className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Lab {lab.id}
            </div>
            <h3 className="font-display mt-0.5 text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {lab.title}
            </h3>
          </div>
        </div>
        <Badge
          className={`rounded-full border-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${DIFF_CHIP_CLASS[lab.difficulty]}`}
        >
          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${DIFF_DOT[lab.difficulty]}`} />
          {lab.difficulty}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{lab.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />~{lab.estimatedMinutes} min
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <Target className="h-3 w-3" />
            {lab.stock}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 font-medium text-foreground transition-colors group-hover:text-primary">
          {lab.available ? "Start" : "Locked"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  )

  if (disabled) return Body
  return (
    <Link href={lab.routePath ?? `/labs/${lab.id}`} className="block">
      {Body}
    </Link>
  )
}

function mapPublicLab(lab: PublicLabSummary): Lab {
  return {
    id: lab.sortOrder || Number.parseInt(lab.routePath.split("/").pop() ?? "", 10) || 0,
    title: lab.title,
    description: lab.description,
    difficulty: toDisplayDifficulty(lab.difficulty),
    estimatedMinutes: lab.estimatedMinutes,
    stock: lab.stockSymbol ?? "Multi-Stock",
    available: lab.isPublished,
    module: lab.module,
    routePath: lab.routePath,
  }
}

function toDisplayDifficulty(value: PublicLabSummary["difficulty"]): Difficulty {
  if (value === "advanced") return "Advanced"
  if (value === "intermediate") return "Intermediate"
  return "Beginner"
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-surface-1 px-3 py-3 text-center sm:px-4 sm:py-3.5">
      <div className="num font-display text-lg font-semibold text-foreground sm:text-xl">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
    </div>
  )
}
