import { describe, expect, it } from 'vitest'

import {
  formatCompact,
  formatPercent,
  formatPrice,
  formatSize,
  guessPrecision,
  numberFormat,
} from './number'

describe('number formatting', () => {
  it('formats prices with a fixed precision', () => {
    expect(formatPrice(81139, 1)).toBe('81,139.0')
    expect(formatPrice(0.000004123, 9)).toBe('0.000004123')
  })

  it('formats signed percentages', () => {
    expect(formatPercent(2.345)).toBe('+2.35%')
    expect(formatPercent(-0.29)).toBe('-0.29%')
    expect(formatPercent(0)).toBe('0.00%')
  })

  it('formats compact volumes', () => {
    expect(formatCompact(382_958_286)).toBe('382.96M')
    expect(formatCompact(1_250)).toBe('1.25K')
  })

  it('supports other locales and digits', () => {
    expect(formatPrice(1234.5, 1, 'fa')).toBe('۱٬۲۳۴٫۵')
    expect(formatPrice(1234.5, 1, 'tr')).toBe('1.234,5')
  })

  it('reuses formatters', () => {
    expect(numberFormat('en', { maximumFractionDigits: 2 })).toBe(
      numberFormat('en', { maximumFractionDigits: 2 }),
    )
  })

  it('guesses a precision from the price', () => {
    expect(guessPrecision(81000)).toBe(2)
    expect(guessPrecision(2.5)).toBe(4)
    expect(guessPrecision(0.0123)).toBe(5)
    expect(guessPrecision(0.000004123)).toBe(9)
  })

  it('formats sizes compactly from one million', () => {
    expect(formatSize(0.012345, 6)).toBe('0.012345')
    expect(formatSize(999_999, 0)).toBe('999,999')
    expect(formatSize(10_341_349_338, 0)).toBe('10.34B')
  })
})
