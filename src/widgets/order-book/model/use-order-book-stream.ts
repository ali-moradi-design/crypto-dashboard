import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { orderBookCleared, orderBookReplaced } from '@/entities/order-book'
import { useMarketData, type MarketSymbol, type OrderBook } from '@/shared/api/market-data'
import { createRafBatcher } from '@/shared/lib/raf-batcher'

export const BOOK_DEPTH = 20

/** REST snapshot, then live snapshots (latest per frame) into the store. */
export function useOrderBookStream(symbol: MarketSymbol): void {
  const source = useMarketData()
  const dispatch = useDispatch()

  useEffect(() => {
    let cancelled = false
    let live = false
    dispatch(orderBookCleared())
    const batcher = createRafBatcher<OrderBook, OrderBook>({
      merge: (_previous, book) => book,
      flush: (book) => dispatch(orderBookReplaced(book)),
    })
    const off = source.subscribeOrderBook(symbol, (book) => {
      live = true
      batcher.push(book)
    })
    source
      .fetchOrderBook(symbol, BOOK_DEPTH)
      .then((book) => {
        if (!cancelled && !live) dispatch(orderBookReplaced(book))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      batcher.cancel()
      off()
    }
  }, [source, dispatch, symbol])
}
