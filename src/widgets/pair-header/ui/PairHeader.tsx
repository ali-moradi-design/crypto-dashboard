import { useEffect, useRef, type ReactNode } from 'react'
import { useSelector } from 'react-redux'

import { selectPair, splitSymbol } from '@/entities/pair'
import { PriceChange, selectTicker } from '@/entities/ticker'
import type { MarketSymbol } from '@/shared/api/market-data'
import { DEFAULT_LOCALE } from '@/shared/config/locale'
import { formatCompact, formatPrice, guessPrecision } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import { Skeleton } from '@/shared/ui/skeleton'

type State = Parameters<typeof selectTicker>[0] & Parameters<typeof selectPair>[0]

/** Last price and 24h stats of the selected pair. */
export function PairHeader({
  symbol,
  locale = DEFAULT_LOCALE,
  actions,
}: {
  symbol: MarketSymbol
  locale?: string
  /** Slot for features (e.g. price alerts); pass a stable element. */
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const ticker = useSelector((s: State) => selectTicker(s, symbol))
  const pair = useSelector((s: State) => selectPair(s, symbol))
  const { base, quote } = splitSymbol(symbol)
  const precision = pair?.pricePrecision ?? guessPrecision(ticker?.last ?? 0)
  const priceRef = useRef<HTMLSpanElement>(null)
  const lastPrice = useRef<number | undefined>(undefined)
  const last = ticker?.last
  const lastText = last === undefined ? undefined : formatPrice(last, precision, locale)

  // Tint the price on a tick (DOM only) and show it in the tab title.
  useEffect(() => {
    const previous = lastPrice.current
    lastPrice.current = last
    const el = priceRef.current
    if (el && previous !== undefined && last !== undefined && last !== previous) {
      const variant = el.dataset.flash?.endsWith('a') ? 'b' : 'a'
      el.dataset.flash = `${last > previous ? 'up' : 'down'}-${variant}`
    }
  }, [last])

  useEffect(() => {
    document.title = lastText ? `${lastText} ${base}/${quote} · ${t('app.title')}` : t('app.title')
  }, [lastText, base, quote, t])

  useEffect(
    () => () => {
      document.title = 'Crypto dashboard'
    },
    [],
  )

  const stat = (label: string, value: string | undefined) => (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular truncate text-sm">
        {value ? <bdi>{value}</bdi> : <Skeleton className="h-4 w-16" />}
      </dd>
    </div>
  )

  return (
    <section
      aria-label={`${base}/${quote}`}
      className="flex flex-col gap-2 border bg-card px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6"
    >
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold" dir="ltr">
          {base}
          <span className="text-muted-foreground">/{quote}</span>
        </h1>
        <span ref={priceRef} className="tabular text-xl font-semibold" dir="ltr" aria-live="off">
          {lastText ?? <Skeleton className="inline-block h-6 w-24 align-middle" />}
        </span>
        {ticker ? (
          <PriceChange value={ticker.changePercent} locale={locale} className="text-sm" />
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:gap-6">
        {stat(t('stats.high'), ticker ? formatPrice(ticker.high24h, precision, locale) : undefined)}
        {stat(t('stats.low'), ticker ? formatPrice(ticker.low24h, precision, locale) : undefined)}
        {stat(
          t('stats.volume', { asset: base }),
          ticker ? formatCompact(ticker.baseVolume, locale) : undefined,
        )}
        {stat(
          t('stats.volume', { asset: quote }),
          ticker ? formatCompact(ticker.quoteVolume, locale) : undefined,
        )}
      </dl>
      {actions ? <div className="sm:ms-auto">{actions}</div> : null}
    </section>
  )
}
