import { useSelector } from 'react-redux'

import { selectAsks, selectBids, selectSpread } from '@/entities/order-book'
import { selectPair, splitSymbol } from '@/entities/pair'
import type { MarketSymbol } from '@/shared/api/market-data'
import { DEFAULT_LOCALE } from '@/shared/config/locale'
import { formatAmount, formatPrice, guessPrecision, numberFormat } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

import { toBookRows } from '../model/book-rows'
import { useOrderBookStream } from '../model/use-order-book-stream'

type State = Parameters<typeof selectBids>[0] & Parameters<typeof selectPair>[0]

const ROWS = 12

/** Spreads are tiny: keep two significant digits ("0.00012%"). */
function formatSpreadPercent(percent: number, locale: string): string {
  return numberFormat(locale, { style: 'percent', maximumSignificantDigits: 2 }).format(
    percent / 100,
  )
}

interface RowProps {
  side: 'bid' | 'ask'
  price: number
  amount: number
  total: number
  depth: number
  pricePrecision: number
  amountPrecision: number
  locale: string
}

/** Primitive props only: React Compiler skips rows whose level did not change. */
function BookRow({
  side,
  price,
  amount,
  total,
  depth,
  pricePrecision,
  amountPrecision,
  locale,
}: RowProps) {
  return (
    <div
      role="row"
      style={{ '--depth': `${depth.toFixed(1)}%` } as React.CSSProperties}
      className={cn(
        'tabular grid grid-cols-3 px-2 py-px text-xs',
        side === 'bid'
          ? 'bg-[linear-gradient(to_left,var(--up-soft)_var(--depth),transparent_var(--depth))]'
          : 'bg-[linear-gradient(to_left,var(--down-soft)_var(--depth),transparent_var(--depth))]',
      )}
    >
      <span role="cell" className={side === 'bid' ? 'text-up' : 'text-down'}>
        {formatPrice(price, pricePrecision, locale)}
      </span>
      <span role="cell" className="text-end">
        {formatAmount(amount, amountPrecision, locale)}
      </span>
      <span role="cell" className="text-end text-muted-foreground">
        {formatAmount(total, amountPrecision, locale)}
      </span>
    </div>
  )
}

export function OrderBook({
  symbol,
  locale = DEFAULT_LOCALE,
}: {
  symbol: MarketSymbol
  locale?: string
}) {
  const { t } = useTranslation()
  useOrderBookStream(symbol)
  const bids = useSelector(selectBids)
  const asks = useSelector(selectAsks)
  const spread = useSelector(selectSpread)
  const pair = useSelector((s: State) => selectPair(s, symbol))
  const { base, quote } = splitSymbol(symbol)

  const bidRows = toBookRows(bids, ROWS)
  const askRows = toBookRows(asks, ROWS)
  const maxTotal = Math.max(bidRows.at(-1)?.total ?? 0, askRows.at(-1)?.total ?? 0) || 1
  const pricePrecision = pair?.pricePrecision ?? guessPrecision(spread?.bestBid ?? 0)
  const amountPrecision = pair?.amountPrecision ?? 4
  const common = { pricePrecision, amountPrecision, locale }

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2" aria-busy="true">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div
      role="table"
      aria-label={`${base}/${quote}`}
      dir="ltr"
      className="flex min-h-0 flex-1 flex-col py-1"
    >
      <div role="row" className="grid grid-cols-3 px-2 pb-1 text-[0.7rem] text-muted-foreground">
        <span role="columnheader">{t('book.price', { asset: quote })}</span>
        <span role="columnheader" className="text-end">
          {t('book.amount', { asset: base })}
        </span>
        <span role="columnheader" className="text-end">
          {t('book.total')}
        </span>
      </div>
      <div role="rowgroup" aria-label={t('book.asks')} className="flex flex-col-reverse">
        {askRows.map((r, i) => (
          <BookRow key={i} side="ask" {...r} depth={(r.total / maxTotal) * 100} {...common} />
        ))}
      </div>
      <div
        role="row"
        className="tabular my-1 flex items-center justify-between border-y bg-muted/40 px-2 py-1 text-xs"
      >
        <span role="cell" className="text-muted-foreground">
          {t('book.spread')}
        </span>
        <span role="cell">
          {spread
            ? `${formatPrice(spread.value, pricePrecision, locale)} (${formatSpreadPercent(spread.percent, locale)})`
            : '—'}
        </span>
      </div>
      <div role="rowgroup" aria-label={t('book.bids')} className="flex flex-col">
        {bidRows.map((r, i) => (
          <BookRow key={i} side="bid" {...r} depth={(r.total / maxTotal) * 100} {...common} />
        ))}
      </div>
    </div>
  )
}
