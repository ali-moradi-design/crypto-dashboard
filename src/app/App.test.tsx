import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { FakeMarketData } from '@/shared/lib/test/fake-market-data'

import { App } from './App'

const createSource = () => new FakeMarketData()

describe('App', () => {
  it('shows the "not financial advice" note', () => {
    render(<App createSource={createSource} />)
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument()
  })

  it('switches between dark and light theme and remembers the choice', async () => {
    document.documentElement.classList.add('dark')
    render(<App createSource={createSource} />)

    await userEvent.click(screen.getByRole('button', { name: /light theme/i }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('cd.theme')).toBe('"light"')

    await userEvent.click(screen.getByRole('button', { name: /dark theme/i }))
    expect(document.documentElement).toHaveClass('dark')
  })
})
