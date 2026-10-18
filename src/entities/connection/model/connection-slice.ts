import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { ConnectionStatus } from '@/shared/api/market-data'

interface ConnectionState {
  status: ConnectionStatus
  /** True when the socket is open but no data arrived for a while. */
  stale: boolean
}

const initialState: ConnectionState = { status: 'idle', stale: false }

export const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    statusChanged(state, action: PayloadAction<ConnectionStatus>) {
      state.status = action.payload
      if (action.payload !== 'open') state.stale = false
    },
    staleChanged(state, action: PayloadAction<boolean>) {
      state.stale = action.payload
    },
  },
  selectors: {
    selectConnectionStatus: (state) => state.status,
    selectIsStale: (state) => state.stale,
  },
})

export const { statusChanged, staleChanged } = connectionSlice.actions
export const { selectConnectionStatus, selectIsStale } = connectionSlice.selectors
