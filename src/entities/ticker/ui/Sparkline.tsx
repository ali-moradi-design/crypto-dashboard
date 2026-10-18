interface SparklineProps {
  values: readonly number[]
  up: boolean
  width?: number
  height?: number
}

/** Tiny SVG line chart of recent closes. */
export function Sparkline({ values, up, width = 64, height = 24 }: SparklineProps) {
  if (values.length < 2) return <svg aria-hidden width={width} height={height} />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)
  const points = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`,
    )
    .join(' ')

  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${String(width)} ${String(height)}`}
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={up ? 'stroke-up' : 'stroke-down'}
      />
    </svg>
  )
}
