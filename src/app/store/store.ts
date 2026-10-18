import { combineSlices, configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'

import { connectionSlice } from '@/entities/connection'
import { orderBookSlice } from '@/entities/order-book'
import { pairsSlice, splitSymbol } from '@/entities/pair'
import { tickersSlice } from '@/entities/ticker'
import { tradesSlice } from '@/entities/trade'
import {
  alertAdded,
  alertRemoved,
  alertsSlice,
  alertsTriggered,
  findTriggered,
  saveAlerts,
  showNotification,
} from '@/features/price-alerts'
import { digitsChanged, digitsSlice, saveDigits } from '@/features/switch-digits'
import { applyTheme, themeChanged, themeSlice } from '@/features/switch-theme'
import { favoritesSlice, favoriteToggled, saveFavorites } from '@/features/toggle-favorite'
import { isLocale } from '@/shared/config/i18n'
import { formatPrice, guessPrecision } from '@/shared/lib/format'
import { formatLocale, i18n } from '@/shared/lib/i18n'

const rootReducer = combineSlices(
  themeSlice,
  pairsSlice,
  tickersSlice,
  orderBookSlice,
  tradesSlice,
  connectionSlice,
  favoritesSlice,
  digitsSlice,
  alertsSlice,
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

  // Price alerts: check every frame's tickers, fire once, then remove.
  listener.startListening({
    actionCreator: tickersSlice.actions.tickersUpdated,
    effect: (action, api) => {
      const state = api.getState() as RootState
      const hits = findTriggered(state.alerts.items, action.payload)
      if (hits.length > 0) api.dispatch(alertsTriggered(hits))
    },
  })

  listener.startListening({
    actionCreator: alertsTriggered,
    effect: (action, api) => {
      const state = api.getState() as RootState
      const locale = formatLocale(
        isLocale(i18n.language) ? i18n.language : 'en',
        state.digits.digits,
      )
      for (const alert of action.payload) {
        const { base, quote } = splitSymbol(alert.symbol)
        const precision =
          state.pairs.bySymbol[alert.symbol]?.pricePrecision ?? guessPrecision(alert.price)
        showNotification(
          i18n.t('alerts.notifyTitle', {
            pair: `${base}/${quote}`,
            price: formatPrice(alert.price, precision, locale),
          }),
          i18n.t('alerts.notifyBody'),
          alert.id,
        )
      }
    },
  })

  listener.startListening({
    matcher: isAnyOf(alertAdded, alertRemoved, alertsTriggered),
    effect: (_action, api) => {
      saveAlerts((api.getState() as RootState).alerts.items)
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
