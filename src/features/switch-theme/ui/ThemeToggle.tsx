import { Moon, Sun } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'

import { Button } from '@/shared/ui/button'

import { selectTheme, themeChanged } from '../model/theme-slice'

export function ThemeToggle() {
  const theme = useSelector(selectTheme)
  const dispatch = useDispatch()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={next === 'dark' ? 'Switch to dark theme' : 'Switch to light theme'}
      onClick={() => dispatch(themeChanged(next))}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
