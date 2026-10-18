import { ConnectionBadge } from '@/entities/connection'
import { DigitsToggle } from '@/features/switch-digits'
import { LocaleSwitcher } from '@/features/switch-locale'
import { ThemeToggle } from '@/features/switch-theme'
import type { Locale } from '@/shared/config/i18n'
import { useTranslation } from '@/shared/lib/i18n'
import { Logo } from '@/shared/ui/logo'

export function AppHeader({ locale }: { locale: Locale }) {
  const { t } = useTranslation()
  return (
    <header className="border-b bg-card">
      <div className="flex h-12 items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Logo />
        <span className="truncate font-semibold tracking-tight">{t('app.title')}</span>
        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <ConnectionBadge />
          {locale === 'fa' ? <DigitsToggle /> : null}
          <LocaleSwitcher current={locale} />
          <ThemeToggle />
        </div>
      </div>
      <div aria-hidden className="bg-brand-gradient h-0.5" />
    </header>
  )
}
