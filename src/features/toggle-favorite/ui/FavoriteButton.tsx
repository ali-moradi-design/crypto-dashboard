import { Star } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'

import type { MarketSymbol } from '@/shared/api/market-data'
import { cn } from '@/shared/lib/utils'

import { favoriteToggled, selectIsFavorite } from '../model/favorites-slice'

export function FavoriteButton({ symbol, label }: { symbol: MarketSymbol; label: string }) {
  const isFavorite = useSelector((state: Parameters<typeof selectIsFavorite>[0]) =>
    selectIsFavorite(state, symbol),
  )
  const dispatch = useDispatch()

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        dispatch(favoriteToggled(symbol))
      }}
      className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Star className={cn('size-3.5', isFavorite && 'fill-amber-400 text-amber-400')} />
    </button>
  )
}
