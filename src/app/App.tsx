import { DashboardPage } from '@/pages/dashboard'
import type { MarketDataSource } from '@/shared/api/market-data'

import { AppFooter } from './layout/AppFooter'
import { AppHeader } from './layout/AppHeader'
import { MarketDataRoot } from './providers/MarketDataRoot'
import { StoreProvider } from './providers/StoreProvider'

export function App({ createSource }: { createSource?: () => MarketDataSource }) {
  return (
    <StoreProvider>
      <MarketDataRoot {...(createSource ? { createSource } : {})}>
        <div className="flex min-h-dvh flex-col">
          <AppHeader />
          <DashboardPage />
          <AppFooter />
        </div>
      </MarketDataRoot>
    </StoreProvider>
  )
}
