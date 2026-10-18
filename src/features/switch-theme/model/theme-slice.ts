import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'cd.theme'

/** index.html sets the class before React starts, so read it back here. */
function initialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
}

export const themeSlice = createSlice({
  name: 'theme',
  initialState: (): ThemeState => ({ theme: initialTheme() }),
  reducers: {
    themeChanged(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
    },
  },
  selectors: {
    selectTheme: (state) => state.theme,
  },
})

export const { themeChanged } = themeSlice.actions
export const { selectTheme } = themeSlice.selectors
