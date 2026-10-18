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

type Listener<T> = (value: T) => void

/** In-memory MarketDataSource for unit tests: push data with the emit* helpers. */
export class FakeMarketData implements MarketDataSource {
  pairs: PairInfo[] = []
  tickers: Ticker[] = []
  candles: Candle[] = []
  book: OrderBook = { symbol: 'BTC_USDT', bids: [], asks: [], time: 0 }
  trades: Trade[] = []
  connected = false

  private listeners = new Map<string, Set<Listener<never>>>()
  private statusListeners = new Set<Listener<ConnectionStatus>>()

  fetchPairs = (symbols: readonly MarketSymbol[]) =>
    Promise.resolve(this.pairs.filter((p) => symbols.includes(p.symbol)))
  fetchTickers = (symbols: readonly MarketSymbol[]) =>
    Promise.resolve(this.tickers.filter((t) => symbols.includes(t.symbol)))
  fetchCandles = (_symbol: MarketSymbol, _interval: Interval, _limit: number) =>
    Promise.resolve(this.candles)
  fetchOrderBook = (_symbol: MarketSymbol, _depth: number) => Promise.resolve(this.book)
  fetchTrades = (_symbol: MarketSymbol, _limit: number) => Promise.resolve(this.trades)

  subscribeTicker = (symbol: MarketSymbol, cb: Listener<Ticker>) => this.on(`ticker:${symbol}`, cb)
  subscribeCandles = (symbol: MarketSymbol, interval: Interval, cb: Listener<Candle>) =>
    this.on(`candles:${interval}:${symbol}`, cb)
  subscribeOrderBook = (symbol: MarketSymbol, cb: Listener<OrderBook>) =>
    this.on(`book:${symbol}`, cb)
  subscribeTrades = (symbol: MarketSymbol, cb: Listener<Trade>) => this.on(`trades:${symbol}`, cb)

  onStatus = (cb: Listener<ConnectionStatus>): Unsubscribe => {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }
  connect = () => {
    this.connected = true
  }
  disconnect = () => {
    this.connected = false
  }

  // Test helpers
  emitTicker(ticker: Ticker): void {
    this.emit(`ticker:${ticker.symbol}`, ticker)
  }
  emitCandle(symbol: MarketSymbol, interval: Interval, candle: Candle): void {
    this.emit(`candles:${interval}:${symbol}`, candle)
  }
  emitBook(book: OrderBook): void {
    this.emit(`book:${book.symbol}`, book)
  }
  emitTrade(trade: Trade): void {
    this.emit(`trades:${trade.symbol}`, trade)
  }
  emitStatus(status: ConnectionStatus): void {
    for (const cb of this.statusListeners) cb(status)
  }
  listenerCount(key: string): number {
    return this.listeners.get(key)?.size ?? 0
  }

  private on(key: string, cb: Listener<never>): Unsubscribe {
    let set = this.listeners.get(key)
    if (!set) {
      set = new Set()
      this.listeners.set(key, set)
    }
    set.add(cb)
    return () => set.delete(cb)
  }

  private emit(key: string, value: unknown): void {
    for (const cb of this.listeners.get(key) ?? []) (cb as Listener<unknown>)(value)
  }
}

export function makeTicker(
  symbol: MarketSymbol,
  last: number,
  extra: Partial<Ticker> = {},
): Ticker {
  return {
    symbol,
    last,
    changePercent: 1,
    high24h: last * 1.1,
    low24h: last * 0.9,
    baseVolume: 100,
    quoteVolume: last * 100,
    bestBid: last,
    bestAsk: last,
    ...extra,
  }
}
