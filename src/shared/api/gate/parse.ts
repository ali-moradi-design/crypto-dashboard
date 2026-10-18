import type {
  BookLevel,
  Candle,
  OrderBook,
  PairInfo,
  Ticker,
  Trade,
} from '@/shared/api/market-data'

import type {
  GateLevel,
  GatePair,
  GateRestCandle,
  GateRestOrderBook,
  GateTicker,
  GateTrade,
  GateWsCandle,
  GateWsOrderBook,
} from './raw-types'

const num = (value: string | number | undefined): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value ?? '')
  return Number.isFinite(n) ? n : 0
}

export function parsePair(raw: GatePair): PairInfo {
  return {
    symbol: raw.id,
    base: raw.base,
    quote: raw.quote,
    pricePrecision: raw.precision,
    amountPrecision: raw.amount_precision,
  }
}

export function parseTicker(raw: GateTicker): Ticker {
  return {
    symbol: raw.currency_pair,
    last: num(raw.last),
    changePercent: num(raw.change_percentage),
    high24h: num(raw.high_24h),
    low24h: num(raw.low_24h),
    baseVolume: num(raw.base_volume),
    quoteVolume: num(raw.quote_volume),
    bestBid: num(raw.highest_bid),
    bestAsk: num(raw.lowest_ask),
  }
}

export function parseRestCandle(raw: GateRestCandle): Candle {
  const [time, , close, high, low, open, baseVolume] = raw
  return {
    time: num(time),
    open: num(open),
    high: num(high),
    low: num(low),
    close: num(close),
    volume: num(baseVolume),
  }
}

export function parseWsCandle(raw: GateWsCandle): Candle {
  return {
    time: num(raw.t),
    open: num(raw.o),
    high: num(raw.h),
    low: num(raw.l),
    close: num(raw.c),
    volume: num(raw.a),
  }
}

/** "1m_BTC_USDT" → { interval: "1m", symbol: "BTC_USDT" } */
export function splitCandleName(name: string): { interval: string; symbol: string } {
  const i = name.indexOf('_')
  return { interval: name.slice(0, i), symbol: name.slice(i + 1) }
}

const levels = (raw: GateLevel[]): BookLevel[] => raw.map(([p, a]) => [num(p), num(a)] as const)

export function parseRestOrderBook(symbol: string, raw: GateRestOrderBook): OrderBook {
  return { symbol, bids: levels(raw.bids), asks: levels(raw.asks), time: raw.current }
}

export function parseWsOrderBook(raw: GateWsOrderBook): OrderBook {
  return { symbol: raw.s, bids: levels(raw.bids), asks: levels(raw.asks), time: raw.t }
}

export function parseTrade(raw: GateTrade): Trade {
  return {
    id: String(raw.id),
    symbol: raw.currency_pair,
    price: num(raw.price),
    amount: num(raw.amount),
    side: raw.side,
    time: Math.floor(num(raw.create_time_ms)),
  }
}
