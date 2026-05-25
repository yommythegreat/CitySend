import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
