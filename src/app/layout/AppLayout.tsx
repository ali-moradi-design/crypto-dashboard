import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router'

import { DEFAULT_LOCALE, isLocale } from '@/shared/config/i18n'
import { DEFAULT_SYMBOL } from '@/shared/config/markets'
import { i18n, isRtl } from '@/shared/lib/i18n'

import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'

/** /:lang layout: keeps i18n, <html lang> and <html dir> in sync with the URL. */
export function AppLayout() {
  const { lang } = useParams()
  const valid = isLocale(lang)

  useEffect(() => {
    if (!valid) return
    if (i18n.language !== lang) void i18n.changeLanguage(lang)
    document.documentElement.lang = lang
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
  }, [valid, lang])

  if (!valid) return <Navigate to={`/${DEFAULT_LOCALE}/${DEFAULT_SYMBOL}`} replace />

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0">
      <AppHeader locale={lang} />
      <Outlet />
      <AppFooter />
    </div>
  )
}
