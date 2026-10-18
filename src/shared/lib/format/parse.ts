const NATIVE_DIGITS = /[۰-۹٠-٩]/g

/**
 * Parses a number typed by the user in en ("1,234.5"), tr ("1.234,5") or
 * fa ("۱٬۲۳۴٫۵") style. Returns NaN when it is not a number.
 */
export function parseLocaleNumber(input: string, locale: string): number {
  let s = input
    .trim()
    .replace(NATIVE_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10))
    .replace(/[\s٬']/g, '')
    .replace(/٫/g, '.')

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the last one is the decimal separator.
    const decimal = lastDot > lastComma ? '.' : ','
    s = s.split(decimal === '.' ? ',' : '.').join('')
    s = s.replace(',', '.')
  } else if (lastComma !== -1) {
    // Only commas: decimal in tr, thousands in en.
    s = locale.startsWith('tr') ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if (lastDot !== -1 && locale.startsWith('tr') && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  return /^-?\d*\.?\d+$/.test(s) ? Number(s) : Number.NaN
}
