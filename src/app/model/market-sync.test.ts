import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeMarketData, makeTicker } from '@/shared/lib/test/fake-market-data'

import { makeStore } from '../store/store'
import { startMarketSync } from './market-sync'

describe('startMarketSync', () => {
  let frames: FrameRequestCallback[] = []

  beforeEach(() => {
    frames = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb))
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  const tick = () => {
    frames.splice(0).forEach((cb) => {
      cb(0)
    })
  }

  it('loads snapshots, then applies live tickers once per frame', async () => {
    const store = makeStore()
    const source = new FakeMarketData()
    source.tickers = [makeTicker('BTC_USDT', 1)]
    source.pairs = [
      { symbol: 'BTC_USDT', base: 'BTC', quote: 'USDT', pricePrecision: 1, amountPrecision: 6 },
    ]
    const dispatch = vi.spyOn(store, 'dispatch')

    const stop = startMarketSync({ store, source, symbols: ['BTC_USDT', 'ETH_USDT'] })
    await vi.waitFor(() => {
      expect(store.getState().pairs.bySymbol.BTC_USDT?.pricePrecision).toBe(1)
    })
    expect(store.getState().tickers.bySymbol.BTC_USDT?.last).toBe(1)

    dispatch.mockClear()
    source.emitTicker(makeTicker('BTC_USDT', 2))
    source.emitTicker(makeTicker('BTC_USDT', 3))
    source.emitTicker(makeTicker('ETH_USDT', 10))
    expect(dispatch).not.toHaveBeenCalled()

    tick()
    expect(dispatch).toHaveBeenCalledOnce()
    expect(store.getState().tickers.bySymbol.BTC_USDT?.last).toBe(3)
    expect(store.getState().tickers.bySymbol.ETH_USDT?.last).toBe(10)

    stop()
    expect(source.listenerCount('ticker:BTC_USDT')).toBe(0)
  })

  it('marks data as stale when no ticker arrives while connected', () => {
    vi.useFakeTimers()
    const store = makeStore()
    const source = new FakeMarketData()
    const stop = startMarketSync({ store, source, symbols: ['BTC_USDT'], staleAfterMs: 5000 })

    source.emitStatus('open')
    vi.advanceTimersByTime(6000)
    expect(store.getState().connection.stale).toBe(true)

    source.emitTicker(makeTicker('BTC_USDT', 1))
    vi.advanceTimersByTime(2000)
    expect(store.getState().connection.stale).toBe(false)
    stop()
  })

  it('closes the socket after the tab was hidden for a while and reopens it', () => {
    vi.useFakeTimers()
    const store = makeStore()
    const source = new FakeMarketData()
    source.connected = true
    const stop = startMarketSync({ store, source, symbols: ['BTC_USDT'], hiddenDisconnectMs: 1000 })

    const setHidden = (hidden: boolean) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
      document.dispatchEvent(new Event('visibilitychange'))
    }
    setHidden(true)
    vi.advanceTimersByTime(1000)
    expect(source.connected).toBe(false)

    setHidden(false)
    expect(source.connected).toBe(true)
    stop()
  })
})
