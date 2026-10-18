import { combineSlices, configureStore, createListenerMiddleware } from '@reduxjs/toolkit'

import { connectionSlice } from '@/entities/connection'
import { orderBookSlice } from '@/entities/order-book'
import { pairsSlice } from '@/entities/pair'
import { tickersSlice } from '@/entities/ticker'
import { tradesSlice } from '@/entities/trade'
import { digitsChanged, digitsSlice, saveDigits } from '@/features/switch-digits'
import { applyTheme, themeChanged, themeSlice } from '@/features/switch-theme'
import { favoritesSlice, favoriteToggled, saveFavorites } from '@/features/toggle-favorite'

const rootReducer = combineSlices(
  themeSlice,
  pairsSlice,
  tickersSlice,
  orderBookSlice,
  tradesSlice,
  connectionSlice,
  favoritesSlice,
  digitsSlice,
)

export type RootState = ReturnType<typeof rootReducer>

/** High-frequency actions hidden from Redux DevTools so it stays usable. */
export const NOISY_ACTIONS = [
  tickersSlice.actions.tickersUpdated.type,
  orderBookSlice.actions.orderBookReplaced.type,
  tradesSlice.actions.tradesReceived.type,
]

function createListeners() {
  const listener = createListenerMiddleware()

  listener.startListening({
    actionCreator: themeChanged,
    effect: (action) => {
      applyTheme(action.payload)
    },
  })

  listener.startListening({
    actionCreator: favoriteToggled,
    effect: (_action, api) => {
      saveFavorites((api.getState() as RootState).favorites.symbols)
    },
  })

  listener.startListening({
    actionCreator: digitsChanged,
    effect: (action) => {
      saveDigits(action.payload)
    },
  })

  return listener
}

export function makeStore(preloadedState?: Partial<RootState>) {
  const listener = createListeners()
  return configureStore({
    reducer: rootReducer,
    ...(preloadedState ? { preloadedState } : {}),
    middleware: (getDefault) =>
      getDefault({
        // Market data is plain JSON; skip the dev-only deep checks on hot paths.
        immutableCheck: { ignoredPaths: ['tickers', 'orderBook', 'trades'] },
        serializableCheck: { ignoredPaths: ['tickers', 'orderBook', 'trades'] },
      }).prepend(listener.middleware),
    devTools: { actionsDenylist: NOISY_ACTIONS, maxAge: 100 },
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
