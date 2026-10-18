import { lazy, Suspense, type ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useNavigate, useParams } from 'react-router'

import { selectTheme } from '@/features/switch-theme'
import type { MarketSymbol } from '@/shared/api/market-data'
import { DEFAULT_LOCALE, isLocale } from '@/shared/config/i18n'
import { DEFAULT_SYMBOL, DEFAULT_SYMBOLS } from '@/shared/config/markets'
import { cn } from '@/shared/lib/utils'
import { MarketTable } from '@/widgets/market-table'
import { OrderBook } from '@/widgets/order-book'
import { PairHeader } from '@/widgets/pair-header'
import { TradesFeed } from '@/widgets/trades-feed'

function Panel({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children?: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn('flex min-h-48 flex-col overflow-hidden rounded-lg border bg-card', className)}
    >
      <h2 className="border-b px-3 py-2 text-sm font-medium">{title}</h2>
      {children ?? (
        <div className="flex flex-1 items-center justify-center p-3 text-sm text-muted-foreground">
          Coming soon
        </div>
      )}
    </section>
  )
}

// The chart library is the biggest dependency: load it in its own chunk.
const ChartPanel = lazy(() =>
  import('@/widgets/chart-panel').then((m) => ({ default: m.ChartPanel })),
)

function ChartFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Loading chart…
    </div>
  )
}

const isKnownSymbol = (s: string | undefined): s is MarketSymbol =>
  (DEFAULT_SYMBOLS as readonly string[]).includes(s ?? '')

export function DashboardPage() {
  const { lang, pair } = useParams()
  const navigate = useNavigate()
  const theme = useSelector(selectTheme)

  if (!isLocale(lang)) return <Navigate to={`/${DEFAULT_LOCALE}/${DEFAULT_SYMBOL}`} replace />
  if (!isKnownSymbol(pair)) return <Navigate to={`/${lang}/${DEFAULT_SYMBOL}`} replace />

  const select = (symbol: MarketSymbol) => {
    void navigate(`/${lang}/${symbol}`)
  }

  return (
    <main className="grid flex-1 gap-2 p-2 lg:min-h-0 lg:grid-cols-[minmax(21rem,25rem)_1fr_minmax(16rem,20rem)] lg:grid-rows-[auto_minmax(0,1fr)_16rem]">
      <div className="lg:col-span-3">
        <PairHeader symbol={pair} locale={lang} />
      </div>
      <Panel title="Markets" className="max-h-[70dvh] lg:row-span-2 lg:max-h-none lg:min-h-0">
        <MarketTable selectedSymbol={pair} onSelect={select} />
      </Panel>
      <Panel title="Chart" className="min-h-[26rem] lg:min-h-0">
        <Suspense fallback={<ChartFallback />}>
          <ChartPanel symbol={pair} theme={theme} locale={lang} />
        </Suspense>
      </Panel>
      <Panel title="Order book" className="lg:row-span-2 lg:min-h-0">
        <OrderBook symbol={pair} locale={lang} />
      </Panel>
      <Panel title="Recent trades" className="max-h-96 lg:max-h-none lg:min-h-0">
        <TradesFeed symbol={pair} locale={lang} />
      </Panel>
    </main>
  )
}
