import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { setupCapacitor } from './lib/capacitor'

// Initialise Capacitor native integrations (no-op on web)
setupCapacitor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
