import { Moon, Sun } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'

import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'

import { selectTheme, themeChanged } from '../model/theme-slice'

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useSelector(selectTheme)
  const dispatch = useDispatch()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={next === 'dark' ? t('theme.toDark') : t('theme.toLight')}
      onClick={() => dispatch(themeChanged(next))}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
