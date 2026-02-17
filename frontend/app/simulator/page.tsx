"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import io, { Socket } from "socket.io-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { BarChart3, BriefcaseBusiness, ChevronDown, Info, Lock, Wallet } from "lucide-react"
import UserNavbar from "@/components/navigation/UserNavbar"
import { useAuth } from "@/lib/auth-context"
import { simulatorApi } from "@/lib/api"
import { STORAGE_KEYS } from "@/lib/data-utils"
import type {
  SimAccountStatusResponse,
  SimIntradayCandle,
  SimKlinePoint,
  SimPortfolio,
  SimTick,
} from "@/lib/types"
import { PriceChart } from "@/components/simulator/PriceChart"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const MAX_TICKS = 15000
const PORTFOLIO_POLL_INTERVAL_MS = 25000

const DEFAULT_WATCHLIST = [
  "ATRL",
  "AVN",
  "DGKC",
  "EFERT",
  "ENGROH",
  "FABL",
  "FCCL",
  "FFL",
  "GAL",
  "GHNI",
  "HCAR",
  "HUBC",
  "LUCK",
  "MARI",
  "MEBL",
  "MLCF",
  "MTL",
  "NETSOL",
  "OCTOPUS",
  "OGDC",
  "PAEL",
  "PIOC",
  "PPL",
  "PRL",
  "PSO",
  "SAZEW",
  "SEARL",
  "SNGP",
  "SYS",
  "TOMCL",
]

const INDEX_SYMBOLS = ["KSE100", "KMI30"] as const
type IndexSymbol = (typeof INDEX_SYMBOLS)[number]
const INDEX_LABELS: Record<IndexSymbol, string> = {
  KSE100: "KSE-100",
  KMI30: "KMI-30",
}

type OrderForm = {
  symbol: string
  side: "buy" | "sell"
  orderType: "market" | "limit" | "stop_limit"
  quantity: string
  limitPrice?: string
  triggerPrice?: string
  stopLimitPrice?: string
}

type OrderFilledEvent = {
  orderId: string
  tradeId: string
  symbol: string
  price: number
  time: string
}

type OrderCancelledEvent = {
  orderId: string
  symbol: string
  reason: string
  time: string
}

export default function SimulatorPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [ticks, setTicks] = useState<SimTick[]>([])
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null)
  const [symbol, setSymbol] = useState("ATRL")
  const [watchlist, setWatchlist] = useState<Record<string, SimTick | null>>({})
  const [selectedIndexSymbol, setSelectedIndexSymbol] = useState<IndexSymbol>("KSE100")
  const [indexTicks, setIndexTicks] = useState<Record<IndexSymbol, SimTick | null>>({
    KSE100: null,
    KMI30: null,
  })
  const [indexMenuOpen, setIndexMenuOpen] = useState(false)
  const [orderTypeMenuOpen, setOrderTypeMenuOpen] = useState(false)
  const [layoutMode, setLayoutMode] = useState<"split" | "stack">("split")
  const [dateRange, setDateRange] = useState<"1m" | "1d">("1m")
  const [intradayCandles, setIntradayCandles] = useState<SimIntradayCandle[]>([])
  const [dailyKlines, setDailyKlines] = useState<
    { timestamp: number; open: number; high: number; low: number; close: number; volume?: number }[]
  >([])
  const [klinesPending, setKlinesPending] = useState(false)
  const [form, setForm] = useState<OrderForm>({
    symbol: "ATRL",
    side: "buy",
    orderType: "market",
    quantity: "100",
  })
  const [chartMode, setChartMode] = useState<"area" | "candles">("area")
  const [pending, setPending] = useState(false)
  const [accountStatus, setAccountStatus] = useState<SimAccountStatusResponse | null>(null)
  const [accountChecking, setAccountChecking] = useState(true)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [accountCheckNonce, setAccountCheckNonce] = useState(0)
  const [cancelPending, setCancelPending] = useState<string | null>(null)
  const [chartHeight, setChartHeight] = useState(380)
  const watchedOpenOrderIdsRef = useRef<Set<string>>(new Set())
  const cancelRequestedOrderIdsRef = useRef<Set<string>>(new Set())
  const marketDownRef = useRef(false)
  const priceActionCardRef = useRef<HTMLDivElement | null>(null)
  const orderTicketCardRef = useRef<HTMLDivElement | null>(null)

  const formatCurrency = (value?: number | null, withSign = false) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "--"
    const fixed = value.toFixed(2)
    const sign = withSign && value > 0 ? "+" : ""
    return `PKR ${sign}${fixed}`
  }

  const formatPercent = (value?: number | null, withSign = false) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "--"
    const fixed = value.toFixed(2)
    const sign = withSign && value > 0 ? "+" : ""
    return `${sign}${fixed}%`
  }

  const formatVolume = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "--"
    return value.toLocaleString("en-US")
  }

  const formatFillTime = (value?: string | null) => {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const showOrderFilledToast = useCallback(({
    symbol: filledSymbol,
    price,
    time,
    side,
    quantity,
  }: {
    symbol?: string
    price?: number | null
    time?: string | null
    side?: "buy" | "sell"
    quantity?: number
  }) => {
    const symbolLabel = (filledSymbol ?? symbol).toUpperCase()
    const sideLabel = side ? side.toUpperCase() : null
    const qtyLabel = Number.isFinite(quantity) ? String(quantity) : null
    const title = [sideLabel, qtyLabel, symbolLabel].filter(Boolean).join(" ")
    const detail = [formatCurrency(price ?? null), formatFillTime(time)]
      .filter(Boolean)
      .join(" at ")
    toast.success(title ? `${title} filled` : "Order filled", {
      description: detail || undefined,
      position: "top-right",
    })
  }, [symbol])

  const pnlColor = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "text-muted-foreground"
    if (value > 0) return "text-emerald-400"
    if (value < 0) return "text-red-400"
    return "text-muted-foreground"
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const updateScreen = () => {
      if (window.innerWidth < 1024) {
        setLayoutMode("stack")
      }
    }
    updateScreen()
    window.addEventListener("resize", updateScreen)
    return () => window.removeEventListener("resize", updateScreen)
  }, [])

  useEffect(() => {
    if (!user) {
      setAccountStatus(null)
      setAccountChecking(false)
      return
    }
    let active = true
    setAccountChecking(true)
    setAccountError(null)
    ;(async () => {
      try {
        const status = await simulatorApi.account()
        if (!active) return
        setAccountStatus(status)
      } catch (err) {
        console.error(err)
        if (active) {
          setAccountError("Unable to verify simulator access. Please try again.")
        }
      } finally {
        if (active) {
          setAccountChecking(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [user, accountCheckNonce])

  useEffect(() => {
    if (!user || !accountStatus?.hasAccount) return
    let socket: Socket | null = null
    let active = true
    const load = async () => {
      try {
        const data = await simulatorApi.start(symbol)
        if (!active) return
        setPortfolio(data.portfolio)
        setTicks((data.ticks ?? []).slice(-MAX_TICKS))
        const wl = await simulatorApi.tickers([...DEFAULT_WATCHLIST, ...INDEX_SYMBOLS].join(","))
        if (!active) return
        const nextWatchlist: Record<string, SimTick | null> = {}
        for (const item of DEFAULT_WATCHLIST) {
          nextWatchlist[item] = wl[item] ?? null
        }
        setWatchlist(nextWatchlist)
        setIndexTicks({
          KSE100: wl.KSE100 ?? null,
          KMI30: wl.KMI30 ?? null,
        })
      } catch (err) {
        console.error(err)
        toast.error("Unable to start simulator.", { position: "top-right" })
      }
    }
    void load()

    const socketToken =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        : null
    socket = io(API_BASE_URL, {
      transports: ["websocket"],
      auth: socketToken ? { token: socketToken } : undefined,
    })

    const refreshPortfolio = async () => {
      try {
        const nextPortfolio = await simulatorApi.portfolio()
        if (!active) return
        setPortfolio(nextPortfolio)
      } catch (error) {
        console.error(error)
      }
    }

    socket.on("tick", (tick: SimTick) => {
      if (!tick?.symbol) return
      const tickSymbol = tick.symbol.toUpperCase() as IndexSymbol
      if (INDEX_SYMBOLS.includes(tickSymbol)) {
        setIndexTicks((prev) => ({ ...prev, [tickSymbol]: tick }))
      }
      if (tick.symbol === symbol) {
        setTicks((prev) => {
          const next = [...prev, tick].slice(-MAX_TICKS)
          return next
        })
      }
      setWatchlist((prev) => {
        if (!(tick.symbol in prev)) return prev
        return { ...prev, [tick.symbol]: tick }
      })
    })
    socket.on("orderFilled", (event: OrderFilledEvent) => {
      if (!event?.orderId) return
      watchedOpenOrderIdsRef.current.delete(event.orderId)
      cancelRequestedOrderIdsRef.current.delete(event.orderId)
      showOrderFilledToast({
        symbol: event.symbol,
        price: event.price,
        time: event.time,
      })
      void refreshPortfolio()
    })
    socket.on("orderCancelled", (event: OrderCancelledEvent) => {
      if (!event?.orderId) return
      watchedOpenOrderIdsRef.current.delete(event.orderId)
      cancelRequestedOrderIdsRef.current.delete(event.orderId)
      if (typeof event.reason === "string" && event.reason.startsWith("market_status:")) {
        toast.error(`Order cancelled (${event.reason.replace("market_status:", "")})`, {
          position: "top-right",
        })
      }
      void refreshPortfolio()
    })
    socket.on("intradayCandle", (candle: SimIntradayCandle) => {
      if (!candle?.symbol) return
      if (candle.symbol !== symbol) return
      setIntradayCandles((prev) => {
        const existingIndex = prev.findIndex((c) => c.minute === candle.minute)
        if (existingIndex === -1) {
          const next = [...prev, candle]
          return next.sort((a, b) => a.minute - b.minute)
        }
        const next = [...prev]
        next[existingIndex] = candle
        return next
      })
    })
    return () => {
      active = false
      socket?.disconnect()
    }
  }, [symbol, user, accountStatus?.hasAccount, showOrderFilledToast])

  useEffect(() => {
    if (!user || !accountStatus?.hasAccount) {
      setIntradayCandles([])
      return
    }
    setIntradayCandles([])
    let active = true
    const load = async () => {
      try {
        const data = await simulatorApi.intradayCandles(symbol)
        if (active) {
          const sorted = [...data].sort((a, b) => a.minute - b.minute)
          setIntradayCandles(sorted)
        }
      } catch (err) {
        console.error(err)
        if (active) {
          toast.error("Failed to load intraday candles", { position: "top-right" })
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [user, accountStatus?.hasAccount, symbol])

  const latestTick = useMemo(() => {
    const last = ticks[ticks.length - 1] ?? null
    if (last && last.symbol === symbol) return last
    return watchlist[symbol] ?? null
  }, [ticks, symbol, watchlist])

  const latestPrice = useMemo(() => {
    const price = latestTick?.price
    return Number.isFinite(price) ? price ?? null : null
  }, [latestTick])

  const latestVolume = useMemo(() => {
    const vol = latestTick?.volume ?? latestTick?.trades
    return Number.isFinite(vol) ? Number(vol) : null
  }, [latestTick])

  const latestBuyVolume = useMemo(() => {
    const vol = latestTick?.bidVol
    return Number.isFinite(vol) ? Number(vol) : null
  }, [latestTick])

  const latestSellVolume = useMemo(() => {
    const vol = latestTick?.askVol
    return Number.isFinite(vol) ? Number(vol) : null
  }, [latestTick])

  const selectedIndexTick = useMemo(() => {
    return indexTicks[selectedIndexSymbol] ?? null
  }, [indexTicks, selectedIndexSymbol])

  const selectedIndexStatus = useMemo(() => {
    if (typeof selectedIndexTick?.st !== "string") return "--"
    const normalized = selectedIndexTick.st.trim().toUpperCase()
    return normalized || "--"
  }, [selectedIndexTick])

  const selectedIndexPrice = useMemo(() => {
    const price = selectedIndexTick?.price
    return Number.isFinite(price) ? Number(price) : null
  }, [selectedIndexTick])

  const selectedIndexChange = useMemo(() => {
    const change = selectedIndexTick?.change
    return Number.isFinite(change) ? Number(change) : null
  }, [selectedIndexTick])

  const selectedIndexChangePercent = useMemo(() => {
    const changePct = selectedIndexTick?.changePercent
    return Number.isFinite(changePct) ? Number(changePct) : null
  }, [selectedIndexTick])

  const marketDown = useMemo(() => {
    const status =
      typeof latestTick?.st === "string" ? latestTick.st.trim().toUpperCase() : ""
    if (status) return status !== "OPN"
    const entries = Object.values(watchlist).filter((t): t is SimTick => Boolean(t))
    if (!entries.length) return false
    return entries.every((t) => {
      const bidv = Number(t.bidVol ?? 0)
      const askv = Number(t.askVol ?? 0)
      return (!Number.isFinite(bidv) || bidv === 0) && (!Number.isFinite(askv) || askv === 0)
    })
  }, [watchlist, latestTick])

  useEffect(() => {
    marketDownRef.current = marketDown
  }, [marketDown])

  useEffect(() => {
    if (!user || !accountStatus?.hasAccount) return
    let active = true

    // Poll portfolio to catch fills that happen asynchronously on tick processing.
    const syncPortfolio = async () => {
      try {
        const nextPortfolio = await simulatorApi.portfolio()
        if (!active) return
        setPortfolio((prev) => {
          const prevOpenIds = new Set(prev?.openOrders.map((order) => order.id) ?? [])
          const nextOpenIds = new Set(nextPortfolio.openOrders.map((order) => order.id))
          const resolvedOrderIds: string[] = []

          for (const watchedId of watchedOpenOrderIdsRef.current) {
            if (!prevOpenIds.has(watchedId) || nextOpenIds.has(watchedId)) continue
            const isManualCancel = cancelRequestedOrderIdsRef.current.has(watchedId)
            if (!isManualCancel && !marketDownRef.current) {
              toast.success("Order filled", {
                description: "Pending order executed. Portfolio updated.",
                position: "top-right",
              })
            }
            resolvedOrderIds.push(watchedId)
          }

          for (const orderId of resolvedOrderIds) {
            watchedOpenOrderIdsRef.current.delete(orderId)
            cancelRequestedOrderIdsRef.current.delete(orderId)
          }

          return nextPortfolio
        })
      } catch (error) {
        console.error(error)
      }
    }

    void syncPortfolio()

    const intervalId = window.setInterval(() => {
      void syncPortfolio()
    }, PORTFOLIO_POLL_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [user, accountStatus?.hasAccount])

  const ownedVolume = useMemo(() => {
    if (!portfolio) return 0
    const holding = portfolio.holdings.find((h) => h.symbol === symbol)
    return holding ? holding.quantity : 0
  }, [portfolio, symbol])

  // Chart + volume data
  const { chartData, candleData, volumeByTime } = useMemo(() => {
    if (dateRange === "1d" && dailyKlines.length) {
      const volumeMap: Record<string, number> = {}
      const candles = dailyKlines
        .map((k) => {
          const time = k.timestamp / 1000
          const vol = Number(k.volume ?? 0)
          if (Number.isFinite(vol)) {
            volumeMap[String(Math.round(time * 1000))] = vol
          }
          return {
            time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          }
        })
        .filter((c) => Number.isFinite(c.time))
        .sort((a, b) => a.time - b.time)
      const areaData = candles.map((c) => ({ time: c.time, value: c.close }))
      return { chartData: areaData, candleData: candles, volumeByTime: volumeMap }
    }

    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const sortedTicks = [...ticks].sort((a, b) => {
      const aTs = Number(a.timestamp_ms ?? 0)
      const bTs = Number(b.timestamp_ms ?? 0)
      return aTs - bTs
    })

    const recent = sortedTicks.filter((t) => {
      const ts = Number(t.timestamp_ms ?? 0)
      if (Number.isFinite(ts)) return ts >= cutoff
      const parsedIso = Date.parse(t.iso_time ?? "")
      return Number.isFinite(parsedIso) && parsedIso >= cutoff
    })

    const source = recent.length > 0 ? recent : sortedTicks
    const areaData = source
      .map((t, idx) => {
        const tsMs = Number(t.timestamp_ms ?? 0)
        const baseTs = Number.isFinite(tsMs) ? tsMs : Date.parse(t.iso_time ?? "")
        const safeTs = Number.isFinite(baseTs) ? baseTs : Date.now()
        const time = safeTs / 1000 + idx * 0.001
        const price = Number(t.price)
        if (!Number.isFinite(price)) {
          return null
        }
        return {
          time,
          value: price,
        }
      })
      .filter((point): point is { time: number; value: number } => Boolean(point))

    const candleVolumeMap: Record<string, number> = {}
    const candles = intradayCandles
      .map((c) => {
        candleVolumeMap[String(c.minute)] = c.volume ?? 0
        return {
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }
      })
      .sort((a, b) => a.time - b.time)

    return {
      chartData: areaData,
      candleData: candles,
      volumeByTime: candleVolumeMap,
    }
  }, [ticks, dateRange, dailyKlines, intradayCandles])

  const holdingMetrics = useMemo(() => {
    if (!portfolio) return null
    const rows = portfolio.holdings.map((h) => {
      const livePrice = watchlist[h.symbol]?.price ?? (h.symbol === symbol ? latestPrice ?? null : null)
      const value = livePrice != null ? livePrice * h.quantity : null
      const pnl = value != null ? value - h.quantity * h.avgCostPrice : null
      return { ...h, livePrice, value, pnl }
    })
    const totalValue = rows.reduce((sum, row) => sum + (row.value ?? 0), 0)
    const totalPnl = rows.reduce((sum, row) => sum + (row.pnl ?? 0), 0)
    return { rows, totalValue, totalPnl }
  }, [portfolio, watchlist, symbol, latestPrice])

  const handlePlaceOrder = async () => {
    if (marketDown) {
      toast.error("Trading is halted. Orders cannot be placed right now.", { position: "top-right" })
      return
    }
    const quantity = Number(form.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const msg = "Enter a valid quantity greater than zero."
      toast.error(msg, { position: "top-right" })
      return
    }

    const limitPrice = form.limitPrice ? Number(form.limitPrice) : undefined
    const triggerPrice = form.triggerPrice ? Number(form.triggerPrice) : undefined
    const stopLimitPrice = form.stopLimitPrice ? Number(form.stopLimitPrice) : undefined

    if (form.orderType === "limit" && (!limitPrice || limitPrice <= 0)) {
      toast.error("Limit orders need a positive limit price.", { position: "top-right" })
      return
    }

     if (form.orderType === "stop_limit") { 
       if (!triggerPrice || triggerPrice <= 0) { 
        toast.error("Stop-limit orders need a trigger price.", { position: "top-right" }) 
        return 
      }
      if (!stopLimitPrice || stopLimitPrice <= 0) { 
        toast.error("Stop-limit orders need a stop limit price.", { position: "top-right" }) 
        return 
      }
    }

    setPending(true) 
    try {
      const payload: Parameters<typeof simulatorApi.placeOrder>[0] = {
        ...form,
        quantity,
        limitPrice,
        triggerPrice,
        stopLimitPrice,
      }
      if (form.orderType === "market") { 
        payload.currentPrice = latestPrice ?? undefined 
      }
      const res = await simulatorApi.placeOrder(payload)
      const nextPortfolio = "portfolio" in res ? res.portfolio : res
      const execution = "execution" in res ? res.execution : undefined
      if (nextPortfolio && typeof nextPortfolio === "object" && "holdings" in nextPortfolio) {
        const previousOpenIds = new Set(portfolio?.openOrders.map((order) => order.id) ?? [])
        const nextOpenOrders = (nextPortfolio as SimPortfolio).openOrders ?? []
        if (!execution && form.orderType !== "market") {
          for (const order of nextOpenOrders) {
            if (!previousOpenIds.has(order.id)) {
              watchedOpenOrderIdsRef.current.add(order.id)
            }
          }
        }
        setPortfolio(nextPortfolio as SimPortfolio)
        if (execution?.price) {
          showOrderFilledToast({
            symbol: form.symbol,
            price: execution.price,
            time: execution.time ?? null,
            side: form.side,
            quantity,
          })
        } else {
          toast.success("Order placed", { position: "top-right" })
        }
      } else {
        const refreshed = await simulatorApi.start(symbol)
        setPortfolio(refreshed.portfolio)
        setTicks((refreshed.ticks ?? []).slice(-MAX_TICKS))
        toast.success("Order placed", { position: "top-right" })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed", { position: "top-right" })
    } finally {
      setPending(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!orderId) return
    cancelRequestedOrderIdsRef.current.add(orderId)
    setCancelPending(orderId)
    try {
      const updated = await simulatorApi.cancelOrder(orderId)
      setPortfolio(updated)
      watchedOpenOrderIdsRef.current.delete(orderId)
      cancelRequestedOrderIdsRef.current.delete(orderId)
      toast.success("Order cancelled", { position: "top-right" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to cancel order"
      toast.error(msg, { position: "top-right" })
      cancelRequestedOrderIdsRef.current.delete(orderId)
    } finally {
      setCancelPending(null)
    }
  }

  const handleActivateSimulator = async () => {
    setActivating(true)
    try {
      const data = await simulatorApi.start(symbol)
      setPortfolio(data.portfolio)
      setTicks((data.ticks ?? []).slice(-MAX_TICKS))
      const wl = await simulatorApi.tickers(DEFAULT_WATCHLIST.join(","))
      setWatchlist(wl)
      setAccountStatus({
        hasAccount: true,
        status: "active",
        activatedAt: new Date().toISOString(),
      })
      toast.success("Simulator activated", { position: "top-right" })
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to activate simulator", { position: "top-right" })
    } finally {
      setActivating(false)
    }
  }

  const handleRetryAccountCheck = () => {
    setAccountError(null)
    setAccountChecking(true)
    setAccountCheckNonce((n) => n + 1)
  }

  useEffect(() => {
    if (dateRange !== "1d") {
      setDailyKlines([])
      return
    }
    let active = true
    const load = async () => {
      setKlinesPending(true)
      try {
        const data = await simulatorApi.klines(symbol, "1d")
        if (!active) return
        const parsed =
          Array.isArray(data) && data.length
            ? data
                .map((d) => ({
                  timestamp: Number((d as SimKlinePoint).timestamp ?? 0),
                  open: Number((d as SimKlinePoint).open),
                  high: Number((d as SimKlinePoint).high),
                  low: Number((d as SimKlinePoint).low),
                  close: Number((d as SimKlinePoint).close),
                  volume: Number((d as SimKlinePoint).volume ?? 0),
                }))
                .filter((d) => Number.isFinite(d.timestamp) && Number.isFinite(d.close))
            : []
        setDailyKlines(parsed)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load 1D data", { position: "top-right" })
      } finally {
        if (active) setKlinesPending(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [dateRange, symbol])

  useEffect(() => {
    const fallbackHeight = layoutMode === "stack" ? 460 : 380

    const updateChartHeight = () => {
      if (typeof window === "undefined") return
      const isDesktopSplit = layoutMode === "split" && window.matchMedia("(min-width: 1024px)").matches
      if (!isDesktopSplit) {
        setChartHeight(fallbackHeight)
        return
      }

      const priceCard = priceActionCardRef.current?.firstElementChild as HTMLElement | null
      const orderCard = orderTicketCardRef.current?.firstElementChild as HTMLElement | null
      const priceHeader = priceCard?.querySelector('[data-slot="card-header"]') as HTMLElement | null
      const orderHeader = orderCard?.querySelector('[data-slot="card-header"]') as HTMLElement | null
      const orderContent = orderCard?.querySelector('[data-slot="card-content"]') as HTMLElement | null
      if (!priceHeader || !orderHeader || !orderContent) {
        setChartHeight(fallbackHeight)
        return
      }

      const nextHeight = Math.round(
        orderHeader.getBoundingClientRect().height +
          orderContent.getBoundingClientRect().height -
          priceHeader.getBoundingClientRect().height,
      )
      const safeHeight = Math.min(620, Math.max(360, nextHeight))
      setChartHeight((prev) => (Math.abs(prev - safeHeight) > 1 ? safeHeight : prev))
    }

    updateChartHeight()

    if (typeof window === "undefined") return
    const observer = new ResizeObserver(updateChartHeight)
    if (priceActionCardRef.current) observer.observe(priceActionCardRef.current)
    if (orderTicketCardRef.current) observer.observe(orderTicketCardRef.current)
    window.addEventListener("resize", updateChartHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateChartHeight)
    }
  }, [layoutMode, accountStatus?.hasAccount])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading simulator…</div>
      </div>
    )
  }

  if (!user) {
    router.replace("/signin")
    return null
  }

  if (accountChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Checking simulator access…</div>
      </div>
    )
  }
// Show error if account check failed and no status
  if (!accountChecking && accountError && !accountStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-foreground">
        <UserNavbar />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Simulator temporarily unavailable</CardTitle>
              <CardDescription className="text-muted-foreground">{accountError}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button onClick={handleRetryAccountCheck} className="bg-emerald-600 hover:bg-emerald-500">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (accountStatus && !accountStatus.hasAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-foreground">
        <UserNavbar />
        <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300 text-sm font-medium">
                <Info className="h-5 w-5" />
                <span>PSX Simulator Overview</span>
              </div>
              <CardTitle className="text-foreground">Activate your day trading sandbox</CardTitle>
              <CardDescription className="text-muted-foreground">
                Practice orders with live Redis ticks. Review the checklist before enabling your training wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground">
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                <li>Activation creates a PKR-denominated training wallet funded with virtual cash.</li>
                <li>Orders follow live PSX ticks - market halts pause executions automatically.</li>
                <li>Use limit/stop orders responsibly; depth follows real bid/ask volume.</li>
                <li>Your practice stats feed dashboards and learning streaks.</li>
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">You can reset or pause anytime by leaving the simulator.</span>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={handleActivateSimulator}
                  disabled={activating}
                >
                  {activating ? "Activating…" : "Activate simulator"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const layoutGrid =
    layoutMode === "split"
      ? "grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      : "grid gap-4"
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-foreground">
      <UserNavbar />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">PSX Simulator</h1>
              <div className="mb-2 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/90 p-1">
                <Button size="sm" className="h-8 px-3">
                  Trading
                </Button>
                <Button asChild size="sm" variant="ghost" className="h-8 px-3 text-muted-foreground hover:text-foreground">
                  <Link href="/simulator/leaderboard">Leaderboard</Link>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-2 py-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Index</span>
                  <Popover open={indexMenuOpen} onOpenChange={setIndexMenuOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Select index"
                        className="flex h-6 w-[108px] items-center justify-between rounded-md border-0 bg-transparent px-0 text-xs font-semibold text-foreground focus:outline-none"
                      >
                        <span>{INDEX_LABELS[selectedIndexSymbol]}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-32 border-border bg-popover p-1">
                      {INDEX_SYMBOLS.map((indexSymbol) => (
                        <button
                          key={indexSymbol}
                          type="button"
                          className={`flex w-full items-center rounded px-2 py-1.5 text-left text-sm ${
                            indexSymbol === selectedIndexSymbol
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent/80"
                          }`}
                          onClick={() => {
                            setSelectedIndexSymbol(indexSymbol)
                            setIndexMenuOpen(false)
                          }}
                        >
                          {INDEX_LABELS[indexSymbol]}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 font-medium ${
                    selectedIndexStatus === "OPN"
                      ? "border-emerald-400/60 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : selectedIndexStatus === "PRE" || selectedIndexStatus === "PCL"
                        ? "border-amber-400/60 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        : "border-border/60 bg-card/90 text-muted-foreground"
                  }`}
                >
                  Market {selectedIndexStatus}
                </span>
                <span className="rounded-full border border-border/60 bg-card/90 px-2 py-1 text-muted-foreground">
                  {INDEX_LABELS[selectedIndexSymbol]}{" "}
                  <span className="font-semibold text-foreground">
                    {selectedIndexPrice != null ? selectedIndexPrice.toFixed(2) : "--"}
                  </span>
                </span>
                <span
                  className={`rounded-full border px-2 py-1 font-medium ${
                    selectedIndexChange == null
                      ? "border-border/60 bg-card/90 text-muted-foreground"
                      : selectedIndexChange >= 0
                        ? "border-emerald-400/60 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "border-red-400/60 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                  }`}
                >
                  {selectedIndexChange == null
                    ? "--"
                    : `${selectedIndexChange >= 0 ? "+" : ""}${selectedIndexChange.toFixed(2)} (${formatPercent(
                        selectedIndexChangePercent,
                        true,
                      )})`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex gap-2">
              {klinesPending ? (
                <div className="text-[11px] text-muted-foreground">Loading {dateRange.toUpperCase()}…</div>
              ) : null}
              {marketDown ? (
                <div className="flex items-center gap-1 rounded border border-red-500/60 bg-red-50 text-[11px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-200 px-2 py-1">
                  <Lock size={12} />
                  <span>Market Halted</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Card className="border border-border/60 bg-card/90">
          <CardContent className="p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Equity</div>
                <div className="text-sm font-semibold text-foreground">{formatCurrency(portfolio?.totalEquity)}</div>
              </div>
              <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Unrealized P/L</div>
                <div className={`text-sm font-semibold ${pnlColor(portfolio?.unrealizedPnlLast)}`}>
                  {formatCurrency(portfolio?.unrealizedPnlLast, true)}
                </div>
              </div>
            </div>

            <Accordion type="single" collapsible className="mt-2 rounded-md border border-border bg-background/20 px-3">
              <AccordionItem value="wallet-details" className="border-b-0">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3 pr-2">
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Info size={14} className="text-muted-foreground" />
                        <span>Account details</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">Cash, holdings, and realized P/L</p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2 py-1 text-[11px] text-muted-foreground">
                        <Wallet size={12} />
                        {formatCurrency(portfolio?.cashAvailable)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2 py-1 text-[11px]">
                        <BarChart3 size={12} className={pnlColor(portfolio?.realizedPnlTotal)} />
                        <span className={pnlColor(portfolio?.realizedPnlTotal)}>
                          {formatCurrency(portfolio?.realizedPnlTotal, true)}
                        </span>
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <Wallet size={12} />
                        <span>Cash</span>
                      </div>
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(portfolio?.cashAvailable)}</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <BriefcaseBusiness size={12} />
                        <span>Holdings</span>
                      </div>
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(portfolio?.holdingsValue)}</div>
                    </div>
                    <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <BarChart3 size={12} />
                        <span>Realized P/L</span>
                      </div>
                      <div className={`text-sm font-semibold ${pnlColor(portfolio?.realizedPnlTotal)}`}>
                        {formatCurrency(portfolio?.realizedPnlTotal, true)}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className={layoutGrid}>
          <div ref={priceActionCardRef} className="min-w-0">
            <Card className="min-w-0 border border-border/60 bg-card/90">
            <CardHeader className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <CardTitle className="text-foreground">Price Action</CardTitle>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 sm:hidden">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Symbol</span>
                  <span className="max-w-[8rem] truncate text-sm font-semibold text-foreground">{symbol}</span>
                </div>
              </div>

              <div className="grid gap-2 sm:hidden">
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-card/90 p-1">
                  <button
                    className={`h-8 w-full rounded-md text-sm font-medium transition ${
                      dateRange === "1m"
                        ? "border border-primary/40 bg-primary/10 text-primary dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateRange("1m")}
                  >
                    1m
                  </button>
                  <button
                    className={`h-8 w-full rounded-md text-sm font-medium transition ${
                      dateRange === "1d"
                        ? "border border-primary/40 bg-primary/10 text-primary dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateRange("1d")}
                  >
                    1d
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-card/90 p-1">
                  <button
                    className={`h-8 w-full rounded-md text-sm font-medium transition ${
                      chartMode === "area"
                        ? "border border-primary/40 bg-primary/10 text-primary dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setChartMode("area")}
                  >
                    Line
                  </button>
                  <button
                    className={`h-8 w-full rounded-md text-sm font-medium transition ${
                      chartMode === "candles"
                        ? "border border-primary/40 bg-primary/10 text-primary dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setChartMode("candles")}
                  >
                    Candles
                  </button>
                </div>
              </div>

              <div className="hidden min-w-0 flex-wrap items-center justify-end gap-2 sm:flex">
                <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Symbol</span>
                  <span className="max-w-[8rem] truncate text-sm font-semibold text-foreground">{symbol}</span>
                </div>
                <div className="flex items-center gap-1 rounded border border-border/60 bg-card/90 px-2 py-1 text-xs">
                  <button
                    className={`rounded px-2 py-1 font-medium transition ${
                      dateRange === "1m"
                        ? "border border-primary/40 bg-primary/10 text-primary dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateRange("1m")}
                  >
                    1m
                  </button>
                  <button
                    className={`rounded px-2 py-1 font-medium transition ${
                      dateRange === "1d"
                        ? "border border-primary/40 bg-primary/10 text-primary dark:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateRange("1d")}
                  >
                    1d
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={chartMode === "area" ? "default" : "outline"}
                    onClick={() => setChartMode("area")}
                    className="px-3"
                  >
                    Line
                  </Button>
                  <Button
                    size="sm"
                    variant={chartMode === "candles" ? "default" : "outline"}
                    onClick={() => setChartMode("candles")}
                    className="px-3"
                  >
                    Candles
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="hidden border-border bg-card/90 text-xs text-foreground dark:bg-card/80 lg:inline-flex"
                  onClick={() => setLayoutMode((m) => (m === "split" ? "stack" : "split"))}
                >
                  View: {layoutMode === "split" ? "Side by Side" : "Stacked (Big Chart)"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden" style={{ height: chartHeight }}>
              <PriceChart
                data={chartData}
                candles={candleData}
                volumeByTime={volumeByTime}
                viewMode={chartMode}
                lastPrice={latestPrice}
                height={chartHeight}
                timeMode={dateRange === "1d" ? "date" : "time"}
              />
            </CardContent>
            </Card>
          </div>

          <div ref={orderTicketCardRef} className="min-w-0">
            <Card className="min-w-0 border border-border/60 bg-card/90">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-foreground">Order Ticket</CardTitle>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Symbol</span>
                  <span className="text-sm font-semibold text-foreground">{symbol}</span>
                </div>
              </div>
              <CardDescription className="text-muted-foreground">
                Simulate trades instantly with the latest quote.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Last Price" value={latestPrice ?? undefined} highlight />
              <Row
                label="Last Volume"
                value={latestVolume ?? undefined}
                format={formatVolume}
              />
              <Row label="Buy Volume (Bid)" value={latestBuyVolume ?? undefined} format={formatVolume} />
              <Row label="Sell Volume (Ask)" value={latestSellVolume ?? undefined} format={formatVolume} />
              <Row label="Owned Volume" value={ownedVolume} />
              <Row label="Cash Balance" value={portfolio?.cashAvailable} />
              <Row label="Position Value" value={ownedVolume * (latestPrice ?? 0)} />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  className={`w-full ${
                    form.side === "buy"
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  onClick={() => setForm((p) => ({ ...p, side: "buy" }))}
                >
                  Buy
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full ${
                    form.side === "sell"
                      ? "bg-red-600 text-white hover:bg-red-500"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  onClick={() => setForm((p) => ({ ...p, side: "sell" }))}
                >
                  Sell
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Order Type</Label>
                  <Popover open={orderTypeMenuOpen} onOpenChange={setOrderTypeMenuOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Order type"
                        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background/70 px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <span>
                          {form.orderType === "market"
                            ? "Market"
                            : form.orderType === "limit"
                              ? "Limit"
                              : "Stop Limit"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-40 border-border bg-popover p-1">
                      {(["market", "limit", "stop_limit"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`flex w-full items-center rounded px-2 py-1.5 text-left text-sm ${
                            value === form.orderType
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent/80"
                          }`}
                          onClick={() => {
                            setForm((p) => {
                              if (value === "market") {
                                return {
                                  ...p,
                                  orderType: value,
                                  limitPrice: undefined,
                                  triggerPrice: undefined,
                                  stopLimitPrice: undefined,
                                }
                              }
                              if (value === "limit") {
                                return {
                                  ...p,
                                  orderType: value,
                                  triggerPrice: undefined,
                                  stopLimitPrice: undefined,
                                }
                              }
                              return {
                                ...p,
                                orderType: value,
                                limitPrice: undefined,
                              }
                            })
                            setOrderTypeMenuOpen(false)
                          }}
                        >
                          {value === "market" ? "Market" : value === "limit" ? "Limit" : "Stop Limit"}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Quantity</Label>
                  <Input
                    className="bg-background/70 border-border text-foreground"
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
              </div>

              {form.orderType === "stop_limit" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Trigger Price</Label>
                    <Input
                      className="bg-background/70 border-border text-foreground"
                      type="number"
                      value={form.triggerPrice ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, triggerPrice: e.target.value || undefined }))}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Stop Limit Price</Label>
                    <Input
                      className="bg-background/70 border-border text-foreground"
                      type="number"
                      value={form.stopLimitPrice ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, stopLimitPrice: e.target.value || undefined }))}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Limit Price</Label>
                  <Input
                    className="bg-background/70 border-border text-foreground"
                    type="number"
                    value={
                      form.orderType === "market"
                        ? (latestPrice !== null && latestPrice !== undefined ? String(latestPrice) : "")
                        : (form.limitPrice ?? "")
                    }
                    onChange={(e) => setForm((p) => ({ ...p, limitPrice: e.target.value || undefined }))}
                    onFocus={(e) => e.currentTarget.select()}
                    disabled={form.orderType === "market"}
                    placeholder={form.orderType === "market" ? "PKR" : latestPrice ? `≈ ${latestPrice}` : "PKR"}
                  />
                </div>
              )}

              <Button
                className="w-full bg-sky-600 hover:bg-sky-500"
                onClick={handlePlaceOrder}
                disabled={pending || marketDown}
              >
                Place Order
              </Button>
            </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Holdings</CardTitle>
              <CardDescription className="text-muted-foreground">Current positions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {holdingMetrics?.rows.length ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Est. proceeds if sold now:</span>
                    <span className="rounded bg-background/70 px-2 py-0.5 text-foreground">
                      {formatCurrency(holdingMetrics.totalValue)}
                    </span>
                    <span>Unrealized P/L:</span>
                    <span className={`rounded px-2 py-0.5 font-semibold ${pnlColor(holdingMetrics.totalPnl)}`}>
                      {formatCurrency(holdingMetrics.totalPnl, true)}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="max-h-[360px] overflow-y-auto pr-1 sm:max-h-[420px] lg:max-h-[520px]">
                    <div className="space-y-2 sm:hidden">
                      {holdingMetrics.rows.map((h) => (
                        <div key={h.symbol} className="rounded-lg border border-border p-3 space-y-1">
                          <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                            <span>{h.symbol}</span>
                            <span className={`text-xs ${pnlColor(h.pnl)}`}>{formatCurrency(h.pnl, true)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <p>Qty</p>
                              <p className="font-semibold text-foreground">{h.quantity}</p>
                            </div>
                            <div>
                              <p>Avg Cost</p>
                              <p className="font-semibold text-foreground">{formatCurrency(h.avgCostPrice)}</p>
                            </div>
                            <div>
                              <p>Last</p>
                              <p className="font-semibold text-foreground">{formatCurrency(h.livePrice)}</p>
                            </div>
                            <div>
                              <p>Value</p>
                              <p className="font-semibold text-foreground">{formatCurrency(h.value)}</p>
                            </div>
                            <div>
                              <p>Unrealized P/L</p>
                              <p className={`font-semibold ${pnlColor(h.pnl)}`}>
                                {formatCurrency(h.pnl, true)}
                              </p>
                            </div>
                            <div>
                              <p>Realized P/L</p>
                              <p className={`font-semibold ${pnlColor(h.realizedPnl)}`}>
                                {formatCurrency(h.realizedPnl, true)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto sm:block">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-card/95 text-muted-foreground backdrop-blur">
                          <tr>
                            <th className="text-left p-2">Symbol</th>
                            <th className="text-left p-2">Qty</th>
                            <th className="text-left p-2">Avg Cost</th>
                            <th className="text-left p-2">Last</th>
                            <th className="text-left p-2">Est. Value</th>
                            <th className="text-left p-2">Unrealized P/L</th>
                            <th className="text-left p-2">Realized P/L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {holdingMetrics.rows.map((h) => (
                            <tr key={h.symbol} className="border-b border-border">
                              <td className="p-2">{h.symbol}</td>
                              <td className="p-2">{h.quantity}</td>
                              <td className="p-2">{formatCurrency(h.avgCostPrice)}</td>
                              <td className="p-2">{formatCurrency(h.livePrice)}</td>
                              <td className="p-2">{formatCurrency(h.value)}</td>
                              <td className={`p-2 ${pnlColor(h.pnl)}`}>{formatCurrency(h.pnl, true)}</td>
                              <td className={`p-2 ${pnlColor(h.realizedPnl)}`}>
                                {formatCurrency(h.realizedPnl, true)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-card/95 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card/95 to-transparent" />
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground text-sm">No holdings yet.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-foreground">Open Orders</CardTitle>
              <CardDescription className="text-muted-foreground">Working and partially filled orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {portfolio?.openOrders?.length ? (
                <div className="relative">
                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 sm:max-h-[420px] lg:max-h-[520px]">
                  {portfolio.openOrders.map((o) => (
                    <div key={o.id} className="rounded-lg border border-border p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-foreground">{o.symbol}</div>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {o.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {o.side.toUpperCase()} {o.quantity} ({o.filledQty} filled)
                        </span>
                        <span>•</span>
                        <span>{o.orderType.replace("_", " ")}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {o.orderType === "stop_limit"
                          ? `Stop Limit: ${o.stopLimitPrice ?? "-"} | Trigger: ${o.triggerPrice ?? "-"}`
                          : `Limit: ${o.limitPrice ?? "-"} | Trigger: ${o.triggerPrice ?? "-"}`}
                      </div>
                      {["new", "partially_filled"].includes(o.status) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => handleCancelOrder(o.id)}
                          disabled={cancelPending === o.id}
                        >
                          {cancelPending === o.id ? "Cancelling..." : "Cancel Order"}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-card/95 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card/95 to-transparent" />
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">No open orders.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {DEFAULT_WATCHLIST.map((item) => {
            const tick = watchlist[item] ?? null
            const price = tick?.price ?? null
            const change = tick?.change ?? null
            const changePct = tick?.changePercent ?? null
            const up = change !== null && change >= 0
            return (
              <button
                key={item}
                className={`rounded-lg border border-border/60 bg-card/90 p-3 text-left transition hover:border-emerald-500/70 ${
                  item === symbol ? "border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]" : ""
                }`}
                onClick={() => {
                  setSymbol(item)
                  setForm((p) => ({ ...p, symbol: item }))
                }}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item}</span>
                  <Badge variant="outline" className="text-[10px]">
                    PSX
                  </Badge>
                </div>
                <div className="mt-2 text-lg font-semibold text-foreground">
                  {price !== null ? `PKR ${price.toFixed(2)}` : "--"}
                </div>
                <div className={`text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
                  {change !== null ? `${up ? "+" : ""}${change.toFixed(2)}` : "--"}{" "}
                  {changePct !== null ? `(${up ? "+" : ""}${changePct.toFixed(2)}%)` : ""}
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
  format,
}: {
  label: string
  value?: number
  highlight?: boolean
  format?: (value?: number) => string
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-2 sm:flex-row sm:items-center sm:justify-between ${
        highlight
          ? "border-emerald-400/60 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
          : "border-border bg-card/90 dark:bg-card/70"
      }`}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-semibold text-foreground sm:text-sm">
        {value !== undefined ? (format ? format(value) : value.toFixed(2)) : "--"}
      </span>
    </div>
  )
}

