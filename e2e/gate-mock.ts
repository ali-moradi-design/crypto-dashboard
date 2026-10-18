import type { Page, WebSocketRoute } from '@playwright/test'

/**
 * A fake Gate exchange for E2E tests: answers the REST endpoints and plays the
 * WebSocket server, so tests never touch the real network.
 */

export const PAIRS: Partial<Record<string, { price: number; precision: number; amount: number }>> =
  {
    BTC_USDT: { price: 81000, precision: 1, amount: 6 },
    ETH_USDT: { price: 2500, precision: 2, amount: 4 },
    SOL_USDT: { price: 190, precision: 2, amount: 3 },
    BNB_USDT: { price: 700, precision: 1, amount: 3 },
    XRP_USDT: { price: 1.27, precision: 4, amount: 1 },
    ADA_USDT: { price: 0.2161, precision: 5, amount: 0 },
    DOGE_USDT: { price: 0.0776, precision: 5, amount: 2 },
    TRX_USDT: { price: 0.3325, precision: 4, amount: 1 },
    AVAX_USDT: { price: 9.53, precision: 3, amount: 3 },
    LINK_USDT: { price: 11.75, precision: 3, amount: 2 },
    DOT_USDT: { price: 1.07, precision: 4, amount: 1 },
    LTC_USDT: { price: 58.2, precision: 2, amount: 3 },
    BCH_USDT: { price: 270.3, precision: 2, amount: 3 },
    NEAR_USDT: { price: 4.75, precision: 3, amount: 2 },
    SUI_USDT: { price: 0.96, precision: 4, amount: 2 },
    UNI_USDT: { price: 7.01, precision: 3, amount: 2 },
    AAVE_USDT: { price: 149.5, precision: 2, amount: 3 },
    PEPE_USDT: { price: 0.000003844, precision: 9, amount: 0 },
    SHIB_USDT: { price: 0.000004903, precision: 9, amount: 0 },
    XLM_USDT: { price: 0.1748, precision: 5, amount: 2 },
  }

const ticker = (pair: string, last: number, change = 1.5) => ({
  currency_pair: pair,
  last: String(last),
  change_percentage: String(change),
  high_24h: String(last * 1.02),
  low_24h: String(last * 0.97),
  base_volume: '1234.5',
  quote_volume: String(1234.5 * last),
  highest_bid: String(last),
  lowest_ask: String(last),
})

const NOW = 1_792_300_000
const candles = (price: number, interval = 3600, count = 120) =>
  Array.from({ length: count }, (_, i) => {
    const t = NOW - (count - i) * interval
    const o = price * (1 + Math.sin(i / 6) * 0.01)
    const c = price * (1 + Math.sin((i + 1) / 6) * 0.01)
    return [
      String(t),
      '1000',
      String(c),
      String(Math.max(o, c) * 1.002),
      String(Math.min(o, c) * 0.998),
      String(o),
      '12.5',
      'true',
    ]
  })

const book = (price: number) => ({
  current: Date.now(),
  update: Date.now(),
  asks: Array.from({ length: 20 }, (_, i) => [
    String(price + (i + 1) * 0.1),
    String(0.1 * (i + 1)),
  ]),
  bids: Array.from({ length: 20 }, (_, i) => [String(price - i * 0.1), String(0.2 * (i + 1))]),
})

let tradeId = 1000
const trade = (pair: string, price: number, side: 'buy' | 'sell') => ({
  id: String(++tradeId),
  create_time_ms: String(Date.now()),
  currency_pair: pair,
  side,
  amount: '0.25',
  price: String(price),
})

export interface GateMock {
  /** Send a live ticker for a pair. */
  pushTicker(pair: string, last: number, change?: number): void
  pushTrade(pair: string, price: number, side: 'buy' | 'sell'): void
  /** Drop the WebSocket from the server side. */
  dropConnection(): void
  connections(): number
  subscriptions(): string[]
}

export async function mockGate(page: Page): Promise<GateMock> {
  let socket: WebSocketRoute | null = null
  let connections = 0
  const subs = new Set<string>()

  // Never reach the real internet.
  await page.context().route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort())

  await page.context().route('https://api.gateio.ws/api/v4/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v4', '')
    const pair = url.searchParams.get('currency_pair') ?? path.split('/').pop() ?? ''
    const info = PAIRS[pair]
    if (!info) return route.fulfill({ status: 400, json: { label: 'INVALID_CURRENCY_PAIR' } })

    if (path.startsWith('/spot/currency_pairs/')) {
      const [base, quote] = pair.split('_')
      return route.fulfill({
        json: {
          id: pair,
          base,
          quote,
          precision: info.precision,
          amount_precision: info.amount,
          trade_status: 'tradable',
        },
      })
    }
    if (path === '/spot/tickers') return route.fulfill({ json: [ticker(pair, info.price)] })
    if (path === '/spot/candlesticks') {
      const interval = url.searchParams.get('interval') === '1m' ? 60 : 3600
      return route.fulfill({
        json: candles(
          info.price,
          interval,
          Number(url.searchParams.get('limit') ?? 120) > 120 ? 120 : 24,
        ),
      })
    }
    if (path === '/spot/order_book') return route.fulfill({ json: book(info.price) })
    if (path === '/spot/trades') {
      return route.fulfill({
        json: [trade(pair, info.price, 'sell'), trade(pair, info.price, 'buy')].map((t, i) => ({
          ...t,
          create_time_ms: String(Date.now() - 60_000 - i * 1000),
        })),
      })
    }
    return route.fulfill({ status: 404, json: {} })
  })

  await page.routeWebSocket('wss://api.gateio.ws/ws/v4/', (ws) => {
    socket = ws
    connections += 1
    subs.clear()
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw)) as { channel: string; event?: string; payload?: string[] }
      if (msg.channel === 'spot.ping') {
        ws.send(JSON.stringify({ channel: 'spot.pong', event: '', result: null }))
        return
      }
      const key = `${msg.channel}:${(msg.payload ?? []).join(',')}`
      if (msg.event === 'subscribe') subs.add(key)
      if (msg.event === 'unsubscribe') subs.delete(key)
      ws.send(
        JSON.stringify({ channel: msg.channel, event: msg.event, result: { status: 'success' } }),
      )
    })
  })

  const send = (channel: string, result: unknown) => {
    socket?.send(
      JSON.stringify({ time: Math.floor(Date.now() / 1000), channel, event: 'update', result }),
    )
  }

  return {
    pushTicker: (pair, last, change) => {
      send('spot.tickers', ticker(pair, last, change))
    },
    pushTrade: (pair, price, side) => {
      send('spot.trades', trade(pair, price, side))
    },
    dropConnection: () => {
      void socket?.close({ code: 4000, reason: 'test' })
    },
    connections: () => connections,
    subscriptions: () => [...subs],
  }
}
