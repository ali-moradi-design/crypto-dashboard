import { BellRing, X } from 'lucide-react'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { splitSymbol } from '@/entities/pair'
import { formatPrice, guessPrecision } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

import { selectTriggered, triggeredDismissed, type TriggeredAlert } from '../model/alerts-slice'

const AUTO_DISMISS_MS = 10_000

/** In-page notice for triggered alerts (also works without notification permission). */
export function TriggeredAlerts({ locale }: { locale: string }) {
  const triggered = useSelector(selectTriggered)
  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-2 bottom-2 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:end-4 sm:bottom-4"
    >
      {triggered.map((a) => (
        <Notice key={a.id} alert={a} locale={locale} />
      ))}
    </div>
  )
}

function Notice({ alert, locale }: { alert: TriggeredAlert; locale: string }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { base, quote } = splitSymbol(alert.symbol)

  useEffect(() => {
    const timer = setTimeout(() => dispatch(triggeredDismissed(alert.id)), AUTO_DISMISS_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [dispatch, alert.id])

  const price = formatPrice(alert.price, guessPrecision(alert.price), locale)
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-popover p-3 text-sm shadow-lg sm:w-80"
    >
      <BellRing aria-hidden className="size-4 shrink-0 text-primary" />
      <p className="flex-1">{t('alerts.triggered', { pair: `${base}/${quote}`, price })}</p>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t('alerts.dismiss')}
        onClick={() => dispatch(triggeredDismissed(alert.id))}
      >
        <X />
      </Button>
    </div>
  )
}
