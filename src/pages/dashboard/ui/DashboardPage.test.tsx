import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  it('shows the "not financial advice" note', () => {
    render(<DashboardPage />)
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument()
  })
})
