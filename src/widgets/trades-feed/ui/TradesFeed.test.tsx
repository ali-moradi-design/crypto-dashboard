import { act, render, screen, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeStore } from '@/app/store/store'
import { MarketDataProvider, type Trade } from '@/shared/api/market-data'
import { FakeMarketData } from '@/shared/lib/test/fake-market-data'

import { TradesFeed } from './TradesFeed'

const trade = (id: number, side: 'buy' | 'sell' = 'buy'): Trade => ({
  id: String(id),
  symbol: 'BTC_USDT',
  price: 81000 + id,
  amount: 0.5,
  side,
  time: Date.now(),
})

describe('TradesFeed', () => {
  let frames: FrameRequestCallback[] = []
  beforeEach(() => {
    frames = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb))
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  })

  it('shows history, then prepends live trades with side shown by arrow and text', async () => {
    const source = new FakeMarketData()
    source.trades = [trade(1, 'sell')]
    render(
      <Provider store={makeStore()}>
        <MarketDataProvider source={source}>
          <TradesFeed symbol="BTC_USDT" />
        </MarketDataProvider>
      </Provider>,
    )
    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(2) // header + 1
    })

    source.emitTrade(trade(2, 'buy'))
    source.emitTrade(trade(3, 'buy'))
    act(() => {
      frames.splice(0).forEach((cb) => {
        cb(0)
      })
    })
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Buy')
    expect(rows[0]).toHaveTextContent('▲')
    expect(rows[2]).toHaveTextContent('Sell')
  })

  it('renders the feed once per frame, however many trades arrive', async () => {
    const source = new FakeMarketData()
    let renders = 0
    render(
      <Provider store={makeStore()}>
        <MarketDataProvider source={source}>
          <Profiler id="feed" onRender={() => (renders += 1)}>
            <TradesFeed symbol="BTC_USDT" />
          </Profiler>
        </MarketDataProvider>
      </Provider>,
    )
    await waitFor(() => {
      expect(renders).toBeGreaterThan(0)
    })
    await act(async () => {
      await Promise.resolve()
    })
    const before = renders
    for (let i = 0; i < 30; i++) source.emitTrade(trade(i + 10))
    act(() => {
      frames.splice(0).forEach((cb) => {
        cb(0)
      })
    })
    expect(renders - before).toBe(1)
  })
})
