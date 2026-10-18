import { pairsLoaded, symbolsSet } from '@/entities/pair'
import { selectIsStale, staleChanged, statusChanged } from '@/entities/connection'
import { sparklineLoaded, tickersUpdated } from '@/entities/ticker'
import type {
  ConnectionStatus,
  MarketDataSource,
  MarketSymbol,
  Ticker,
} from '@/shared/api/market-data'
import { createRafBatcher, latestByKey } from '@/shared/lib/raf-batcher'

import type { AppStore } from '../store/store'

export interface MarketSyncOptions {
  store: AppStore
  source: MarketDataSource
  symbols: readonly MarketSymbol[]
  /** "Data is stale" after this long without a ticker, ms. */
  staleAfterMs?: number
  /** Close the socket after the tab was hidden this long, ms. */
  hiddenDisconnectMs?: number
  sparklineRefreshMs?: number
}

/**
 * Connects the market data source to the store for the market-wide data
 * (tickers, pair info, sparklines, connection health). Returns a stop function.
 */
export function startMarketSync({
  store,
  source,
  symbols,
  staleAfterMs = 10_000,
  hiddenDisconnectMs = 60_000,
  sparklineRefreshMs = 10 * 60_000,
}: MarketSyncOptions): () => void {
  const { dispatch } = store
  let stopped = false
  let status: ConnectionStatus = 'idle'
  let lastTickerAt = Date.now()

  dispatch(symbolsSet(symbols))

  // Live tickers: buffered, one dispatch per animation frame.
  const batcher = createRafBatcher<Ticker, Map<string, Ticker>>({
    merge: latestByKey((t: Ticker) => t.symbol),
    flush: (batch) => dispatch(tickersUpdated([...batch.values()])),
  })
  const unsubscribers = symbols.map((symbol) =>
    source.subscribeTicker(symbol, (ticker) => {
      lastTickerAt = Date.now()
      batcher.push(ticker)
    }),
  )

  const loadTickers = () => {
    source
      .fetchTickers(symbols)
      .then((tickers) => {
        if (!stopped) dispatch(tickersUpdated(tickers))
      })
      .catch(() => undefined)
  }
  const loadSparklines = () => {
    for (const symbol of symbols) {
      source
        .fetchCandles(symbol, '1h', 24)
        .then((candles) => {
          if (!stopped) dispatch(sparklineLoaded({ symbol, closes: candles.map((c) => c.close) }))
        })
        .catch(() => undefined)
    }
  }

  loadTickers()
  loadSparklines()
  source
    .fetchPairs(symbols)
    .then((pairs) => {
      if (!stopped) dispatch(pairsLoaded(pairs))
    })
    .catch(() => undefined)

  unsubscribers.push(
    source.onStatus((next) => {
      const reopened =
        next === 'open' && status !== 'open' && status !== 'idle' && status !== 'connecting'
      status = next
      if (next === 'open') lastTickerAt = Date.now()
      dispatch(statusChanged(next))
      // Fill the gap after a reconnect.
      if (reopened) loadTickers()
    }),
  )

  const staleTimer = setInterval(() => {
    const stale = status === 'open' && Date.now() - lastTickerAt > staleAfterMs
    if (stale !== selectIsStale(store.getState())) dispatch(staleChanged(stale))
  }, 2000)

  const sparklineTimer = setInterval(loadSparklines, sparklineRefreshMs)

  // Hidden tab: requestAnimationFrame already stops rendering; after a while
  // also close the socket to save data, and reopen it when the tab is back.
  let hiddenTimer: ReturnType<typeof setTimeout> | undefined
  let pausedByVisibility = false
  const onVisibility = () => {
    if (document.hidden) {
      hiddenTimer = setTimeout(() => {
        pausedByVisibility = true
        source.disconnect()
      }, hiddenDisconnectMs)
    } else {
      clearTimeout(hiddenTimer)
      if (pausedByVisibility) {
        pausedByVisibility = false
        source.connect()
        loadTickers()
      }
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    stopped = true
    batcher.cancel()
    for (const off of unsubscribers) off()
    clearInterval(staleTimer)
    clearInterval(sparklineTimer)
    clearTimeout(hiddenTimer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
