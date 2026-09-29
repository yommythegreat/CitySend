import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/geist/latin-400.css'
import '@fontsource/geist/latin-500.css'
import '@fontsource/geist/latin-600.css'
import '@fontsource/geist/latin-700.css'
import '@fontsource/geist-mono/latin-400.css'
import '@fontsource/geist-mono/latin-500.css'
import './index.css'
import App from './App'
import { setupCapacitor } from './lib/capacitor'
import { applyTheme, computeTheme } from './lib/theme'

// Apply night mode before the first paint so there's no light flash.
applyTheme(computeTheme())

// Initialise Capacitor native integrations (no-op on web)
setupCapacitor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
