import { lazy, Suspense, type ReactNode } from 'react'
import { useDefaultLayout } from 'react-resizable-panels'
import { useSelector } from 'react-redux'
import { Navigate, useNavigate, useParams } from 'react-router'

import { PriceAlertsButton, TriggeredAlerts } from '@/features/price-alerts'
import { selectDigits } from '@/features/switch-digits'
import { selectTheme } from '@/features/switch-theme'
import type { MarketSymbol } from '@/shared/api/market-data'
import { DEFAULT_LOCALE, isLocale } from '@/shared/config/i18n'
import { DEFAULT_SYMBOL, DEFAULT_SYMBOLS } from '@/shared/config/markets'
import { formatLocale, useTranslation } from '@/shared/lib/i18n'
import { safeLocalStorage } from '@/shared/lib/safe-storage'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { cn } from '@/shared/lib/utils'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/ui/resizable'
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
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={cn('flex min-h-48 flex-col overflow-hidden border bg-card', className)}
    >
      <h2 className="border-b px-3 py-2 text-sm font-medium">{title}</h2>
      {children}
    </section>
  )
}

/** The gap between panels doubles as the drag handle (like VS Code). */
function Gap({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  return (
    <ResizableHandle
      className={cn(
        'bg-transparent transition-colors after:hidden hover:bg-ring/40 focus-visible:bg-ring/60 data-[separator=active]:bg-ring/60',
        orientation === 'horizontal'
          ? 'mx-0.5 w-1.5'
          : 'my-0.5 aria-[orientation=horizontal]:h-1.5',
      )}
    />
  )
}

// The chart library is the biggest dependency: load it in its own chunk.
const ChartPanel = lazy(() =>
  import('@/widgets/chart-panel').then((m) => ({ default: m.ChartPanel })),
)

function ChartFallback({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

const isKnownSymbol = (s: string | undefined): s is MarketSymbol =>
  (DEFAULT_SYMBOLS as readonly string[]).includes(s ?? '')

export function DashboardPage() {
  const { t } = useTranslation()
  const { lang, pair } = useParams()
  const navigate = useNavigate()
  const theme = useSelector(selectTheme)
  const digits = useSelector(selectDigits)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE

  if (!isKnownSymbol(pair)) return <Navigate to={`/${locale}/${DEFAULT_SYMBOL}`} replace />

  // Intl tag for numbers and dates (Persian digits, Gregorian calendar).
  const numbers = formatLocale(locale, digits)
  const select = (symbol: MarketSymbol) => {
    void navigate(`/${locale}/${symbol}`)
  }

  const markets = (
    <Panel title={t('panels.markets')} className="h-full min-h-0">
      <MarketTable selectedSymbol={pair} onSelect={select} locale={numbers} />
    </Panel>
  )
  const chart = (
    <Panel title={t('panels.chart')} className="h-full min-h-0">
      <Suspense fallback={<ChartFallback label={t('chart.loading')} />}>
        <ChartPanel symbol={pair} theme={theme} locale={numbers} />
      </Suspense>
    </Panel>
  )
  const book = (
    <Panel title={t('panels.orderBook')} className="h-full min-h-0">
      <OrderBook symbol={pair} locale={numbers} />
    </Panel>
  )
  const trades = (
    <Panel title={t('panels.trades')} className="h-full min-h-0">
      <TradesFeed symbol={pair} locale={numbers} />
    </Panel>
  )

  return (
    <main className="flex flex-1 flex-col gap-2 p-2 lg:min-h-0">
      <PairHeader
        symbol={pair}
        locale={numbers}
        actions={<PriceAlertsButton symbol={pair} locale={numbers} />}
      />
      {desktop ? (
        <DesktopLayout markets={markets} chart={chart} book={book} trades={trades} />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="h-[70dvh]">{markets}</div>
          <div className="h-[26rem]">{chart}</div>
          <div>{book}</div>
          <div className="h-96">{trades}</div>
        </div>
      )}
      <TriggeredAlerts locale={numbers} />
    </main>
  )
}

/** Resizable panels; sizes are remembered in this browser. */
function DesktopLayout({
  markets,
  chart,
  book,
  trades,
}: Record<'markets' | 'chart' | 'book' | 'trades', ReactNode>) {
  const columns = useDefaultLayout({ id: 'cd.layout.columns', storage: safeLocalStorage })
  const center = useDefaultLayout({ id: 'cd.layout.center', storage: safeLocalStorage })

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 flex-1"
      defaultLayout={columns.defaultLayout}
      onLayoutChanged={columns.onLayoutChanged}
    >
      <ResizablePanel id="markets" defaultSize="28" minSize={340} maxSize="45">
        {markets}
      </ResizablePanel>
      <Gap orientation="horizontal" />
      <ResizablePanel id="center" defaultSize="51" minSize={360}>
        <ResizablePanelGroup
          orientation="vertical"
          defaultLayout={center.defaultLayout}
          onLayoutChanged={center.onLayoutChanged}
        >
          <ResizablePanel id="chart" defaultSize="68" minSize={220}>
            {chart}
          </ResizablePanel>
          <Gap orientation="vertical" />
          <ResizablePanel id="trades" defaultSize="32" minSize={140}>
            {trades}
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <Gap orientation="horizontal" />
      <ResizablePanel id="book" defaultSize="22" minSize={240} maxSize="40">
        {book}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
