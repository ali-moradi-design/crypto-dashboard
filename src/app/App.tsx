import { DashboardPage } from '@/pages/dashboard'

import { AppFooter } from './layout/AppFooter'
import { AppHeader } from './layout/AppHeader'
import { StoreProvider } from './providers/StoreProvider'

export function App() {
  return (
    <StoreProvider>
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <DashboardPage />
        <AppFooter />
      </div>
    </StoreProvider>
  )
}
