import { useId } from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * Brand mark: three rising candles (filled, hollow, accent) on the
 * teal-to-plum brand gradient. Same drawing as public/favicon.svg.
 */
export function Logo({ className }: { className?: string }) {
  const gradient = useId()
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7 shrink-0', className)}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#006466" />
          <stop offset="0.55" stopColor="#1b3a4b" />
          <stop offset="1" stopColor="#4d194d" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill={`url(#${gradient})`} />
      <g stroke="#e9fffb" strokeWidth="2" strokeLinecap="round">
        <path d="M9 13.5v13M16 8.5v15M23 4.5v13" />
      </g>
      <rect x="6.5" y="17" width="5" height="7" rx="1.2" fill="#e9fffb" />
      <rect
        x="14"
        y="12"
        width="4"
        height="7.5"
        rx="1"
        fill="#1b3a4b"
        stroke="#e9fffb"
        strokeWidth="2"
      />
      <rect x="20.5" y="6" width="5" height="8.5" rx="1.2" fill="#5eead4" />
    </svg>
  )
}
