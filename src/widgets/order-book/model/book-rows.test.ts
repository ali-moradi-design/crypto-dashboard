import { describe, expect, it } from 'vitest'

import { selectSpread } from '@/entities/order-book'

import { toBookRows } from './book-rows'

describe('order book', () => {
  it('adds running totals from the best price outward', () => {
    expect(
      toBookRows(
        [
          [100, 1],
          [99, 2],
          [98, 3],
        ],
        2,
      ),
    ).toEqual([
      { price: 100, amount: 1, total: 1 },
      { price: 99, amount: 2, total: 3 },
    ])
  })

  it('computes the spread', () => {
    const state = {
      orderBook: { symbol: 'X', bids: [[200, 1] as const], asks: [[203, 1] as const] },
    }
    expect(selectSpread(state)).toEqual({
      bestBid: 200,
      bestAsk: 203,
      value: 3,
      percent: (3 / 203) * 100,
    })
  })
})
