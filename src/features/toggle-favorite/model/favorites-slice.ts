import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { MarketSymbol } from '@/shared/api/market-data'
import { storage } from '@/shared/lib/storage'

export const FAVORITES_STORAGE_KEY = 'cd.favorites'

interface FavoritesState {
  symbols: MarketSymbol[]
}

export const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: (): FavoritesState => ({
    symbols: storage.get<MarketSymbol[]>(FAVORITES_STORAGE_KEY, []),
  }),
  reducers: {
    favoriteToggled(state, action: PayloadAction<MarketSymbol>) {
      const i = state.symbols.indexOf(action.payload)
      if (i === -1) state.symbols.push(action.payload)
      else state.symbols.splice(i, 1)
    },
  },
  selectors: {
    selectFavorites: (state) => state.symbols,
    selectIsFavorite: (state, symbol: MarketSymbol) => state.symbols.includes(symbol),
  },
})

export const { favoriteToggled } = favoritesSlice.actions
export const { selectFavorites, selectIsFavorite } = favoritesSlice.selectors

export function saveFavorites(symbols: MarketSymbol[]): void {
  storage.set(FAVORITES_STORAGE_KEY, symbols)
}
