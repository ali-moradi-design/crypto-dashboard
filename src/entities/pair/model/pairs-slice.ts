import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { MarketSymbol, PairInfo } from '@/shared/api/market-data'

interface PairsState {
  /** Display order of the market table. */
  symbols: MarketSymbol[]
  bySymbol: Record<MarketSymbol, PairInfo>
}

const initialState: PairsState = { symbols: [], bySymbol: {} }

/** "BTC_USDT" → base "BTC", quote "USDT" (used until pair info arrives). */
export function splitSymbol(symbol: MarketSymbol): { base: string; quote: string } {
  const [base = symbol, quote = ''] = symbol.split('_')
  return { base, quote }
}

export const pairsSlice = createSlice({
  name: 'pairs',
  initialState,
  reducers: {
    symbolsSet(state, action: PayloadAction<readonly MarketSymbol[]>) {
      state.symbols = [...action.payload]
    },
    pairsLoaded(state, action: PayloadAction<PairInfo[]>) {
      for (const pair of action.payload) state.bySymbol[pair.symbol] = pair
    },
  },
  selectors: {
    selectSymbols: (state) => state.symbols,
    selectPair: (state, symbol: MarketSymbol): PairInfo | undefined => state.bySymbol[symbol],
  },
})

export const { symbolsSet, pairsLoaded } = pairsSlice.actions
export const { selectSymbols, selectPair } = pairsSlice.selectors
