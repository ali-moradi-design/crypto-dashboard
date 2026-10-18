import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler } from 'react'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'

import { makeStore } from '@/app/store/store'
import { symbolsSet } from '@/entities/pair'
import { tickersUpdated } from '@/entities/ticker'
import { makeTicker } from '@/shared/lib/test/fake-market-data'

import { MarketRow } from './MarketRow'
import { MarketTable } from './MarketTable'

function storeWithMarkets() {
  const store = makeStore()
  store.dispatch(symbolsSet(['BTC_USDT', 'ETH_USDT', 'SOL_USDT']))
  store.dispatch(
    tickersUpdated([
      makeTicker('BTC_USDT', 81000, { changePercent: -0.5 }),
      makeTicker('ETH_USDT', 2500, { changePercent: 4 }),
      makeTicker('SOL_USDT', 190, { changePercent: 2 }),
    ]),
  )
  return store
}

describe('MarketRow rendering', () => {
  it('re-renders only the row whose ticker changed', () => {
    const store = storeWithMarkets()
    const renders: Record<string, number> = {}
    const count = (id: string) => {
      renders[id] = (renders[id] ?? 0) + 1
    }

    render(
      <Provider store={store}>
        <table>
          <tbody>
            {['BTC_USDT', 'ETH_USDT', 'SOL_USDT'].map((s) => (
              <Profiler key={s} id={s} onRender={count}>
                <MarketRow symbol={s} />
              </Profiler>
            ))}
          </tbody>
        </table>
      </Provider>,
    )
    const initial = { ...renders }

    act(() => {
      store.dispatch(tickersUpdated([makeTicker('BTC_USDT', 81005, { changePercent: -0.5 })]))
    })
    expect(renders.BTC_USDT).toBe((initial.BTC_USDT ?? 0) + 1)
    expect(renders.ETH_USDT).toBe(initial.ETH_USDT)
    expect(renders.SOL_USDT).toBe(initial.SOL_USDT)

    // Same values again: no render at all.
    act(() => {
      store.dispatch(tickersUpdated([makeTicker('BTC_USDT', 81005, { changePercent: -0.5 })]))
    })
    expect(renders.BTC_USDT).toBe((initial.BTC_USDT ?? 0) + 1)
  })

  it('tints the price green when it goes up and red when it goes down', () => {
    const store = storeWithMarkets()
    render(
      <Provider store={store}>
        <table>
          <tbody>
            <MarketRow symbol="BTC_USDT" />
          </tbody>
        </table>
      </Provider>,
    )
    const price = screen.getByText('81,000.00')
    act(() => {
      store.dispatch(tickersUpdated([makeTicker('BTC_USDT', 81010)]))
    })
    expect(price.dataset.flash).toBe('up-a')
    act(() => {
      store.dispatch(tickersUpdated([makeTicker('BTC_USDT', 81000)]))
    })
    expect(price.dataset.flash).toBe('down-b')
  })
})

describe('MarketTable', () => {
  it('shows price, change with an arrow, and sorts by change', async () => {
    render(
      <Provider store={storeWithMarkets()}>
        <MarketTable />
      </Provider>,
    )
    const btc = screen.getByRole('row', { name: /BTC\/USDT/ })
    expect(within(btc).getByText('81,000.00')).toBeInTheDocument()
    expect(within(btc).getByText('▼')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /sort by 24h/i }))
    const names = screen
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent.replace(/Vol.*/, ''))
    expect(names).toEqual(['ETH/USDT', 'SOL/USDT', 'BTC/USDT'])
  })

  it('filters by search and favorites', async () => {
    render(
      <Provider store={storeWithMarkets()}>
        <MarketTable />
      </Provider>,
    )
    await userEvent.type(screen.getByRole('searchbox', { name: /search pairs/i }), 'sol')
    expect(screen.getAllByRole('rowheader')).toHaveLength(1)
    await userEvent.clear(screen.getByRole('searchbox'))

    await userEvent.click(screen.getByRole('button', { name: /favorite eth\/usdt/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Favorites' }))
    expect(screen.getAllByRole('rowheader').map((c) => c.textContent)).toEqual([
      expect.stringContaining('ETH/USDT'),
    ])
    expect(localStorage.getItem('cd.favorites')).toBe('["ETH_USDT"]')
  })
})
