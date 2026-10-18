import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from 'react-redux'

import { createGateSource } from '@/shared/api/gate'
import { MarketDataProvider, type MarketDataSource } from '@/shared/api/market-data'
import { DEFAULT_SYMBOLS } from '@/shared/config/markets'

import { startMarketSync } from '../model/market-sync'
import type { AppStore } from '../store/store'

export function MarketDataRoot({
  children,
  createSource = createGateSource,
}: {
  children: ReactNode
  createSource?: () => MarketDataSource
}) {
  const [source] = useState(createSource)
  const store = useStore() as AppStore

  useEffect(() => startMarketSync({ store, source, symbols: DEFAULT_SYMBOLS }), [store, source])

  return <MarketDataProvider source={source}>{children}</MarketDataProvider>
}
