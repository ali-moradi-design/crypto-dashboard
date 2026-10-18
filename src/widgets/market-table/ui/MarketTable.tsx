import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'

import type { MarketSymbol } from '@/shared/api/market-data'
import { useTranslation } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

import {
  selectVisibleSymbols,
  type ListFilter,
  type SortKey,
  type SortState,
  type VisibleOptions,
} from '../model/visible-symbols'
import { MarketRow } from './MarketRow'

type State = Parameters<typeof selectVisibleSymbols>[0]

interface MarketTableProps {
  selectedSymbol?: MarketSymbol
  onSelect?: (symbol: MarketSymbol) => void
  locale?: string
}

const DEFAULT_SORT: SortState = { key: 'default', direction: 'desc' }

export function MarketTable({ selectedSymbol, onSelect, locale }: MarketTableProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ListFilter>('all')
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  // Stable object while the inputs stay the same (memoized by React Compiler).
  const options: VisibleOptions = { query, sort, filter }
  const symbols = useSelector((s: State) => selectVisibleSymbols(s, options))

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: key === 'symbol' ? 'asc' : 'desc' }
      if (current.direction === (key === 'symbol' ? 'asc' : 'desc')) {
        return { key, direction: key === 'symbol' ? 'desc' : 'asc' }
      }
      return DEFAULT_SORT
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b p-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
            placeholder={t('markets.search')}
            aria-label={t('markets.search')}
            className="h-8 ps-8"
          />
        </div>
        <div role="group" aria-label={t('markets.filter')} className="flex gap-1 text-xs">
          {(['all', 'favorites'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f)
              }}
              className={cn(
                'rounded-md px-2 py-1 text-muted-foreground hover:text-foreground',
                filter === f && 'bg-muted font-medium text-foreground',
              )}
            >
              {f === 'all' ? t('markets.all') : t('markets.favorites')}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed">
          <caption className="sr-only">{t('panels.markets')}</caption>
          <colgroup>
            <col className="w-7" />
            <col />
            <col className="hidden w-16 sm:table-column lg:hidden xl:table-column" />
            <col className="w-[6.5rem]" />
            <col className="w-[5.25rem]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col">
                <span className="sr-only">{t('markets.favorites')}</span>
              </th>
              <th scope="col" className="py-1.5 text-start font-normal whitespace-nowrap">
                <SortButton
                  label={t('markets.pair')}
                  sortKey="symbol"
                  sort={sort}
                  onSort={toggleSort}
                />
                <span aria-hidden className="mx-1">
                  /
                </span>
                <SortButton
                  label={t('markets.vol')}
                  sortKey="volume"
                  sort={sort}
                  onSort={toggleSort}
                />
              </th>
              <th scope="col" className="hidden sm:table-cell lg:hidden xl:table-cell">
                <span className="sr-only">{t('markets.last24h')}</span>
              </th>
              <SortHeader
                label={t('markets.price')}
                sortKey="price"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader
                label={t('markets.change')}
                sortKey="change"
                sort={sort}
                onSort={toggleSort}
              />
            </tr>
          </thead>
          <tbody>
            {symbols.map((symbol) => (
              <MarketRow
                key={symbol}
                symbol={symbol}
                selected={symbol === selectedSymbol}
                {...(onSelect ? { onSelect } : {})}
                {...(locale ? { locale } : {})}
              />
            ))}
          </tbody>
        </table>
        {symbols.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {filter === 'favorites' && query === ''
              ? t('markets.noFavorites')
              : t('markets.noResults')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function SortButton({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  onSort: (key: SortKey) => void
}) {
  const { t } = useTranslation()
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
  const state = active
    ? `, ${sort.direction === 'asc' ? t('markets.sortedAsc') : t('markets.sortedDesc')}`
    : ''
  return (
    <button
      type="button"
      aria-label={`${t('markets.sortBy', { column: label })}${state}`}
      onClick={() => {
        onSort(sortKey)
      }}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground',
        active && 'text-foreground',
      )}
    >
      {label}
      <Icon aria-hidden className="size-3" />
    </button>
  )
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'end',
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  onSort: (key: SortKey) => void
  align?: 'start' | 'end'
}) {
  const active = sort.key === sortKey
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('py-1.5 font-normal', align === 'end' ? 'pe-2 text-end' : 'text-start')}
    >
      <SortButton label={label} sortKey={sortKey} sort={sort} onSort={onSort} />
    </th>
  )
}
