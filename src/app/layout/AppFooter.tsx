import { Trans, useTranslation } from '@/shared/lib/i18n'
import { Logo } from '@/shared/ui/logo'

const link = 'underline underline-offset-2'

export function AppFooter() {
  const { t } = useTranslation()
  return (
    <footer className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground sm:px-4">
      <div>
        <p>
          <strong className="font-medium text-foreground">{t('app.notAdvice')}</strong>{' '}
          <Trans
            i18nKey="app.dataFrom"
            components={{
              1: (
                <a className={link} href="https://www.gate.com" target="_blank" rel="noreferrer" />
              ),
            }}
          />
        </p>
        <p className="mt-0.5">
          <Trans
            i18nKey="app.chartsBy"
            components={{
              1: (
                <a
                  className={link}
                  href="https://www.tradingview.com/"
                  target="_blank"
                  rel="noreferrer"
                />
              ),
            }}
          />
        </p>
      </div>
      <p className="flex items-center gap-1.5">
        <Logo className="size-4" />
        <Trans
          i18nKey="app.builtBy"
          components={{
            1: (
              <a
                className="font-medium text-foreground underline-offset-2 hover:underline"
                href="https://ali-moradi-develop.com"
                target="_blank"
                rel="author noreferrer"
              />
            ),
          }}
        />
      </p>
    </footer>
  )
}
