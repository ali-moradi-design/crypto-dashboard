/**
 * Number formatting through Intl, with cached formatters (creating an
 * Intl.NumberFormat is expensive; live data formats thousands of times).
 */

const cache = new Map<string, Intl.NumberFormat>()

export function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = cache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    cache.set(key, formatter)
  }
  return formatter
}

/** Decimal places for a price when the exchange precision is unknown. */
export function guessPrecision(price: number): number {
  if (price >= 1000) return 2
  if (price >= 1) return 4
  if (price === 0) return 2
  // Keep about 4 significant digits for small prices (e.g. 0.000004123).
  return Math.min(10, Math.max(4, 3 - Math.floor(Math.log10(price))))
}

export function formatPrice(value: number, precision: number, locale = 'en'): string {
  return numberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

export function formatAmount(value: number, precision: number, locale = 'en'): string {
  return numberFormat(locale, { maximumFractionDigits: precision }).format(value)
}

/** "+2.35%" / "−0.29%": always signed, two decimals. */
export function formatPercent(value: number, locale = 'en'): string {
  return numberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
}

/** "382.96M" */
export function formatCompact(value: number, locale = 'en'): string {
  return numberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}
