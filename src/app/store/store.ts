import { combineSlices, configureStore, createListenerMiddleware } from '@reduxjs/toolkit'

import { connectionSlice } from '@/entities/connection'
import { pairsSlice } from '@/entities/pair'
import { tickersSlice } from '@/entities/ticker'
import { applyTheme, themeChanged, themeSlice } from '@/features/switch-theme'
import { favoritesSlice, favoriteToggled, saveFavorites } from '@/features/toggle-favorite'

const rootReducer = combineSlices(
  themeSlice,
  pairsSlice,
  tickersSlice,
  connectionSlice,
  favoritesSlice,
)

export type RootState = ReturnType<typeof rootReducer>

/** High-frequency actions hidden from Redux DevTools so it stays usable. */
export const NOISY_ACTIONS = [tickersSlice.actions.tickersUpdated.type]

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
        immutableCheck: { ignoredPaths: ['tickers'] },
        serializableCheck: { ignoredPaths: ['tickers'] },
      }).prepend(listener.middleware),
    devTools: { actionsDenylist: NOISY_ACTIONS, maxAge: 100 },
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
