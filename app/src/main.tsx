import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled into the app) — no Google Fonts round-trip on
// launch, correct text on first paint, works offline. Latin subset, only the
// weights the UI actually uses.
import '@fontsource/geist/latin-300.css'
import '@fontsource/geist/latin-400.css'
import '@fontsource/geist/latin-500.css'
import '@fontsource/geist/latin-600.css'
import '@fontsource/geist/latin-700.css'
import '@fontsource/geist-mono/latin-400.css'
import '@fontsource/geist-mono/latin-500.css'
import '@fontsource/geist-mono/latin-600.css'
import './styles/global.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setupCapacitor } from './lib/capacitor'

// Initialise Capacitor native integrations (no-op on web)
setupCapacitor()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found in DOM')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Catches deferred full-page screens (legal, password reset) rendered
          outside the phone shell's own Suspense boundary. */}
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
