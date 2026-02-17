"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ColorType,
  LineStyle,
  createChart,
  type BarData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
} from "lightweight-charts"

type Props = {
  data: { time: number; value: number }[]
  candles?: { time: number; open: number; high: number; low: number; close: number }[]
  viewMode: "area" | "candles"
  lastPrice?: number | null
  volumeByTime?: Record<string, number>
  height?: number
  timeMode?: "time" | "date"
}

type HoverState =
  | { mode: "area"; time: number; value: number; volume?: number | null }
  | { mode: "candles"; time: number; open: number; high: number; low: number; close: number; volume?: number | null }

const formatPrice = (value?: number | null) => (value === undefined || value === null ? "--" : value.toFixed(2))
const formatVolume = (value?: number | null) =>
  value === undefined || value === null || Number.isNaN(value) ? "--" : value.toLocaleString("en-US")

const formatTime = (ts?: number) => {
  if (!ts || Number.isNaN(ts)) return "--"
  return new Intl.DateTimeFormat("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Karachi",
    hour12: false,
  }).format(new Date(ts * 1000))
}

const toUnixSeconds = (time: Time): number | null => {
  if (typeof time === "number" && Number.isFinite(time)) {
    return time
  }

  if (typeof time === "string") {
    const parsed = Date.parse(time)
    return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
  }

  if (time && typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000)
  }

  return null
}

const CHART_PALETTES = {
  light: {
    background: "#ffffff",
    text: "#0f172a",
    grid: "rgba(15,23,42,0.08)",
    border: "rgba(15,23,42,0.15)",
  },
  dark: {
    background: "#0b1224",
    text: "#e2e8f0",
    grid: "rgba(148,163,184,0.12)",
    border: "rgba(148,163,184,0.24)",
  },
} as const

const getPalette = (isDark: boolean) => (isDark ? CHART_PALETTES.dark : CHART_PALETTES.light)

export function PriceChart({
  data,
  candles = [],
  viewMode,
  lastPrice,
  volumeByTime = {},
  height = 320,
  timeMode = "time",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const areaPriceLineRef = useRef<ReturnType<ISeriesApi<"Area">["createPriceLine"]> | null>(null)
  const candlePriceLineRef = useRef<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]> | null>(null)
  const logoObserverRef = useRef<MutationObserver | null>(null)
  const styleInjectedRef = useRef(false)
  const hasUserZoomedRef = useRef(false)
  const isAutoFittingRef = useRef(false)
  const didInitialFitRef = useRef(false)
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false
    return document.documentElement.classList.contains("dark")
  })

  useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const update = () => setIsDarkMode(root.classList.contains("dark"))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return

    if (!styleInjectedRef.current && typeof document !== "undefined") {
      const styleId = "hide-lightweight-logo"
      if (!document.getElementById(styleId)) {
        const styleEl = document.createElement("style")
        styleEl.id = styleId
        styleEl.textContent = `
          .tv-lightweight-charts, .tv-lightweight-charts * {
            background-image: none !important;
          }
          .tv-lightweight-charts .watermark,
          .tv-lightweight-charts [class*="logo"],
          .tv-lightweight-charts [data-name="logo"],
          .tv-lightweight-charts canvas[aria-label*="logo"],
          .tv-lightweight-charts a[href*="tradingview"],
          .tv-lightweight-charts img[src*="tradingview"] {
            display: none !important;
          }
        `
        document.head.appendChild(styleEl)
      }
      styleInjectedRef.current = true
    }

    const palette = getPalette(typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      rightPriceScale: {
        borderColor: palette.border,
        scaleMargins: { top: 0.05, bottom: 0.12 },
      },
      timeScale: {
        borderColor: palette.border,
        rightOffset: 2,
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time: Time) => {
          const unixTs = toUnixSeconds(time)
          if (unixTs === null) return "--"
          return formatTime(unixTs)
        },
      },
      watermark: {
        visible: false,
      },
      crosshair: {
        vertLine: {
          width: 1,
          color: "rgba(56,189,248,0.5)",
          style: LineStyle.Dashed,
          labelBackgroundColor: "rgba(14,165,233,0.85)",
        },
        horzLine: {
          width: 1,
          color: "rgba(94,234,212,0.55)",
          style: LineStyle.Dashed,
          labelBackgroundColor: "rgba(94,234,212,0.8)",
        },
      },
      localization: {
        timeFormatter: (time: Time) => {
          const unixTs = toUnixSeconds(time)
          if (unixTs === null) return "--"
          return formatTime(unixTs)
        },
      },
      height: 320,
    })
    const series = chart.addAreaSeries({
      lineColor: "#38bdf8",
      topColor: "rgba(56,189,248,0.25)",
      bottomColor: "rgba(56,189,248,0.04)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      wickUpColor: "#22c55e",
      borderUpColor: "#16a34a",
      downColor: "#ef4444",
      wickDownColor: "#ef4444",
      borderDownColor: "#dc2626",
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      borderVisible: true,
      wickVisible: true,
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    chartRef.current = chart
    areaSeriesRef.current = series
    candleSeriesRef.current = candleSeries

    const hideBranding = () => {
      const container = containerRef.current
      if (!container) return
      const logoEls = container.querySelectorAll<HTMLElement>(
        '[class*="logo"], [class*="watermark"], canvas[aria-label*="logo"], a[href*="tradingview"], img[src*="tradingview"]'
      )
      logoEls.forEach((el) => {
        el.style.display = "none"
      })
    }
    hideBranding()

    if (containerRef.current) {
      const observer = new MutationObserver(hideBranding)
      observer.observe(containerRef.current, { childList: true, subtree: true })
      logoObserverRef.current = observer
    }

    const timeScale = chart.timeScale()
    const handleUserZoom = () => {
      if (isAutoFittingRef.current) return
      hasUserZoomedRef.current = true
    }
    timeScale.subscribeVisibleTimeRangeChange(handleUserZoom)

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !chartRef.current) return
      const { width, height: nextHeight } = entry.contentRect
      chartRef.current.applyOptions({ width, height: nextHeight })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      logoObserverRef.current?.disconnect()
      logoObserverRef.current = null
      chartRef.current?.timeScale().unsubscribeVisibleTimeRangeChange(handleUserZoom)
      resizeObserver.disconnect()
      chartRef.current?.remove()
      chartRef.current = null
      areaSeriesRef.current = null
      candleSeriesRef.current = null
      areaPriceLineRef.current = null
      candlePriceLineRef.current = null
      hasUserZoomedRef.current = false
      isAutoFittingRef.current = false
      didInitialFitRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current) return
    const palette = getPalette(isDarkMode)
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      rightPriceScale: {
        borderColor: palette.border,
        scaleMargins: { top: 0.05, bottom: 0.12 },
      },
      timeScale: {
        borderColor: palette.border,
      },
    })
  }, [isDarkMode])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.applyOptions({ height })
  }, [height])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.applyOptions({
      timeScale: {
        secondsVisible: timeMode !== "date",
        tickMarkFormatter: (time: Time) => {
          const unixTs = toUnixSeconds(time)
          if (unixTs === null) return "--"
          return timeMode === "date"
            ? new Intl.DateTimeFormat("en-PK", {
                month: "short",
                day: "2-digit",
              }).format(new Date(unixTs * 1000))
            : formatTime(unixTs)
        },
      },
      localization: {
        timeFormatter: (time: Time) => {
          const unixTs = toUnixSeconds(time)
          if (unixTs === null) return "--"
          return timeMode === "date"
            ? new Intl.DateTimeFormat("en-PK", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              }).format(new Date(unixTs * 1000))
            : formatTime(unixTs)
        },
      },
    })
  }, [timeMode])

  useEffect(() => {
    if (!chartRef.current) return

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !param.seriesData || !areaSeriesRef.current || !candleSeriesRef.current) {
        setHoverState(null)
        return
      }

      const candlePoint = param.seriesData.get(candleSeriesRef.current) as BarData | undefined
      const areaPoint = param.seriesData.get(areaSeriesRef.current) as LineData | undefined
      const volFor = (time: number) => {
        const keyMs = String(Math.round(time * 1000))
        if (volumeByTime[keyMs] !== undefined) return volumeByTime[keyMs]
        const keySec = String(Math.round(time))
        return volumeByTime[keySec] ?? null
      }

      if (viewMode === "candles" && candlePoint) {
        setHoverState({
          mode: "candles",
          time: Number(candlePoint.time),
          open: candlePoint.open,
          high: candlePoint.high,
          low: candlePoint.low,
          close: candlePoint.close,
          volume: volFor(Number(candlePoint.time)),
        })
        return
      }

      if (viewMode === "area" && areaPoint) {
        setHoverState({
          mode: "area",
          time: Number(areaPoint.time),
          value: areaPoint.value,
          volume: volFor(Number(areaPoint.time)),
        })
        return
      }

      setHoverState(null)
    }

    chartRef.current.subscribeCrosshairMove(handleCrosshairMove)
    return () => chartRef.current?.unsubscribeCrosshairMove(handleCrosshairMove)
  }, [viewMode, volumeByTime])

  const autoFit = () => {
    if (!chartRef.current) return
    isAutoFittingRef.current = true
    chartRef.current.timeScale().fitContent()
    requestAnimationFrame(() => {
      isAutoFittingRef.current = false
    })
  }

  useEffect(() => {
    if (!areaSeriesRef.current) return
    if (viewMode === "area") {
      areaSeriesRef.current.setData(
        data.map((point) => ({
          ...point,
          time: point.time as Time,
        })),
      )
      if (data.length > 0 && !hasUserZoomedRef.current && !didInitialFitRef.current) {
        autoFit()
        didInitialFitRef.current = true
      }
    } else {
      areaSeriesRef.current.setData([])
    }
  }, [data, viewMode])

  useEffect(() => {
    if (!candleSeriesRef.current) return
    if (viewMode === "candles") {
      candleSeriesRef.current.setData(
        candles.map((point) => ({
          ...point,
          time: point.time as Time,
        })),
      )
      if (candles.length > 0 && !hasUserZoomedRef.current && !didInitialFitRef.current) {
        autoFit()
        didInitialFitRef.current = true
      }
    } else {
      candleSeriesRef.current.setData([])
    }
  }, [candles, viewMode])

  useEffect(() => {
    if (!areaSeriesRef.current || !candleSeriesRef.current) return
    areaSeriesRef.current.applyOptions({ visible: viewMode === "area" })
    candleSeriesRef.current.applyOptions({ visible: viewMode === "candles" })
    if (!hasUserZoomedRef.current) {
      autoFit()
    }
  }, [viewMode])

  useEffect(() => {
    if (areaSeriesRef.current && areaPriceLineRef.current) {
      areaSeriesRef.current.removePriceLine(areaPriceLineRef.current)
      areaPriceLineRef.current = null
    }

    if (candleSeriesRef.current && candlePriceLineRef.current) {
      candleSeriesRef.current.removePriceLine(candlePriceLineRef.current)
      candlePriceLineRef.current = null
    }

    if (!lastPrice) return

    if (viewMode === "candles") {
      if (!candleSeriesRef.current) return
      candlePriceLineRef.current = candleSeriesRef.current.createPriceLine({
        price: lastPrice,
        color: "#f97316",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "Live",
      })
      return
    }

    if (!areaSeriesRef.current) return
    areaPriceLineRef.current = areaSeriesRef.current.createPriceLine({
      price: lastPrice,
      color: "#38bdf8",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: "Live",
    })
  }, [lastPrice, viewMode])

  const displayState = useMemo<HoverState | null>(() => {
    const lookupVol = (time: number) => {
      const keyMs = String(Math.round(time * 1000))
      if (volumeByTime[keyMs] !== undefined) return volumeByTime[keyMs]
      const keySec = String(Math.round(time))
      return volumeByTime[keySec] ?? null
    }
    if (hoverState) return hoverState
    if (viewMode === "candles" && candles.length > 0) {
      const last = candles[candles.length - 1]
      return { mode: "candles" as const, ...last, volume: lookupVol(last.time) }
    }
    if (data.length > 0) {
      const last = data[data.length - 1]
      return { mode: "area" as const, ...last, volume: lookupVol(last.time) }
    }
    return null
  }, [hoverState, viewMode, candles, data, volumeByTime])

  const timeLabel =
    displayState?.mode === "candles" || displayState?.mode === "area"
      ? timeMode === "date"
        ? new Intl.DateTimeFormat("en-PK", { month: "short", day: "2-digit" }).format(new Date(displayState.time * 1000))
        : formatTime(displayState.time)
      : "--"

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-card">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex flex-wrap items-center gap-3 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
        <span>{viewMode === "candles" ? "Candles" : "Line"} · {timeLabel}</span>
        {displayState?.mode === "candles" ? (
          <>
            <span>
              O <span className="text-foreground">{formatPrice(displayState.open)}</span>
            </span>
            <span>
              H <span className="text-emerald-500 dark:text-emerald-300">{formatPrice(displayState.high)}</span>
            </span>
            <span>
              L <span className="text-red-500 dark:text-red-300">{formatPrice(displayState.low)}</span>
            </span>
            <span>
              C <span className="text-sky-600 dark:text-sky-300">{formatPrice(displayState.close)}</span>
            </span>
          </>
        ) : null}
        {displayState?.mode === "area" ? (
          <span>
            Price <span className="text-sky-600 dark:text-sky-300">{formatPrice(displayState.value)}</span>
          </span>
        ) : null}
        <span>
          Vol <span className="text-amber-600 dark:text-amber-200">{formatVolume(displayState?.volume)}</span>
        </span>
        {lastPrice ? (
          <span className="ml-auto rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
            Live {formatPrice(lastPrice)}
          </span>
        ) : null}
      </div>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  )
}
