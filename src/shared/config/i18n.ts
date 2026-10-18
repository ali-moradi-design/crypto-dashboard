export const SUPPORTED_LOCALES = ['en', 'tr', 'fa'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export function isLocale(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

export const RTL_LOCALES: readonly Locale[] = ['fa']
