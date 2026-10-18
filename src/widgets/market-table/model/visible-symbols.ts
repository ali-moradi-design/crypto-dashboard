import { createSelector } from '@reduxjs/toolkit'

import { selectSymbols } from '@/entities/pair'
import { selectTickerMap } from '@/entities/ticker'
import { selectFavorites } from '@/features/toggle-favorite'
import type { MarketSymbol, Ticker } from '@/shared/api/market-data'

export type SortKey = 'default' | 'symbol' | 'price' | 'change' | 'volume'
export type SortDirection = 'asc' | 'desc'
export interface SortState {
  key: SortKey
  direction: SortDirection
}
export type ListFilter = 'all' | 'favorites'

export interface VisibleOptions {
  query: string
  sort: SortState
  filter: ListFilter
}

const sortValue: Record<Exclude<SortKey, 'default' | 'symbol'>, (t: Ticker) => number> = {
  price: (t) => t.last,
  change: (t) => t.changePercent,
  volume: (t) => t.quoteVolume,
}

function sameArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

export function computeVisibleSymbols(
  symbols: readonly MarketSymbol[],
  tickers: Record<MarketSymbol, Ticker>,
  favorites: readonly MarketSymbol[],
  { query, sort, filter }: VisibleOptions,
): MarketSymbol[] {
  const q = query
    .trim()
    .toUpperCase()
    .replace(/[/\s-]/g, '')
  let list = symbols.filter(
    (s) =>
      (filter === 'all' || favorites.includes(s)) && (q === '' || s.replace('_', '').includes(q)),
  )

  if (sort.key !== 'default') {
    const factor = sort.direction === 'asc' ? 1 : -1
    if (sort.key === 'symbol') {
      list = list.toSorted((a, b) => a.localeCompare(b) * factor)
    } else {
      const value = sortValue[sort.key]
      list = list.toSorted((a, b) => {
        const ta = tickers[a]
        const tb = tickers[b]
        if (!ta || !tb) return ta ? -1 : tb ? 1 : 0
        return (value(ta) - value(tb)) * factor
      })
    }
  }
  return list
}

/**
 * The symbols to show, in order. Tickers change every frame, but the result
 * keeps its identity while the order stays the same, so the table body does
 * not re-render for price updates.
 */
export const selectVisibleSymbols = createSelector(
  [
    selectSymbols,
    selectTickerMap,
    selectFavorites,
    (_state: unknown, options: VisibleOptions) => options,
  ],
  computeVisibleSymbols,
  { memoizeOptions: { resultEqualityCheck: sameArray } },
)
