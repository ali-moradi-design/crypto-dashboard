import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { MarketSymbol, Trade } from '@/shared/api/market-data'

export const MAX_TRADES = 50

interface TradesState {
  symbol: MarketSymbol | null
  /** Newest first. Existing trade objects keep their identity, so old rows never re-render. */
  items: Trade[]
}

const initialState: TradesState = { symbol: null, items: [] }

export const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    tradesLoaded(state, action: PayloadAction<{ symbol: MarketSymbol; trades: Trade[] }>) {
      state.symbol = action.payload.symbol
      state.items = action.payload.trades.toSorted((a, b) => b.time - a.time).slice(0, MAX_TRADES)
    },
    /** New trades from one animation frame, any order. */
    tradesReceived(state, action: PayloadAction<Trade[]>) {
      const known = new Set(state.items.map((t) => t.id))
      const fresh = action.payload
        .filter((t) => t.symbol === state.symbol && !known.has(t.id))
        .sort((a, b) => b.time - a.time)
      if (fresh.length === 0) return
      state.items = [...fresh, ...state.items].slice(0, MAX_TRADES)
    },
    tradesCleared() {
      return initialState
    },
  },
  selectors: {
    selectTrades: (state) => state.items,
    selectTradesSymbol: (state) => state.symbol,
  },
})

export const { tradesLoaded, tradesReceived, tradesCleared } = tradesSlice.actions
export const { selectTrades, selectTradesSymbol } = tradesSlice.selectors
