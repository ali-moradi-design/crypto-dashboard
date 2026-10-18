import { useSelector } from 'react-redux'

import { cn } from '@/shared/lib/utils'

import { selectConnectionStatus, selectIsStale } from '../model/connection-slice'

const LABELS = {
  idle: 'Offline',
  connecting: 'Connecting',
  open: 'Live',
  reconnecting: 'Reconnecting',
  closed: 'Paused',
} as const

export function ConnectionBadge({
  labels = LABELS,
  staleLabel = 'Data is stale',
}: {
  labels?: Record<keyof typeof LABELS, string>
  staleLabel?: string
}) {
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
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
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
      {stale ? staleLabel : labels[status]}
    </span>
  )
}
