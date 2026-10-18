import type { ReactNode } from 'react'

import { MarketDataContext } from './context'
import type { MarketDataSource } from './types'

export function MarketDataProvider({
  source,
  children,
}: {
  source: MarketDataSource
  children: ReactNode
}) {
  return <MarketDataContext value={source}>{children}</MarketDataContext>
}
