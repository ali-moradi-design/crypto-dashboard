import { describe, expect, it } from 'vitest'

import { makeTicker } from '@/shared/lib/test/fake-market-data'

import { computeVisibleSymbols, selectVisibleSymbols, type VisibleOptions } from './visible-symbols'

const symbols = ['BTC_USDT', 'ETH_USDT', 'SOL_USDT']
const tickers = {
  BTC_USDT: makeTicker('BTC_USDT', 81000, { changePercent: -1, quoteVolume: 300 }),
  ETH_USDT: makeTicker('ETH_USDT', 2500, { changePercent: 4, quoteVolume: 200 }),
  SOL_USDT: makeTicker('SOL_USDT', 190, { changePercent: 2, quoteVolume: 500 }),
}
const base: VisibleOptions = {
  query: '',
  sort: { key: 'default', direction: 'desc' },
  filter: 'all',
}

describe('computeVisibleSymbols', () => {
  it('keeps the default order', () => {
    expect(computeVisibleSymbols(symbols, tickers, [], base)).toEqual(symbols)
  })

  it('sorts by change, volume, price and name', () => {
    const by = (key: VisibleOptions['sort']['key'], direction: 'asc' | 'desc' = 'desc') =>
      computeVisibleSymbols(symbols, tickers, [], { ...base, sort: { key, direction } })
    expect(by('change')).toEqual(['ETH_USDT', 'SOL_USDT', 'BTC_USDT'])
    expect(by('volume')).toEqual(['SOL_USDT', 'BTC_USDT', 'ETH_USDT'])
    expect(by('price', 'asc')).toEqual(['SOL_USDT', 'ETH_USDT', 'BTC_USDT'])
    expect(by('symbol', 'asc')).toEqual(['BTC_USDT', 'ETH_USDT', 'SOL_USDT'])
  })

  it('searches with or without a slash', () => {
    expect(computeVisibleSymbols(symbols, tickers, [], { ...base, query: 'eth' })).toEqual([
      'ETH_USDT',
    ])
    expect(computeVisibleSymbols(symbols, tickers, [], { ...base, query: 'sol/usdt' })).toEqual([
      'SOL_USDT',
    ])
  })

  it('filters favorites', () => {
    expect(
      computeVisibleSymbols(symbols, tickers, ['SOL_USDT'], { ...base, filter: 'favorites' }),
    ).toEqual(['SOL_USDT'])
  })
})

describe('selectVisibleSymbols', () => {
  it('returns the same array while the order does not change', () => {
    const state = (t: typeof tickers) => ({
      pairs: { symbols, bySymbol: {} },
      tickers: { bySymbol: t, sparklines: {} },
      favorites: { symbols: [] },
    })
    const options: VisibleOptions = { ...base, sort: { key: 'volume', direction: 'desc' } }
    const first = selectVisibleSymbols(state(tickers), options)

    // Price changes, volume order stays: same reference, so no re-render.
    const priceOnly = { ...tickers, BTC_USDT: makeTicker('BTC_USDT', 81001, { quoteVolume: 300 }) }
    expect(selectVisibleSymbols(state(priceOnly), options)).toBe(first)

    // Volume order changes: new array.
    const reordered = { ...tickers, ETH_USDT: makeTicker('ETH_USDT', 2500, { quoteVolume: 900 }) }
    expect(selectVisibleSymbols(state(reordered), options)).toEqual([
      'ETH_USDT',
      'SOL_USDT',
      'BTC_USDT',
    ])
  })
})
