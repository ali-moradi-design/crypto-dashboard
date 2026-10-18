import { Trans, useTranslation } from '@/shared/lib/i18n'

const link = 'underline underline-offset-2'

export function AppFooter() {
  const { t } = useTranslation()
  return (
    <footer className="border-t px-3 py-2 text-xs text-muted-foreground sm:px-4">
      <p>
        <strong className="font-medium text-foreground">{t('app.notAdvice')}</strong>{' '}
        <Trans
          i18nKey="app.dataFrom"
          components={{
            1: <a className={link} href="https://www.gate.com" target="_blank" rel="noreferrer" />,
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
    </footer>
  )
}
