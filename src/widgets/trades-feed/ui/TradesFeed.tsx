import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { selectPair, splitSymbol } from '@/entities/pair'
import { selectTrades } from '@/entities/trade'
import type { MarketSymbol, Trade } from '@/shared/api/market-data'
import { DEFAULT_LOCALE } from '@/shared/config/locale'
import { formatAmount, formatClock, formatPrice, guessPrecision } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

import { useTradesStream } from '../model/use-trades-stream'

type State = Parameters<typeof selectTrades>[0] & Parameters<typeof selectPair>[0]

interface RowProps {
  trade: Trade
  pricePrecision: number
  amountPrecision: number
  locale: string
  sideLabel: string
}

/** Keyed by trade id and memoized: when a new trade arrives only it renders. */
function TradeRow({ trade, pricePrecision, amountPrecision, locale, sideLabel }: RowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const buy = trade.side === 'buy'

  // Flash trades that just happened (not the history loaded at start).
  useEffect(() => {
    if (ref.current && Date.now() - trade.time < 3000) {
      ref.current.dataset.flash = buy ? 'up-a' : 'down-a'
    }
  }, [buy, trade.time])

  return (
    <div
      ref={ref}
      role="row"
      className="tabular grid grid-cols-[1fr_1fr_auto] gap-2 px-2 py-px text-xs"
    >
      <span
        role="cell"
        className={cn('inline-flex items-center gap-1', buy ? 'text-up' : 'text-down')}
      >
        <span aria-hidden className="text-[0.6rem]">
          {buy ? '▲' : '▼'}
        </span>
        <span className="sr-only">{sideLabel} </span>
        {formatPrice(trade.price, pricePrecision, locale)}
      </span>
      <span role="cell" className="text-end">
        {formatAmount(trade.amount, amountPrecision, locale)}
      </span>
      <span role="cell" className="text-end text-muted-foreground">
        {formatClock(trade.time, locale)}
      </span>
    </div>
  )
}

export function TradesFeed({
  symbol,
  locale = DEFAULT_LOCALE,
}: {
  symbol: MarketSymbol
  locale?: string
}) {
  const { t } = useTranslation()
  useTradesStream(symbol)
  const trades = useSelector(selectTrades)
  const pair = useSelector((s: State) => selectPair(s, symbol))
  const { base, quote } = splitSymbol(symbol)
  const pricePrecision = pair?.pricePrecision ?? guessPrecision(trades[0]?.price ?? 0)
  const amountPrecision = pair?.amountPrecision ?? 4

  return (
    <div
      role="table"
      aria-label={`${base}/${quote}`}
      dir="ltr"
      className="flex min-h-0 flex-1 flex-col py-1"
    >
      <div
        role="row"
        className="grid grid-cols-[1fr_1fr_auto] gap-2 px-2 pb-1 text-[0.7rem] text-muted-foreground"
      >
        <span role="columnheader">{t('trades.price', { asset: quote })}</span>
        <span role="columnheader" className="text-end">
          {t('trades.amount', { asset: base })}
        </span>
        <span role="columnheader" className="text-end">
          {t('trades.time')}
        </span>
      </div>
      <div role="rowgroup" className="min-h-0 flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex flex-col gap-1 p-1" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          trades.map((trade) => (
            <TradeRow
              key={trade.id}
              trade={trade}
              pricePrecision={pricePrecision}
              amountPrecision={amountPrecision}
              locale={locale}
              sideLabel={trade.side === 'buy' ? t('trades.buy') : t('trades.sell')}
            />
          ))
        )}
      </div>
    </div>
  )
}
