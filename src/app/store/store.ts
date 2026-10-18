import { combineSlices, configureStore, createListenerMiddleware } from '@reduxjs/toolkit'

import { applyTheme, themeChanged, themeSlice } from '@/features/switch-theme'

const rootReducer = combineSlices(themeSlice)

const listener = createListenerMiddleware()

listener.startListening({
  actionCreator: themeChanged,
  effect: (action) => {
    applyTheme(action.payload)
  },
})

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault().prepend(listener.middleware),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = AppStore['dispatch']
