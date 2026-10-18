import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { MAX_TRADES, tradesCleared, tradesLoaded, tradesReceived } from '@/entities/trade'
import { useMarketData, type MarketSymbol, type Trade } from '@/shared/api/market-data'
import { createRafBatcher } from '@/shared/lib/raf-batcher'

/** Recent trades from REST, then live trades appended once per frame. */
export function useTradesStream(symbol: MarketSymbol): void {
  const source = useMarketData()
  const dispatch = useDispatch()

  useEffect(() => {
    let cancelled = false
    let loaded = false
    const early: Trade[] = []
    dispatch(tradesCleared())

    const batcher = createRafBatcher<Trade, Trade[]>({
      merge: (batch, trade) => {
        const list = batch ?? []
        list.push(trade)
        if (list.length > MAX_TRADES) list.shift()
        return list
      },
      flush: (trades) => dispatch(tradesReceived(trades)),
    })
    const off = source.subscribeTrades(symbol, (trade) => {
      if (loaded) batcher.push(trade)
      else early.push(trade)
    })
    source
      .fetchTrades(symbol, MAX_TRADES)
      .catch(() => [] as Trade[])
      .then((trades) => {
        if (cancelled) return
        dispatch(tradesLoaded({ symbol, trades }))
        loaded = true
        if (early.length > 0) dispatch(tradesReceived(early.splice(0)))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      batcher.cancel()
      off()
    }
  }, [source, dispatch, symbol])
}
