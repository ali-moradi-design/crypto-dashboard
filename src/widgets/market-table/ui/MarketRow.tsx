import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { selectPair, splitSymbol } from '@/entities/pair'
import { PriceChange, selectSparkline, selectTicker, Sparkline } from '@/entities/ticker'
import { FavoriteButton } from '@/features/toggle-favorite'
import type { MarketSymbol } from '@/shared/api/market-data'
import { DEFAULT_LOCALE } from '@/shared/config/locale'
import { formatCompact, formatPrice, guessPrecision } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

type State = Parameters<typeof selectTicker>[0] & Parameters<typeof selectPair>[0]

interface MarketRowProps {
  symbol: MarketSymbol
  selected?: boolean
  onSelect?: (symbol: MarketSymbol) => void
  locale?: string
}

/**
 * One market. Subscribes only to its own ticker, so a price change in another
 * pair never re-renders this row.
 */
export function MarketRow({
  symbol,
  selected = false,
  onSelect,
  locale = DEFAULT_LOCALE,
}: MarketRowProps) {
  const { t } = useTranslation()
  const ticker = useSelector((s: State) => selectTicker(s, symbol))
  const pair = useSelector((s: State) => selectPair(s, symbol))
  const sparkline = useSelector((s: State) => selectSparkline(s, symbol))
  const priceRef = useRef<HTMLSpanElement>(null)
  const lastPrice = useRef<number | undefined>(undefined)
  const last = ticker?.last

  // Tint the price on a tick by toggling a data attribute directly on the DOM
  // node: no extra React render for the animation.
  useEffect(() => {
    const previous = lastPrice.current
    lastPrice.current = last
    const el = priceRef.current
    if (!el || previous === undefined || last === undefined || last === previous) return
    const direction = last > previous ? 'up' : 'down'
    const variant = el.dataset.flash?.endsWith('a') ? 'b' : 'a'
    el.dataset.flash = `${direction}-${variant}`
  }, [last])

  const { base, quote } = splitSymbol(symbol)
  const precision = pair?.pricePrecision ?? guessPrecision(last ?? 0)

  return (
    <tr
      aria-selected={selected}
      onClick={
        onSelect
          ? () => {
              onSelect(symbol)
            }
          : undefined
      }
      className={cn(
        'market-row border-b border-border/50 text-sm last:border-0',
        onSelect && 'cursor-pointer hover:bg-muted/60',
      )}
    >
      <td className={cn('w-7 border-s-2 ps-0.5', selected ? 'border-ring' : 'border-transparent')}>
        <FavoriteButton
          symbol={symbol}
          label={t('markets.favorite', { pair: `${base}/${quote}` })}
        />
      </td>
      <th scope="row" className="truncate py-1.5 text-start font-normal whitespace-nowrap">
        <span dir="ltr" className="block">
          <span className="font-medium">{base}</span>
          <span className="text-muted-foreground">/{quote}</span>
        </span>
        <span className="tabular block text-xs text-muted-foreground">
          {ticker ? t('markets.volume', { value: formatCompact(ticker.quoteVolume, locale) }) : ' '}
        </span>
      </th>
      <td className="hidden px-1 @[25rem]:table-cell">
        {sparkline && ticker ? (
          <Sparkline values={sparkline} up={ticker.changePercent >= 0} />
        ) : null}
      </td>
      <td className="tabular px-1 text-end">
        {ticker ? (
          <bdi ref={priceRef}>{formatPrice(ticker.last, precision, locale)}</bdi>
        ) : (
          <Skeleton className="ms-auto h-4 w-16" />
        )}
      </td>
      <td className="pe-2 text-end">
        {ticker ? (
          <PriceChange value={ticker.changePercent} locale={locale} />
        ) : (
          <Skeleton className="ms-auto h-4 w-12" />
        )}
      </td>
    </tr>
  )
}
