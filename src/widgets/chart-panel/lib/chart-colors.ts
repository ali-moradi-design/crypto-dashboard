export interface ChartColors {
  background: string
  text: string
  grid: string
  border: string
  up: string
  down: string
  upVolume: string
  downVolume: string
}

/** Reads the chart colors from the CSS tokens of the current theme. */
export function readChartColors(root: HTMLElement = document.documentElement): ChartColors {
  const css = getComputedStyle(root)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  const up = v('--chart-up', '#17a58c')
  const down = v('--chart-down', '#e5484d')
  return {
    background: v('--card', '#141e2c'),
    text: v('--muted-foreground', '#8b9bb0'),
    grid: v('--chart-grid', '#1b2738'),
    border: v('--border', '#233149'),
    up,
    down,
    upVolume: withAlpha(up, 0.45),
    downVolume: withAlpha(down, 0.45),
  }
}

/** "#17a58c" + 0.45 → "rgba(23, 165, 140, 0.45)" */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m?.[1]) return hex
  const n = Number.parseInt(m[1], 16)
  return `rgba(${String((n >> 16) & 255)}, ${String((n >> 8) & 255)}, ${String(n & 255)}, ${String(alpha)})`
}
