import { storage } from '@/shared/lib/storage'

import { THEME_STORAGE_KEY, type Theme } from './theme-slice'

/** Side effect of a theme change: update <html> and remember the choice. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
  storage.set(THEME_STORAGE_KEY, theme)
}
