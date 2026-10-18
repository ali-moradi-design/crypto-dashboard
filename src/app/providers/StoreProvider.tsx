import { useState, type ReactNode } from 'react'
import { Provider } from 'react-redux'

import { makeStore } from '../store/store'

export function StoreProvider({ children }: { children: ReactNode }) {
  // One store per app instance (also keeps tests isolated).
  const [store] = useState(makeStore)
  return <Provider store={store}>{children}</Provider>
}
