import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LOCALE, isLocale, RTL_LOCALES, type Locale } from '@/shared/config/i18n'

import { en } from './locales/en'
import { fa } from './locales/fa'
import { tr } from './locales/tr'

export { Trans, useTranslation } from 'react-i18next'
export type { Messages } from './locales/en'

/** Start in the URL's language so the first paint is already translated. */
function initialLocale(): Locale {
  if (typeof location === 'undefined') return DEFAULT_LOCALE
  const first = location.pathname.split('/')[1]
  return isLocale(first) ? first : DEFAULT_LOCALE
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr }, fa: { translation: fa } },
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export { i18n }

export type Digits = 'native' | 'latin'

/**
 * BCP 47 tag for Intl. Persian keeps the Gregorian calendar; digits are
 * Persian by default, Latin when the user asks for them.
 */
export function formatLocale(locale: Locale, digits: Digits = 'native'): string {
  if (locale === 'fa') return digits === 'latin' ? 'fa-u-ca-gregory-nu-latn' : 'fa-u-ca-gregory'
  return locale
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}
