import { use } from 'react'

import { MarketDataContext } from './context'
import type { MarketDataSource } from './types'

export function useMarketData(): MarketDataSource {
  const source = use(MarketDataContext)
  if (!source) throw new Error('useMarketData must be used inside <MarketDataProvider>')
  return source
}
