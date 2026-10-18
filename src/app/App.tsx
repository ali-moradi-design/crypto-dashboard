import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { DashboardPage } from '@/pages/dashboard'
import type { MarketDataSource } from '@/shared/api/market-data'
import { DEFAULT_LOCALE } from '@/shared/config/i18n'
import { DEFAULT_SYMBOL } from '@/shared/config/markets'

import { AppLayout } from './layout/AppLayout'
import { MarketDataRoot } from './providers/MarketDataRoot'
import { StoreProvider } from './providers/StoreProvider'

export function App({ createSource }: { createSource?: () => MarketDataSource }) {
  return (
    <StoreProvider>
      <MarketDataRoot {...(createSource ? { createSource } : {})}>
        <BrowserRouter>
          <Routes>
            <Route path="/:lang" element={<AppLayout />}>
              <Route index element={<Navigate to={DEFAULT_SYMBOL} replace />} />
              <Route path=":pair" element={<DashboardPage />} />
            </Route>
            <Route
              path="*"
              element={<Navigate to={`/${DEFAULT_LOCALE}/${DEFAULT_SYMBOL}`} replace />}
            />
          </Routes>
        </BrowserRouter>
      </MarketDataRoot>
    </StoreProvider>
  )
}
