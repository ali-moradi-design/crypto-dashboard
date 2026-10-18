import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { MarketSymbol, Ticker } from '@/shared/api/market-data'

interface TickersState {
  bySymbol: Record<MarketSymbol, Ticker>
  /** Hourly closes for the last 24 h, per symbol. */
  sparklines: Record<MarketSymbol, number[]>
}

const initialState: TickersState = { bySymbol: {}, sparklines: {} }

export const tickersSlice = createSlice({
  name: 'tickers',
  initialState,
  reducers: {
    /**
     * One action per animation frame with every ticker that changed.
     * Unchanged tickers keep their object identity, so only their rows skip
     * rendering.
     */
    tickersUpdated(state, action: PayloadAction<Ticker[]>) {
      for (const ticker of action.payload) {
        const current = state.bySymbol[ticker.symbol]
        if (current && sameTicker(current, ticker)) continue
        state.bySymbol[ticker.symbol] = ticker
      }
    },
    sparklineLoaded(state, action: PayloadAction<{ symbol: MarketSymbol; closes: number[] }>) {
      state.sparklines[action.payload.symbol] = action.payload.closes
    },
  },
  selectors: {
    selectTickerMap: (state) => state.bySymbol,
    selectTicker: (state, symbol: MarketSymbol): Ticker | undefined => state.bySymbol[symbol],
    selectSparkline: (state, symbol: MarketSymbol): number[] | undefined =>
      state.sparklines[symbol],
  },
})

function sameTicker(a: Ticker, b: Ticker): boolean {
  return (
    a.last === b.last &&
    a.changePercent === b.changePercent &&
    a.quoteVolume === b.quoteVolume &&
    a.high24h === b.high24h &&
    a.low24h === b.low24h &&
    a.bestBid === b.bestBid &&
    a.bestAsk === b.bestAsk
  )
}

export const { tickersUpdated, sparklineLoaded } = tickersSlice.actions
export const { selectTickerMap, selectTicker, selectSparkline } = tickersSlice.selectors
