import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Buscar versiones nuevas al iniciar, pero dejar que el Service Worker nuevo
// espere a que se cierre la sesión actual. Así no se recarga LNA mientras se usa.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration || !navigator.onLine) return

    void registration.update().catch((error) => {
      console.warn('No se pudo comprobar la actualización de LNA:', error)
    })
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
