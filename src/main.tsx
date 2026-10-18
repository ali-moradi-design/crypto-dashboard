import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/shared/lib/i18n'

import { App } from '@/app/App'
import '@/app/styles/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
