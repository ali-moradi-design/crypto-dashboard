import '@testing-library/jest-dom/vitest'
import '@/shared/lib/i18n'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no canvas: replace the chart library with a recording fake.
// The real chart is covered by the Playwright tests.
vi.mock('lightweight-charts', async () => import('./lightweight-charts-fake'))

afterEach(() => {
  cleanup()
  localStorage.clear()
})
