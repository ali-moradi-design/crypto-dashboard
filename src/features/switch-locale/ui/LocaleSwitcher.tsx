import { useLocation, useNavigate } from 'react-router'

import { SUPPORTED_LOCALES, type Locale } from '@/shared/config/i18n'
import { useTranslation } from '@/shared/lib/i18n'

/** Changes the first URL segment (/en/BTC_USDT → /fa/BTC_USDT). */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{t('locale.label')}</span>
      <select
        value={current}
        onChange={(event) => {
          const rest = pathname.split('/').slice(2).join('/')
          void navigate(`/${event.target.value}/${rest}`)
        }}
        className="h-8 rounded-md border bg-card px-1.5 text-xs text-foreground"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {t(`locale.${l}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
