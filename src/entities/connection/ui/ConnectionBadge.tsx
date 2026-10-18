import { useSelector } from 'react-redux'

import { useTranslation } from '@/shared/lib/i18n'
import { cn } from '@/shared/lib/utils'

import { selectConnectionStatus, selectIsStale } from '../model/connection-slice'

export function ConnectionBadge() {
  const { t } = useTranslation()
  const status = useSelector(selectConnectionStatus)
  const stale = useSelector(selectIsStale)
  const tone = stale
    ? 'warn'
    : status === 'open'
      ? 'ok'
      : status === 'closed' || status === 'idle'
        ? 'off'
        : 'warn'

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground"
    >
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          tone === 'ok' && 'animate-pulse bg-up',
          tone === 'warn' && 'bg-amber-400',
          tone === 'off' && 'bg-muted-foreground',
        )}
      />
      <span className={cn(status === 'open' && !stale && 'max-sm:sr-only')}>
        {stale ? t('connection.stale') : t(`connection.${status}`)}
      </span>
    </span>
  )
}
