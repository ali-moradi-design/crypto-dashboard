import { createSelector } from '@reduxjs/toolkit'
import { Bell, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'

import { selectPair, splitSymbol } from '@/entities/pair'
import { selectTicker } from '@/entities/ticker'
import type { MarketSymbol } from '@/shared/api/market-data'
import { formatPrice, guessPrecision, parseLocaleNumber } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import { alertAdded, alertRemoved, selectAlerts } from '../model/alerts-slice'

type State = Parameters<typeof selectAlerts>[0] &
  Parameters<typeof selectTicker>[0] &
  Parameters<typeof selectPair>[0]

const selectAlertsFor = createSelector(
  [selectAlerts, (_s: unknown, symbol: MarketSymbol) => symbol],
  (alerts, symbol) => alerts.filter((a) => a.symbol === symbol),
)

/** Bell with a badge; the popover lets the user add and remove alerts. */
export function PriceAlertsButton({ symbol, locale }: { symbol: MarketSymbol; locale: string }) {
  const { t } = useTranslation()
  const count = useSelector((s: State) => selectAlertsFor(s, symbol).length)
  const { base, quote } = splitSymbol(symbol)
  const label = t('alerts.open', { pair: `${base}/${quote}` })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={label} title={label} className="relative">
          <Bell />
          <span className="max-sm:sr-only">{t('alerts.title')}</span>
          {count > 0 ? (
            <span className="tabular -mt-2 -me-2 ms-0.5 rounded-full bg-primary px-1.5 text-[0.65rem] text-primary-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {/* Mounted only while open, so the live price does not re-render the page. */}
        <AlertsPanel symbol={symbol} locale={locale} />
      </PopoverContent>
    </Popover>
  )
}

function AlertsPanel({ symbol, locale }: { symbol: MarketSymbol; locale: string }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useStore<State>()
  const alerts = useSelector((s: State) => selectAlertsFor(s, symbol))
  const last = useSelector((s: State) => selectTicker(s, symbol)?.last)
  const pricePrecision = useSelector((s: State) => selectPair(s, symbol)?.pricePrecision)
  const precision = pricePrecision ?? guessPrecision(last ?? 0)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(() => notificationPermission() === 'denied')
  const { base, quote } = splitSymbol(symbol)
  const fmt = (n: number) => formatPrice(n, precision, locale)

  const submit = async () => {
    const price = parseLocaleNumber(value, locale)
    const current = selectTicker(store.getState(), symbol)?.last
    if (!Number.isFinite(price) || price <= 0) {
      setError(t('alerts.invalid'))
      return
    }
    setError(null)
    dispatch(alertAdded({ symbol, price, currentPrice: current ?? price }))
    setValue('')
    const permission = await requestNotificationPermission()
    setDenied(permission === 'denied')
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <h3 className="font-medium">
          {t('alerts.title')} · <bdi>{`${base}/${quote}`}</bdi>
        </h3>
        {last !== undefined ? (
          <p className="tabular text-xs text-muted-foreground">
            {t('alerts.current', { price: fmt(last) })}
          </p>
        ) : null}
      </div>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label htmlFor="alert-price" className="text-xs text-muted-foreground">
          {t('alerts.target', { asset: quote })}
        </label>
        <div className="flex gap-2">
          <Input
            id="alert-price"
            inputMode="decimal"
            autoComplete="off"
            dir="ltr"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'alert-error' : undefined}
            className="tabular h-8"
          />
          <Button type="submit" size="sm" className="h-8">
            {t('alerts.add')}
          </Button>
        </div>
        {error ? (
          <p id="alert-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>

      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('alerts.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-2 py-1">
              <span className="text-xs">
                <span className={a.direction === 'above' ? 'text-up' : 'text-down'} aria-hidden>
                  {a.direction === 'above' ? '▲' : '▼'}{' '}
                </span>
                {a.direction === 'above' ? t('alerts.above') : t('alerts.below')}{' '}
                <bdi className="tabular font-medium">{fmt(a.price)}</bdi>
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('alerts.remove', { price: fmt(a.price) })}
                onClick={() => dispatch(alertRemoved(a.id))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {denied ? <p className="text-xs text-amber-500">{t('alerts.permissionDenied')}</p> : null}
      <p className="text-xs text-muted-foreground">{t('alerts.hint')}</p>
    </div>
  )
}
