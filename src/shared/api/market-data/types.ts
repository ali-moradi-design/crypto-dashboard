/**
 * The exchange-neutral port. The app depends only on these types; each exchange
 * adapter (today only Gate) converts its own payloads into them.
 */

/** Pair id in BASE_QUOTE form, e.g. "BTC_USDT". */
export type MarketSymbol = string

export interface PairInfo {
  symbol: MarketSymbol
  base: string
  quote: string
  /** Decimal places for prices. */
  pricePrecision: number
  /** Decimal places for amounts. */
  amountPrecision: number
}

export interface Ticker {
  symbol: MarketSymbol
  last: number
  /** 24h change in percent, e.g. -2.5 */
  changePercent: number
  high24h: number
  low24h: number
  /** 24h volume in the base asset (e.g. BTC). */
  baseVolume: number
  /** 24h volume in the quote asset (e.g. USDT). */
  quoteVolume: number
  bestBid: number
  bestAsk: number
}

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export type Interval = (typeof INTERVALS)[number]

export interface Candle {
  /** Open time, unix seconds. */
  time: number
  open: number
  high: number
  low: number
  close: number
  /** Volume in the base asset. */
  volume: number
}

/** [price, amount] */
export type BookLevel = readonly [price: number, amount: number]

export interface OrderBook {
  symbol: MarketSymbol
  /** Best (highest) bid first. */
  bids: BookLevel[]
  /** Best (lowest) ask first. */
  asks: BookLevel[]
  /** Server time, ms. */
  time: number
}

export type TradeSide = 'buy' | 'sell'

export interface Trade {
  id: string
  symbol: MarketSymbol
  price: number
  amount: number
  side: TradeSide
  /** Trade time, ms. */
  time: number
}

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

export type Unsubscribe = () => void

export interface MarketDataSource {
  fetchPairs(symbols: readonly MarketSymbol[]): Promise<PairInfo[]>
  fetchTickers(symbols: readonly MarketSymbol[]): Promise<Ticker[]>
  fetchCandles(symbol: MarketSymbol, interval: Interval, limit: number): Promise<Candle[]>
  fetchOrderBook(symbol: MarketSymbol, depth: number): Promise<OrderBook>
  fetchTrades(symbol: MarketSymbol, limit: number): Promise<Trade[]>

  subscribeTicker(symbol: MarketSymbol, onTicker: (ticker: Ticker) => void): Unsubscribe
  subscribeCandles(
    symbol: MarketSymbol,
    interval: Interval,
    onCandle: (candle: Candle) => void,
  ): Unsubscribe
  subscribeOrderBook(symbol: MarketSymbol, onBook: (book: OrderBook) => void): Unsubscribe
  subscribeTrades(symbol: MarketSymbol, onTrade: (trade: Trade) => void): Unsubscribe

  onStatus(listener: (status: ConnectionStatus) => void): Unsubscribe
  /** Open the live connection (no-op when already open). */
  connect(): void
  /** Close the live connection; subscriptions are kept and resent on connect(). */
  disconnect(): void
}
