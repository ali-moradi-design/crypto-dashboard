import type { BookLevel } from '@/shared/api/market-data'

export interface BookRowData {
  price: number
  amount: number
  /** Cumulative amount from the best price outward. */
  total: number
}

/** Best price first, with running totals. */
export function toBookRows(levels: readonly BookLevel[], count: number): BookRowData[] {
  let total = 0
  return levels.slice(0, count).map(([price, amount]) => {
    total += amount
    return { price, amount, total }
  })
}
