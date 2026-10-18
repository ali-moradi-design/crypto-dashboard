import { describe, expect, it } from 'vitest'

import { makeTicker } from '@/shared/lib/test/fake-market-data'

import { alertAdded, alertsSlice, findTriggered } from './alerts-slice'

describe('price alerts', () => {
  it('picks the direction from the current price', () => {
    let state = alertsSlice.reducer(
      undefined,
      alertAdded({ symbol: 'BTC_USDT', price: 90000, currentPrice: 81000 }),
    )
    state = alertsSlice.reducer(
      state,
      alertAdded({ symbol: 'BTC_USDT', price: 70000, currentPrice: 81000 }),
    )
    expect(state.items.map((a) => a.direction)).toEqual(['above', 'below'])
  })

  it('triggers when the price crosses the target, only for that pair', () => {
    const { items } = [
      alertAdded({ symbol: 'BTC_USDT', price: 82000, currentPrice: 81000 }),
      alertAdded({ symbol: 'BTC_USDT', price: 80000, currentPrice: 81000 }),
      alertAdded({ symbol: 'ETH_USDT', price: 2000, currentPrice: 2500 }),
    ].reduce(alertsSlice.reducer, alertsSlice.getInitialState())

    expect(findTriggered(items, [makeTicker('BTC_USDT', 81500)])).toEqual([])
    expect(findTriggered(items, [makeTicker('BTC_USDT', 82000)]).map((a) => a.price)).toEqual([
      82000,
    ])
    expect(findTriggered(items, [makeTicker('BTC_USDT', 79000)]).map((a) => a.price)).toEqual([
      80000,
    ])
    expect(findTriggered(items, [makeTicker('ETH_USDT', 1999)]).map((a) => a.symbol)).toEqual([
      'ETH_USDT',
    ])
  })
})
