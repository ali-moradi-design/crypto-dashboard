import { createContext } from 'react'

import type { MarketDataSource } from './types'

/**
 * Holds the one MarketDataSource for the app. The value never changes after
 * start-up, so this context never causes re-renders.
 */
export const MarketDataContext = createContext<MarketDataSource | null>(null)
