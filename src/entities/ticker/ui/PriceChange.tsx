import { formatPercent } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

/** 24h change with color AND an arrow (never color alone). */
export function PriceChange({
  value,
  locale = 'en',
  className,
}: {
  value: number
  locale?: string
  className?: string
}) {
  const up = value > 0
  const down = value < 0
  return (
    <span
      dir="ltr"
      className={cn(
        'tabular inline-flex items-center gap-0.5',
        up && 'text-up',
        down && 'text-down',
        !up && !down && 'text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden className="text-[0.7em]">
        {up ? '▲' : down ? '▼' : '•'}
      </span>
      {formatPercent(value, locale)}
    </span>
  )
}
