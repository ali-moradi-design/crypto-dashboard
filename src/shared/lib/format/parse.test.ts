import { describe, expect, it } from 'vitest'

import { parseLocaleNumber } from './parse'

describe('parseLocaleNumber', () => {
  it.each([
    ['81000', 'en', 81000],
    ['81,000.5', 'en', 81000.5],
    ['0.000004', 'en', 0.000004],
    ['81.000,5', 'tr', 81000.5],
    ['81000,5', 'tr', 81000.5],
    ['81.000', 'tr', 81000],
    ['۸۱٬۰۰۰٫۵', 'fa', 81000.5],
    ['٨١٠٠٠', 'fa', 81000],
    [' 2 500 ', 'en', 2500],
  ])('%s (%s) → %d', (input, locale, expected) => {
    expect(parseLocaleNumber(input, locale)).toBe(expected)
  })

  it.each(['', 'abc', '1.2.3x', '--1'])('rejects %j', (input) => {
    expect(parseLocaleNumber(input, 'en')).toBeNaN()
  })
})
