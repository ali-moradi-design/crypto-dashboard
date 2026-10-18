import { useDispatch, useSelector } from 'react-redux'

import { useTranslation } from '@/shared/lib/i18n'

import { digitsChanged, selectDigits } from '../model/digits-slice'

/** Persian only: switch between ۱۲۳ and 123. */
export function DigitsToggle() {
  const { t } = useTranslation()
  const digits = useSelector(selectDigits)
  const dispatch = useDispatch()
  const next = digits === 'native' ? 'latin' : 'native'

  return (
    <button
      type="button"
      onClick={() => dispatch(digitsChanged(next))}
      aria-label={t(`digits.${next}`)}
      title={t(`digits.${next}`)}
      className="tabular rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {digits === 'native' ? '123' : '۱۲۳'}
    </button>
  )
}
