import { describe, expect, it } from 'vitest'

import {
  parsePair,
  parseRestCandle,
  parseRestOrderBook,
  parseTicker,
  parseTrade,
  parseWsCandle,
  parseWsOrderBook,
  splitCandleName,
} from './parse'

// Fixtures are real Gate payloads (shortened).
describe('Gate parsers', () => {
  it('parses a ticker', () => {
    expect(
      parseTicker({
        currency_pair: 'BTC_USDT',
        last: '81139',
        lowest_ask: '81139',
        highest_bid: '81138.9',
        change_percentage: '-0.29',
        base_volume: '4695.426657',
        quote_volume: '382958286.265642',
        high_24h: '82285.8',
        low_24h: '80817',
      }),
    ).toEqual({
      symbol: 'BTC_USDT',
      last: 81139,
      changePercent: -0.29,
      high24h: 82285.8,
      low24h: 80817,
      baseVolume: 4695.426657,
      quoteVolume: 382958286.265642,
      bestBid: 81138.9,
      bestAsk: 81139,
    })
  })

  it('parses a pair', () => {
    expect(
      parsePair({
        id: 'ETH_USDT',
        base: 'ETH',
        quote: 'USDT',
        precision: 2,
        amount_precision: 4,
        trade_status: 'tradable',
      }),
    ).toEqual({
      symbol: 'ETH_USDT',
      base: 'ETH',
      quote: 'USDT',
      pricePrecision: 2,
      amountPrecision: 4,
    })
  })

  it('parses REST and WebSocket candles into the same shape', () => {
    const rest = parseRestCandle([
      '1792265640',
      '42836.60825110',
      '81551.2',
      '81551.3',
      '81551.1',
      '81551.15',
      '0.525272',
      'true',
    ])
    const ws = parseWsCandle({
      t: '1792265640',
      v: '42836.60825110',
      c: '81551.2',
      h: '81551.3',
      l: '81551.1',
      o: '81551.15',
      n: '1m_BTC_USDT',
      a: '0.525272',
    })
    const expected = {
      time: 1792265640,
      open: 81551.15,
      high: 81551.3,
      low: 81551.1,
      close: 81551.2,
      volume: 0.525272,
    }
    expect(rest).toEqual(expected)
    expect(ws).toEqual(expected)
  })

  it('splits a candle channel name', () => {
    expect(splitCandleName('15m_PEPE_USDT')).toEqual({ interval: '15m', symbol: 'PEPE_USDT' })
  })

  it('parses order books', () => {
    const levels = { asks: [['81551.3', '0.152107']], bids: [['81551.2', '0.065412']] } as const
    const asks = levels.asks.map(([p, a]) => [p, a] as [string, string])
    const bids = levels.bids.map(([p, a]) => [p, a] as [string, string])

    expect(parseRestOrderBook('BTC_USDT', { current: 1, asks, bids })).toEqual({
      symbol: 'BTC_USDT',
      asks: [[81551.3, 0.152107]],
      bids: [[81551.2, 0.065412]],
      time: 1,
    })
    expect(parseWsOrderBook({ t: 2, s: 'BTC_USDT', asks, bids }).time).toBe(2)
  })

  it('parses a trade', () => {
    expect(
      parseTrade({
        id: '223682999',
        create_time_ms: '1792338976958.962000',
        currency_pair: 'BTC_USDT',
        side: 'buy',
        amount: '0.000369',
        price: '81139',
      }),
    ).toEqual({
      id: '223682999',
      symbol: 'BTC_USDT',
      price: 81139,
      amount: 0.000369,
      side: 'buy',
      time: 1792338976958,
    })
  })

  it('turns bad numbers into 0 instead of NaN', () => {
    const ticker = parseTicker({
      currency_pair: 'X_USDT',
      last: '',
      change_percentage: 'abc',
      high_24h: '1',
      low_24h: '1',
      base_volume: '1',
      quote_volume: '1',
      highest_bid: '1',
      lowest_ask: '1',
    })
    expect(ticker.last).toBe(0)
    expect(ticker.changePercent).toBe(0)
  })
})
