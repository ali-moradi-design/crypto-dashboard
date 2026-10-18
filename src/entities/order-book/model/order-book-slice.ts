import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { BookLevel, MarketSymbol, OrderBook } from '@/shared/api/market-data'

interface OrderBookState {
  symbol: MarketSymbol | null
  bids: BookLevel[]
  asks: BookLevel[]
}

const initialState: OrderBookState = { symbol: null, bids: [], asks: [] }

export const orderBookSlice = createSlice({
  name: 'orderBook',
  initialState,
  reducers: {
    /** Gate sends top-N snapshots; the latest one per frame replaces the book. */
    orderBookReplaced(_state, action: PayloadAction<OrderBook>): OrderBookState {
      const { symbol, bids, asks } = action.payload
      return { symbol, bids, asks }
    },
    orderBookCleared() {
      return initialState
    },
  },
  selectors: {
    selectBookSymbol: (state) => state.symbol,
    selectBids: (state) => state.bids,
    selectAsks: (state) => state.asks,
  },
})

export const { orderBookReplaced, orderBookCleared } = orderBookSlice.actions
export const { selectBookSymbol, selectBids, selectAsks } = orderBookSlice.selectors

export interface Spread {
  bestBid: number
  bestAsk: number
  value: number
  percent: number
}

export const selectSpread = createSelector(
  [selectBids, selectAsks],
  (bids, asks): Spread | null => {
    const bestBid = bids[0]?.[0]
    const bestAsk = asks[0]?.[0]
    if (bestBid === undefined || bestAsk === undefined) return null
    const value = bestAsk - bestBid
    return { bestBid, bestAsk, value, percent: (value / bestAsk) * 100 }
  },
)
