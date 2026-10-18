import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler } from 'react'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeStore } from '@/app/store/store'
import { MarketDataProvider } from '@/shared/api/market-data'
import { charts } from '@/shared/config/test/lightweight-charts-fake'
import { FakeMarketData } from '@/shared/lib/test/fake-market-data'

import { ChartPanel } from './ChartPanel'

const candle = (time: number, close: number) => ({
  time,
  open: close - 1,
  high: close + 1,
  low: close - 2,
  close,
  volume: 5,
})

describe('ChartPanel', () => {
  let frames: FrameRequestCallback[] = []
  beforeEach(() => {
    charts.length = 0
    frames = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb))
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const tick = () => {
    act(() => {
      frames.splice(0).forEach((cb) => {
        cb(0)
      })
    })
  }

  function setup() {
    const source = new FakeMarketData()
    source.candles = [candle(60, 10), candle(120, 11)]
    const fetchCandles = vi.spyOn(source, 'fetchCandles')
    let renders = 0
    render(
      <Provider store={makeStore()}>
        <MarketDataProvider source={source}>
          <Profiler id="chart" onRender={() => (renders += 1)}>
            <ChartPanel symbol="BTC_USDT" theme="dark" />
          </Profiler>
        </MarketDataProvider>
      </Provider>,
    )
    return { source, fetchCandles, renders: () => renders }
  }

  it('loads history, then streams live candles without React renders', async () => {
    const { source, renders } = setup()
    await waitFor(() => {
      expect(screen.queryByText(/loading chart/i)).not.toBeInTheDocument()
    })
    const [candles, volume] = charts[0]?.series ?? []
    expect(candles?.data).toHaveLength(2)
    expect(volume?.data).toHaveLength(2)

    const before = renders()
    source.emitCandle('BTC_USDT', '1h', candle(120, 12)) // same bar, updated
    source.emitCandle('BTC_USDT', '1h', candle(180, 13)) // new bar
    tick()

    expect(candles?.data.map((c) => (c as { close: number }).close)).toEqual([10, 11, 13])
    expect(renders()).toBe(before)
  })

  it('refetches history when the interval changes', async () => {
    const { fetchCandles } = setup()
    await waitFor(() => {
      expect(fetchCandles).toHaveBeenCalledWith('BTC_USDT', '1h', 500)
    })
    await userEvent.click(screen.getByRole('button', { name: '5m' }))
    expect(fetchCandles).toHaveBeenLastCalledWith('BTC_USDT', '5m', 500)
    expect(localStorage.getItem('cd.interval')).toBe('"5m"')
  })
})
