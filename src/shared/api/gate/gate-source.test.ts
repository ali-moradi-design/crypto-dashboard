import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectionStatus, Ticker } from '@/shared/api/market-data'
import { FakeSocket } from '@/shared/lib/test/fake-socket'

import { GateSource } from './gate-source'

function makeSource(fetchImpl: typeof fetch = vi.fn()) {
  return new GateSource({
    restUrl: 'https://api.test/api/v4',
    wsUrl: 'wss://ws.test',
    fetch: fetchImpl,
    createSocket: (url) => new FakeSocket(url),
  })
}

const tickerUpdate = (pair: string, last: string) => ({
  channel: 'spot.tickers',
  event: 'update',
  result: {
    currency_pair: pair,
    last,
    change_percentage: '1',
    high_24h: '2',
    low_24h: '0.5',
    base_volume: '10',
    quote_volume: '100',
    highest_bid: last,
    lowest_ask: last,
  },
})

describe('GateSource WebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeSocket.reset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('subscribes once per channel and routes updates to the right listener', () => {
    const source = makeSource()
    const btc: Ticker[] = []
    const eth: Ticker[] = []
    source.subscribeTicker('BTC_USDT', (t) => btc.push(t))
    source.subscribeTicker('ETH_USDT', (t) => eth.push(t))
    source.subscribeTicker('BTC_USDT', () => undefined) // second listener, same channel

    const socket = FakeSocket.last
    socket.serverOpen()
    const subs = socket.sentJson() as { channel: string; event: string; payload: string[] }[]
    expect(subs.map((s) => [s.event, s.payload])).toEqual([
      ['subscribe', ['BTC_USDT']],
      ['subscribe', ['ETH_USDT']],
    ])

    socket.serverMessage(tickerUpdate('BTC_USDT', '81000'))
    expect(btc.map((t) => t.last)).toEqual([81000])
    expect(eth).toEqual([])
  })

  it('unsubscribes when the last listener leaves', () => {
    const source = makeSource()
    const offA = source.subscribeTrades('BTC_USDT', () => undefined)
    const offB = source.subscribeTrades('BTC_USDT', () => undefined)
    FakeSocket.last.serverOpen()

    offA()
    expect(FakeSocket.last.sentJson()).toHaveLength(1)
    offB()
    expect(FakeSocket.last.sentJson().at(-1)).toMatchObject({
      channel: 'spot.trades',
      event: 'unsubscribe',
      payload: ['BTC_USDT'],
    })
  })

  it('resubscribes everything after a reconnect', () => {
    const source = makeSource()
    source.subscribeCandles('BTC_USDT', '1m', () => undefined)
    source.subscribeOrderBook('BTC_USDT', () => undefined)
    FakeSocket.last.serverOpen()
    FakeSocket.last.serverClose()

    vi.advanceTimersByTime(30_000)
    const second = FakeSocket.last
    expect(FakeSocket.instances).toHaveLength(2)
    second.serverOpen()
    expect(second.sentJson()).toEqual([
      expect.objectContaining({ channel: 'spot.candlesticks', payload: ['1m', 'BTC_USDT'] }),
      expect.objectContaining({ channel: 'spot.order_book', payload: ['BTC_USDT', '20', '100ms'] }),
    ])
  })

  it('routes candles by interval and pair', () => {
    const source = makeSource()
    const oneMinute = vi.fn()
    const oneHour = vi.fn()
    source.subscribeCandles('BTC_USDT', '1m', oneMinute)
    source.subscribeCandles('BTC_USDT', '1h', oneHour)
    FakeSocket.last.serverOpen()

    FakeSocket.last.serverMessage({
      channel: 'spot.candlesticks',
      event: 'update',
      result: { t: '60', v: '1', c: '2', h: '3', l: '1', o: '1.5', n: '1h_BTC_USDT', a: '4' },
    })
    expect(oneMinute).not.toHaveBeenCalled()
    expect(oneHour).toHaveBeenCalledWith({
      time: 60,
      open: 1.5,
      high: 3,
      low: 1,
      close: 2,
      volume: 4,
    })
  })

  it('reports connection status', () => {
    const source = makeSource()
    const statuses: ConnectionStatus[] = []
    source.onStatus((s) => statuses.push(s))
    source.connect()
    FakeSocket.last.serverOpen()
    source.disconnect()
    expect(statuses).toEqual(['idle', 'connecting', 'open', 'closed'])
  })

  it('ignores errors and malformed messages', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const source = makeSource()
    const listener = vi.fn()
    source.subscribeTicker('NOPE_USDT', listener)
    const socket = FakeSocket.last
    socket.serverOpen()
    socket.onmessage?.(new MessageEvent('message', { data: 'not json' }))
    socket.serverMessage({
      channel: 'spot.tickers',
      event: 'subscribe',
      error: { code: 2, message: 'unknown currency pair' },
    })
    expect(listener).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('GateSource REST', () => {
  it('builds the URL and parses candles in time order', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([
        ['120', '0', '3', '3', '3', '3', '1', 'false'],
        ['60', '0', '2', '2', '2', '2', '1', 'true'],
      ]),
    )
    const candles = await makeSource(fetchImpl).fetchCandles('BTC_USDT', '1m', 2)

    const url = fetchImpl.mock.calls[0]?.[0] as URL
    expect(url.toString()).toBe(
      'https://api.test/api/v4/spot/candlesticks?currency_pair=BTC_USDT&interval=1m&limit=2',
    )
    expect(candles.map((c) => c.time)).toEqual([60, 120])
  })

  it('throws on HTTP errors', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429 }))
    await expect(makeSource(fetchImpl).fetchTrades('BTC_USDT', 10)).rejects.toThrow('429')
  })

  it('skips symbols that fail when loading tickers', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([tickerUpdate('BTC_USDT', '1').result]))
      .mockResolvedValueOnce(new Response('', { status: 400 }))
    const tickers = await makeSource(fetchImpl).fetchTickers(['BTC_USDT', 'BAD_USDT'])
    expect(tickers.map((t) => t.symbol)).toEqual(['BTC_USDT'])
  })
})
