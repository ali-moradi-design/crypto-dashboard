/** Payloads as Gate sends them (API v4). Numbers arrive as strings. */

export interface GatePair {
  id: string
  base: string
  quote: string
  precision: number
  amount_precision: number
  trade_status: string
}

export interface GateTicker {
  currency_pair: string
  last: string
  change_percentage: string
  high_24h: string
  low_24h: string
  base_volume: string
  quote_volume: string
  highest_bid: string
  lowest_ask: string
}

/** REST candle: [time, quote volume, close, high, low, open, base volume, closed]. */
export type GateRestCandle = [string, string, string, string, string, string, string, string?]

export interface GateWsCandle {
  /** Open time, unix seconds. */
  t: string
  /** Quote volume. */
  v: string
  c: string
  h: string
  l: string
  o: string
  /** "<interval>_<pair>", e.g. "1m_BTC_USDT". */
  n: string
  /** Base volume. */
  a: string
}

export type GateLevel = [string, string]

export interface GateRestOrderBook {
  current: number
  asks: GateLevel[]
  bids: GateLevel[]
}

export interface GateWsOrderBook {
  t: number
  s: string
  asks: GateLevel[]
  bids: GateLevel[]
}

export interface GateTrade {
  id: string | number
  create_time_ms: string
  currency_pair: string
  side: 'buy' | 'sell'
  amount: string
  price: string
}

export interface GateWsMessage {
  channel: string
  /** "subscribe", "unsubscribe" or "update". */
  event: string
  result?: unknown
  error?: { code: number; message: string } | null
  payload?: string[]
}
