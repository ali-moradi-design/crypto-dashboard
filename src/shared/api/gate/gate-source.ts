import type {
  Candle,
  ConnectionStatus,
  Interval,
  MarketDataSource,
  MarketSymbol,
  OrderBook,
  PairInfo,
  Ticker,
  Trade,
  Unsubscribe,
} from '@/shared/api/market-data'
import { ReconnectingSocket, type SocketLike } from '@/shared/lib/ws'

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
import type {
  GatePair,
  GateRestCandle,
  GateRestOrderBook,
  GateTicker,
  GateTrade,
  GateWsCandle,
  GateWsMessage,
  GateWsOrderBook,
} from './raw-types'
import { createRestClient, type RestClient } from './rest'

/** Order book depth and update speed used for the live book. */
const BOOK_DEPTH = '20'
const BOOK_SPEED = '100ms'

interface Subscription {
  channel: string
  payload: string[]
  listeners: Set<(value: never) => void>
}

export interface GateSourceOptions {
  restUrl: string
  wsUrl: string
  fetch?: typeof fetch
  createSocket?: (url: string) => SocketLike
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

/** Gate implementation of the MarketDataSource port. */
export class GateSource implements MarketDataSource {
  private readonly rest: RestClient
  private readonly socket: ReconnectingSocket
  /** Keyed by routing key, e.g. "spot.tickers:BTC_USDT". */
  private readonly subs = new Map<string, Subscription>()
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()

  constructor(options: GateSourceOptions) {
    this.rest = createRestClient(options.restUrl, options.fetch)
    this.socket = new ReconnectingSocket({
      url: options.wsUrl,
      ...(options.createSocket ? { createSocket: options.createSocket } : {}),
      onOpen: () => {
        for (const sub of this.subs.values()) this.sendSubscribe(sub, 'subscribe')
      },
      onMessage: (data) => {
        this.route(data)
      },
      onStatus: (status) => {
        for (const listener of this.statusListeners) listener(status)
      },
      heartbeat: {
        intervalMs: 10_000,
        message: () => JSON.stringify({ time: nowSeconds(), channel: 'spot.ping' }),
      },
      staleAfterMs: 30_000,
    })
  }

  // REST

  async fetchPairs(symbols: readonly MarketSymbol[]): Promise<PairInfo[]> {
    const results = await Promise.allSettled(
      symbols.map((s) => this.rest.get<GatePair>(`/spot/currency_pairs/${s}`)),
    )
    return results.flatMap((r) => (r.status === 'fulfilled' ? [parsePair(r.value)] : []))
  }

  async fetchTickers(symbols: readonly MarketSymbol[]): Promise<Ticker[]> {
    const results = await Promise.allSettled(
      symbols.map((s) => this.rest.get<GateTicker[]>('/spot/tickers', { currency_pair: s })),
    )
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value.map(parseTicker) : []))
  }

  async fetchCandles(symbol: MarketSymbol, interval: Interval, limit: number): Promise<Candle[]> {
    const raw = await this.rest.get<GateRestCandle[]>('/spot/candlesticks', {
      currency_pair: symbol,
      interval,
      limit,
    })
    return raw.map(parseRestCandle).sort((a, b) => a.time - b.time)
  }

  async fetchOrderBook(symbol: MarketSymbol, depth: number): Promise<OrderBook> {
    const raw = await this.rest.get<GateRestOrderBook>('/spot/order_book', {
      currency_pair: symbol,
      limit: depth,
    })
    return parseRestOrderBook(symbol, raw)
  }

  async fetchTrades(symbol: MarketSymbol, limit: number): Promise<Trade[]> {
    const raw = await this.rest.get<GateTrade[]>('/spot/trades', { currency_pair: symbol, limit })
    return raw.map(parseTrade)
  }

  // WebSocket

  subscribeTicker(symbol: MarketSymbol, onTicker: (ticker: Ticker) => void): Unsubscribe {
    return this.subscribe(`spot.tickers:${symbol}`, 'spot.tickers', [symbol], onTicker)
  }

  subscribeCandles(
    symbol: MarketSymbol,
    interval: Interval,
    onCandle: (candle: Candle) => void,
  ): Unsubscribe {
    return this.subscribe(
      `spot.candlesticks:${interval}_${symbol}`,
      'spot.candlesticks',
      [interval, symbol],
      onCandle,
    )
  }

  subscribeOrderBook(symbol: MarketSymbol, onBook: (book: OrderBook) => void): Unsubscribe {
    return this.subscribe(
      `spot.order_book:${symbol}`,
      'spot.order_book',
      [symbol, BOOK_DEPTH, BOOK_SPEED],
      onBook,
    )
  }

  subscribeTrades(symbol: MarketSymbol, onTrade: (trade: Trade) => void): Unsubscribe {
    return this.subscribe(`spot.trades:${symbol}`, 'spot.trades', [symbol], onTrade)
  }

  onStatus(listener: (status: ConnectionStatus) => void): Unsubscribe {
    this.statusListeners.add(listener)
    listener(this.socket.currentStatus)
    return () => this.statusListeners.delete(listener)
  }

  connect(): void {
    this.socket.connect()
  }

  disconnect(): void {
    this.socket.disconnect()
  }

  private subscribe(
    key: string,
    channel: string,
    payload: string[],
    listener: (value: never) => void,
  ): Unsubscribe {
    let sub = this.subs.get(key)
    if (!sub) {
      sub = { channel, payload, listeners: new Set() }
      this.subs.set(key, sub)
      this.sendSubscribe(sub, 'subscribe')
    }
    const typed = listener
    sub.listeners.add(typed)
    this.socket.connect()

    return () => {
      const current = this.subs.get(key)
      if (!current) return
      current.listeners.delete(typed)
      if (current.listeners.size === 0) {
        this.subs.delete(key)
        this.sendSubscribe(current, 'unsubscribe')
      }
    }
  }

  private sendSubscribe(sub: Subscription, event: 'subscribe' | 'unsubscribe'): void {
    this.socket.send(
      JSON.stringify({ time: nowSeconds(), channel: sub.channel, event, payload: sub.payload }),
    )
  }

  private emit(key: string, value: unknown): void {
    const sub = this.subs.get(key)
    if (!sub) return
    for (const listener of sub.listeners) (listener as (v: unknown) => void)(value)
  }

  private route(data: string): void {
    let message: GateWsMessage
    try {
      message = JSON.parse(data) as GateWsMessage
    } catch {
      return
    }
    if (message.error) {
      console.warn('[gate] ws error', message.channel, message.payload, message.error.message)
      return
    }
    if (message.event !== 'update' || message.result == null) return

    switch (message.channel) {
      case 'spot.tickers': {
        const raw = message.result as GateTicker
        this.emit(`spot.tickers:${raw.currency_pair}`, parseTicker(raw))
        break
      }
      case 'spot.candlesticks': {
        const raw = message.result as GateWsCandle
        const { interval, symbol } = splitCandleName(raw.n)
        this.emit(`spot.candlesticks:${interval}_${symbol}`, parseWsCandle(raw))
        break
      }
      case 'spot.order_book': {
        const raw = message.result as GateWsOrderBook
        this.emit(`spot.order_book:${raw.s}`, parseWsOrderBook(raw))
        break
      }
      case 'spot.trades': {
        const raw = message.result as GateTrade
        this.emit(`spot.trades:${raw.currency_pair}`, parseTrade(raw))
        break
      }
    }
  }
}
