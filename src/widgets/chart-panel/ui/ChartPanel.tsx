import { useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { selectPair } from '@/entities/pair'
import { selectTicker } from '@/entities/ticker'
import { INTERVALS, type Interval, type MarketSymbol } from '@/shared/api/market-data'
import { DEFAULT_LOCALE } from '@/shared/config/locale'
import { guessPrecision } from '@/shared/lib/format'
import { storage } from '@/shared/lib/storage'
import { cn } from '@/shared/lib/utils'

import { useCandleChart } from '../lib/use-candle-chart'

type State = Parameters<typeof selectPair>[0] & Parameters<typeof selectTicker>[0]

const INTERVAL_KEY = 'cd.interval'

export interface ChartPanelLabels {
  intervals: string
  loading: string
  error: string
}

const LABELS: ChartPanelLabels = {
  intervals: 'Candle interval',
  loading: 'Loading chart…',
  error: 'Could not load the chart. It will retry when the connection is back.',
}

export function ChartPanel({
  symbol,
  theme,
  locale = DEFAULT_LOCALE,
  labels = LABELS,
}: {
  symbol: MarketSymbol
  theme: string
  locale?: string
  labels?: ChartPanelLabels
}) {
  const [interval, setInterval] = useState<Interval>(() => {
    const saved = storage.get<string>(INTERVAL_KEY, '1h')
    return (INTERVALS as readonly string[]).includes(saved) ? (saved as Interval) : '1h'
  })
  const pricePrecision = useSelector((s: State) => selectPair(s, symbol)?.pricePrecision)
  // Only needed until pair info arrives; a number, so price ticks do not re-render.
  const guessed = useSelector((s: State) => guessPrecision(selectTicker(s, symbol)?.last ?? 0))
  const precision = pricePrecision ?? guessed
  const container = useRef<HTMLDivElement>(null)
  const legend = useRef<HTMLDivElement>(null)

  const status = useCandleChart({ container, legend, symbol, interval, precision, locale, theme })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-2 py-1.5">
        <div role="group" aria-label={labels.intervals} className="flex gap-0.5" dir="ltr">
          {INTERVALS.map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={interval === i}
              onClick={() => {
                setInterval(i)
                storage.set(INTERVAL_KEY, i)
              }}
              className={cn(
                'rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground',
                interval === i && 'bg-muted font-medium text-foreground',
              )}
            >
              {i}
            </button>
          ))}
        </div>
        <div
          ref={legend}
          dir="ltr"
          className="tabular ms-auto truncate text-xs text-muted-foreground data-[direction=down]:text-down data-[direction=up]:text-up"
        />
      </div>
      {/* Chart axes are never mirrored, also in RTL. */}
      <div dir="ltr" className="relative min-h-72 flex-1 lg:min-h-0">
        <div ref={container} className="absolute inset-0" data-testid="candle-chart" />
        {status !== 'ready' ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/60 text-sm text-muted-foreground">
            {status === 'loading' ? labels.loading : labels.error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
