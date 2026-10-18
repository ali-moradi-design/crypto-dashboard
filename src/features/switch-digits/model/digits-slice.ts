import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { Digits } from '@/shared/lib/i18n'
import { storage } from '@/shared/lib/storage'

export const DIGITS_STORAGE_KEY = 'cd.digits'

interface DigitsState {
  digits: Digits
}

export const digitsSlice = createSlice({
  name: 'digits',
  initialState: (): DigitsState => ({
    digits: storage.get<Digits>(DIGITS_STORAGE_KEY, 'native') === 'latin' ? 'latin' : 'native',
  }),
  reducers: {
    digitsChanged(state, action: PayloadAction<Digits>) {
      state.digits = action.payload
    },
  },
  selectors: {
    selectDigits: (state) => state.digits,
  },
})

export const { digitsChanged } = digitsSlice.actions
export const { selectDigits } = digitsSlice.selectors

export function saveDigits(digits: Digits): void {
  storage.set(DIGITS_STORAGE_KEY, digits)
}
