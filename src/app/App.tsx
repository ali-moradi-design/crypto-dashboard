import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { DashboardPage } from '@/pages/dashboard'
import type { MarketDataSource } from '@/shared/api/market-data'
import { DEFAULT_LOCALE } from '@/shared/config/i18n'
import { DEFAULT_SYMBOL } from '@/shared/config/markets'

import { AppFooter } from './layout/AppFooter'
import { AppHeader } from './layout/AppHeader'
import { MarketDataRoot } from './providers/MarketDataRoot'
import { StoreProvider } from './providers/StoreProvider'

export function App({ createSource }: { createSource?: () => MarketDataSource }) {
  return (
    <StoreProvider>
      <MarketDataRoot {...(createSource ? { createSource } : {})}>
        <BrowserRouter>
          <div className="flex min-h-dvh flex-col">
            <AppHeader />
            <Routes>
              <Route path="/:lang/:pair?" element={<DashboardPage />} />
              <Route
                path="*"
                element={<Navigate to={`/${DEFAULT_LOCALE}/${DEFAULT_SYMBOL}`} replace />}
              />
            </Routes>
            <AppFooter />
          </div>
        </BrowserRouter>
      </MarketDataRoot>
    </StoreProvider>
  )
}
