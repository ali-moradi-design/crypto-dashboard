import { describe, expect, it } from 'vitest'

import type { Trade } from '@/shared/api/market-data'

import { MAX_TRADES, tradesLoaded, tradesReceived, tradesSlice } from './trades-slice'

const trade = (id: number, time = id): Trade => ({
  id: String(id),
  symbol: 'BTC_USDT',
  price: 100 + id,
  amount: 1,
  side: id % 2 ? 'buy' : 'sell',
  time,
})
const reduce = tradesSlice.reducer

describe('trades slice', () => {
  it('keeps the newest first, drops duplicates and other symbols', () => {
    let state = reduce(
      undefined,
      tradesLoaded({ symbol: 'BTC_USDT', trades: [trade(1), trade(2)] }),
    )
    state = reduce(state, tradesReceived([trade(3), trade(2), { ...trade(4), symbol: 'ETH_USDT' }]))
    expect(state.items.map((t) => t.id)).toEqual(['3', '2', '1'])
  })

  it('keeps old trade objects so their rows do not re-render', () => {
    let state = reduce(undefined, tradesLoaded({ symbol: 'BTC_USDT', trades: [trade(1)] }))
    const first = state.items[0]
    state = reduce(state, tradesReceived([trade(2)]))
    expect(state.items[1]).toBe(first)
  })

  it('caps the list', () => {
    const many = Array.from({ length: MAX_TRADES + 10 }, (_, i) => trade(i))
    const state = reduce(undefined, tradesLoaded({ symbol: 'BTC_USDT', trades: many }))
    expect(state.items).toHaveLength(MAX_TRADES)
    expect(state.items[0]?.id).toBe(String(MAX_TRADES + 9))
  })
})
