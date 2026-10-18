import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { i18n } from '@/shared/lib/i18n'
import { FakeMarketData, makeTicker } from '@/shared/lib/test/fake-market-data'

import { App } from './App'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  const source = new FakeMarketData()
  source.tickers = [makeTicker('BTC_USDT', 81234.5, { changePercent: -0.5 })]
  source.pairs = [
    { symbol: 'BTC_USDT', base: 'BTC', quote: 'USDT', pricePrecision: 1, amountPrecision: 6 },
  ]
  render(<App createSource={() => source} />)
  return source
}

describe('App', () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en')
    })
    document.documentElement.dir = 'ltr'
  })

  it('redirects unknown URLs to /en/BTC_USDT and shows the disclaimer', async () => {
    renderAt('/nope')
    await waitFor(() => {
      expect(window.location.pathname).toBe('/en/BTC_USDT')
    })
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument()
  })

  it('switches between dark and light theme and remembers the choice', async () => {
    document.documentElement.classList.add('dark')
    renderAt('/en/BTC_USDT')

    await userEvent.click(screen.getByRole('button', { name: /light theme/i }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('cd.theme')).toBe('"light"')

    await userEvent.click(screen.getByRole('button', { name: /dark theme/i }))
    expect(document.documentElement).toHaveClass('dark')
  })

  it('renders Persian right-to-left with Persian digits, and can switch to Latin digits', async () => {
    renderAt('/fa/BTC_USDT')
    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl')
    })
    expect(document.documentElement.lang).toBe('fa')
    expect(await screen.findByText('این توصیهٔ مالی نیست.')).toBeInTheDocument()
    expect(await screen.findAllByText('۸۱٬۲۳۴٫۵')).not.toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'ارقام لاتین' }))
    expect(await screen.findAllByText('81,234.5')).not.toHaveLength(0)
    expect(localStorage.getItem('cd.digits')).toBe('"latin"')
  })

  it('changes the language from the switcher and keeps the pair', async () => {
    renderAt('/en/BTC_USDT')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'tr')
    await waitFor(() => {
      expect(window.location.pathname).toBe('/tr/BTC_USDT')
    })
    expect(await screen.findByText('Yatırım tavsiyesi değildir.')).toBeInTheDocument()
  })
})
