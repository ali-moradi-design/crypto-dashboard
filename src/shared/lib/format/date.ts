const cache = new Map<string, Intl.DateTimeFormat>()

export function dateFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = cache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    cache.set(key, formatter)
  }
  return formatter
}

/** "14:03:27" in the user's time zone. */
export function formatClock(ms: number, locale = 'en'): string {
  return dateFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(ms)
}

/** "17 Oct 14:03" */
export function formatDateTime(ms: number, locale = 'en'): string {
  return dateFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ms)
}
