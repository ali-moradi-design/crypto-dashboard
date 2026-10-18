import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

import type { MarketSymbol, Ticker } from '@/shared/api/market-data'
import { storage } from '@/shared/lib/storage'

export const ALERTS_STORAGE_KEY = 'cd.alerts'

export interface PriceAlert {
  id: string
  symbol: MarketSymbol
  price: number
  /** Fires when the price rises to (above) or falls to (below) the target. */
  direction: 'above' | 'below'
  createdAt: number
}

export interface TriggeredAlert extends PriceAlert {
  triggeredAt: number
  lastPrice: number
}

interface AlertsState {
  items: PriceAlert[]
  /** Recently triggered alerts shown on the page. */
  triggered: TriggeredAlert[]
}

export const alertsSlice = createSlice({
  name: 'alerts',
  initialState: (): AlertsState => ({
    items: storage.get<PriceAlert[]>(ALERTS_STORAGE_KEY, []).filter(isAlert),
    triggered: [],
  }),
  reducers: {
    alertAdded: {
      reducer(state, action: PayloadAction<PriceAlert>) {
        state.items.push(action.payload)
      },
      prepare(input: { symbol: MarketSymbol; price: number; currentPrice: number }) {
        return {
          payload: {
            id: nanoid(),
            symbol: input.symbol,
            price: input.price,
            direction: input.price >= input.currentPrice ? 'above' : 'below',
            createdAt: Date.now(),
          } satisfies PriceAlert,
        }
      },
    },
    alertRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((a) => a.id !== action.payload)
    },
    alertsTriggered(state, action: PayloadAction<TriggeredAlert[]>) {
      const ids = new Set(action.payload.map((a) => a.id))
      state.items = state.items.filter((a) => !ids.has(a.id))
      state.triggered = [...action.payload, ...state.triggered].slice(0, 5)
    },
    triggeredDismissed(state, action: PayloadAction<string>) {
      state.triggered = state.triggered.filter((a) => a.id !== action.payload)
    },
  },
  selectors: {
    selectAlerts: (state) => state.items,
    selectTriggered: (state) => state.triggered,
  },
})

export const { alertAdded, alertRemoved, alertsTriggered, triggeredDismissed } = alertsSlice.actions
export const { selectAlerts, selectTriggered } = alertsSlice.selectors

/** Alerts whose target was crossed by the new tickers. */
export function findTriggered(
  alerts: readonly PriceAlert[],
  tickers: readonly Ticker[],
): TriggeredAlert[] {
  if (alerts.length === 0) return []
  const last = new Map(tickers.map((t) => [t.symbol, t.last]))
  const now = Date.now()
  return alerts.flatMap((alert) => {
    const price = last.get(alert.symbol)
    if (price === undefined || price === 0) return []
    const hit = alert.direction === 'above' ? price >= alert.price : price <= alert.price
    return hit ? [{ ...alert, triggeredAt: now, lastPrice: price }] : []
  })
}

export function saveAlerts(alerts: PriceAlert[]): void {
  storage.set(ALERTS_STORAGE_KEY, alerts)
}

function isAlert(value: unknown): value is PriceAlert {
  const a = value as Partial<PriceAlert> | null
  return (
    typeof a?.id === 'string' &&
    typeof a.symbol === 'string' &&
    typeof a.price === 'number' &&
    (a.direction === 'above' || a.direction === 'below')
  )
}
