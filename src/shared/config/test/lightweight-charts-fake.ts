/* Minimal stand-in for lightweight-charts in jsdom unit tests. */
import { vi } from 'vitest'

export const ColorType = { Solid: 'solid' } as const
export const CrosshairMode = { Normal: 0 } as const
export const CandlestickSeries = { type: 'Candlestick' }
export const HistogramSeries = { type: 'Histogram' }

export interface FakeSeries {
  type: string
  data: unknown[]
  setData: (data: unknown[]) => void
  update: (bar: unknown) => void
  applyOptions: (options: unknown) => void
}

export interface FakeChart {
  series: FakeSeries[]
  applyOptions: (options: unknown) => void
  addSeries: (definition: { type: string }) => FakeSeries
  panes: () => { setStretchFactor: (n: number) => void }[]
  subscribeCrosshairMove: (handler: unknown) => void
  unsubscribeCrosshairMove: (handler: unknown) => void
  remove: () => void
}

export const charts: FakeChart[] = []

export const createChart = vi.fn((): FakeChart => {
  const chart: FakeChart = {
    series: [],
    applyOptions: vi.fn(),
    addSeries(definition) {
      const series: FakeSeries = {
        type: definition.type,
        data: [],
        setData(data) {
          series.data = [...data]
        },
        update(bar) {
          const time = (bar as { time: number }).time
          const last = series.data.at(-1) as { time: number } | undefined
          if (last?.time === time) series.data[series.data.length - 1] = bar
          else series.data.push(bar)
        },
        applyOptions: vi.fn(),
      }
      chart.series.push(series)
      return series
    },
    panes: () => [{ setStretchFactor: vi.fn() }, { setStretchFactor: vi.fn() }],
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
    remove: vi.fn(),
  }
  charts.push(chart)
  return chart
})
