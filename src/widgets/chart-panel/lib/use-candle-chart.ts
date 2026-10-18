import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef, useState, type RefObject } from 'react'

import type { Candle, Interval, MarketSymbol } from '@/shared/api/market-data'
import { useMarketData } from '@/shared/api/market-data'
import { dateFormat, formatCompact, formatPrice } from '@/shared/lib/format'
import { createRafBatcher } from '@/shared/lib/raf-batcher'

import { readChartColors, type ChartColors } from './chart-colors'

export type ChartStatus = 'loading' | 'ready' | 'error'

interface Options {
  container: RefObject<HTMLDivElement | null>
  legend: RefObject<HTMLDivElement | null>
  symbol: MarketSymbol
  interval: Interval
  precision: number
  locale: string
  theme: string
}

const HISTORY_LIMIT = 500

interface Handles {
  chart: IChartApi
  candles: ISeriesApi<'Candlestick'>
  volume: ISeriesApi<'Histogram'>
  colors: ChartColors
}

const toCandle = (c: Candle): CandlestickData => ({
  time: c.time as UTCTimestamp,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
})

const toVolume = (c: Candle, colors: ChartColors): HistogramData => ({
  time: c.time as UTCTimestamp,
  value: c.volume,
  color: c.close >= c.open ? colors.upVolume : colors.downVolume,
})

/** Legend text (O/H/L/C) written straight into the DOM, no React render. */
function writeLegend(
  el: HTMLDivElement | null,
  c: Candle | null,
  precision: number,
  locale: string,
) {
  if (!el) return
  if (!c) {
    el.textContent = ''
    return
  }
  const f = (n: number) => formatPrice(n, precision, locale)
  const change = c.open === 0 ? 0 : ((c.close - c.open) / c.open) * 100
  el.textContent = `O ${f(c.open)}  H ${f(c.high)}  L ${f(c.low)}  C ${f(c.close)}  ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
  el.dataset.direction = c.close >= c.open ? 'up' : 'down'
}

/**
 * Drives a TradingView lightweight chart imperatively. Candles never pass
 * through React state or Redux: history is set once, live candles are batched
 * per animation frame and applied with series.update(), so the chart costs no
 * React renders at all while it streams.
 */
export function useCandleChart({
  container,
  legend,
  symbol,
  interval,
  precision,
  locale,
  theme,
}: Options) {
  const source = useMarketData()
  const handles = useRef<Handles | null>(null)
  const lastCandle = useRef<Candle | null>(null)
  const settings = useRef({ precision, locale })
  const [status, setStatus] = useState<ChartStatus>('loading')

  const showLegend = (c: Candle | null) => {
    writeLegend(legend.current, c, settings.current.precision, settings.current.locale)
  }

  // 1. Create the chart once.
  useEffect(() => {
    const el = container.current
    if (!el) return
    const colors = readChartColors()
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontFamily: getComputedStyle(el).fontFamily,
        attributionLogo: true,
        panes: { separatorColor: colors.border },
      },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    })
    // Hollow up candles, filled down candles: direction is readable without color.
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: 'rgba(0, 0, 0, 0)',
      borderUpColor: colors.up,
      wickUpColor: colors.up,
      downColor: colors.down,
      borderDownColor: colors.down,
      wickDownColor: colors.down,
    })
    // Volume in its own pane: one axis per pane, never a dual axis.
    const volume = chart.addSeries(
      HistogramSeries,
      { priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false },
      1,
    )
    chart.panes()[0]?.setStretchFactor(0.78)
    chart.panes()[1]?.setStretchFactor(0.22)

    const onCrosshair = (param: MouseEventParams) => {
      const bar = param.seriesData.get(candles) as CandlestickData | undefined
      if (bar && 'open' in bar) {
        showLegend({
          time: bar.time as number,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: 0,
        })
      } else {
        showLegend(lastCandle.current)
      }
    }
    chart.subscribeCrosshairMove(onCrosshair)
    handles.current = { chart, candles, volume, colors }

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshair)
      chart.remove()
      handles.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, [])

  // 2. Theme: re-read the CSS tokens after the class change has applied.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const h = handles.current
      if (!h) return
      const colors = readChartColors()
      h.colors = colors
      h.chart.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
          panes: { separatorColor: colors.border },
        },
        grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
        rightPriceScale: { borderColor: colors.border },
        timeScale: { borderColor: colors.border },
      })
      h.candles.applyOptions({
        borderUpColor: colors.up,
        wickUpColor: colors.up,
        downColor: colors.down,
        borderDownColor: colors.down,
        wickDownColor: colors.down,
      })
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [theme])

  // 3. Price format and locale.
  useEffect(() => {
    settings.current = { precision, locale }
    const h = handles.current
    if (!h) return
    h.candles.applyOptions({
      priceFormat: {
        type: 'custom',
        minMove: 1 / 10 ** precision,
        formatter: (p: number) => formatPrice(p, precision, locale),
      },
    })
    h.volume.applyOptions({
      priceFormat: {
        type: 'custom',
        minMove: 0.01,
        formatter: (v: number) => formatCompact(v, locale),
      },
    })
    const time = dateFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    const tick = dateFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const day = dateFormat(locale, { day: 'numeric', month: 'short' })
    h.chart.applyOptions({
      localization: {
        locale,
        timeFormatter: (t: Time) => time.format((t as number) * 1000),
      },
      timeScale: {
        tickMarkFormatter: (t: Time, type: number) =>
          // 0 year, 1 month, 2 day of month, 3 time, 4 time with seconds
          (type >= 3 ? tick : day).format((t as number) * 1000),
      },
    })
    showLegend(lastCandle.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showLegend reads refs only
  }, [precision, locale])

  // 4. Data: history from REST, then live candles from the WebSocket.
  useEffect(() => {
    const h = handles.current
    if (!h) return
    let cancelled = false
    let ready = false
    let pending: Candle | null = null
    setStatus('loading')
    h.candles.setData([])
    h.volume.setData([])
    lastCandle.current = null
    showLegend(null)

    const apply = (c: Candle) => {
      const current = handles.current
      if (!current) return
      const last = lastCandle.current
      if (last && c.time < last.time) return // out of order
      current.candles.update(toCandle(c))
      current.volume.update(toVolume(c, current.colors))
      lastCandle.current = c
      showLegend(c)
    }

    const batcher = createRafBatcher<Candle, Candle>({
      merge: (_previous, c) => c,
      flush: apply,
    })

    const loadHistory = () => {
      source
        .fetchCandles(symbol, interval, HISTORY_LIMIT)
        .then((history) => {
          const current = handles.current
          if (cancelled || !current) return
          current.candles.setData(history.map(toCandle))
          current.volume.setData(history.map((c) => toVolume(c, current.colors)))
          lastCandle.current = history.at(-1) ?? null
          showLegend(lastCandle.current)
          ready = true
          if (pending) apply(pending)
          pending = null
          setStatus('ready')
        })
        .catch(() => {
          if (!cancelled) setStatus('error')
        })
    }

    const offCandles = source.subscribeCandles(symbol, interval, (c) => {
      if (ready) batcher.push(c)
      else pending = c
    })
    // After a reconnect, reload history to fill the gap.
    let previousStatus: string | null = null
    const offStatus = source.onStatus((s) => {
      if (
        s === 'open' &&
        previousStatus !== null &&
        previousStatus !== 'open' &&
        previousStatus !== 'idle' &&
        previousStatus !== 'connecting'
      ) {
        loadHistory()
      }
      previousStatus = s
    })
    loadHistory()

    return () => {
      cancelled = true
      batcher.cancel()
      offCandles()
      offStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showLegend reads refs only
  }, [source, symbol, interval])

  return status
}
