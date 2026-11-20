import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/tokens.css'
import '@/styles/global.css'
import App from '@/app/App'
import { observeVitals } from '@/lib/vitals'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

observeVitals()

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
