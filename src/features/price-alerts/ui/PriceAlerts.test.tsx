import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeStore } from '@/app/store/store'
import { tickersUpdated } from '@/entities/ticker'
import { makeTicker } from '@/shared/lib/test/fake-market-data'

import { PriceAlertsButton } from './PriceAlertsButton'
import { TriggeredAlerts } from './TriggeredAlerts'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- mirrors the browser API shape
class FakeNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(() => {
    FakeNotification.permission = 'granted'
    return Promise.resolve<NotificationPermission>('granted')
  })
  static shown: { title: string; body?: string }[] = []
  constructor(title: string, options?: NotificationOptions) {
    FakeNotification.shown.push({ title, ...(options?.body ? { body: options.body } : {}) })
  }
}

describe('price alerts UI', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds an alert, fires a notification and an in-page notice when crossed', async () => {
    vi.stubGlobal('Notification', FakeNotification)
    const store = makeStore()
    store.dispatch(tickersUpdated([makeTicker('BTC_USDT', 81000)]))
    render(
      <Provider store={store}>
        <PriceAlertsButton symbol="BTC_USDT" locale="en" />
        <TriggeredAlerts locale="en" />
      </Provider>,
    )

    await userEvent.click(screen.getByRole('button', { name: /price alerts for btc\/usdt/i }))
    await userEvent.type(screen.getByLabelText(/target price/i), '82,000')
    await userEvent.click(screen.getByRole('button', { name: 'Add alert' }))

    expect(await screen.findByText('Rises to')).toBeInTheDocument()
    expect(FakeNotification.requestPermission).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem('cd.alerts') ?? '[]')).toHaveLength(1)

    await act(async () => {
      store.dispatch(tickersUpdated([makeTicker('BTC_USDT', 82010)]))
      await Promise.resolve()
    })
    expect(await screen.findByText(/alert: btc\/usdt reached 82,000/i)).toBeInTheDocument()
    expect(FakeNotification.shown.at(-1)?.title).toMatch(/BTC\/USDT reached 82,000/)
    expect(store.getState().alerts.items).toHaveLength(0)
  })

  it('rejects an invalid price', async () => {
    render(
      <Provider store={makeStore()}>
        <PriceAlertsButton symbol="BTC_USDT" locale="en" />
      </Provider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /price alerts/i }))
    await userEvent.type(screen.getByLabelText(/target price/i), 'abc')
    await userEvent.click(screen.getByRole('button', { name: 'Add alert' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a price above 0.')
  })
})
