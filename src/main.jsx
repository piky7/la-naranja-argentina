import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// La PWA comprueba nuevas versiones al iniciarse y al volver al primer plano.
// vite-plugin-pwa gestiona la activación y la recarga de la versión nueva.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    let checking = false
    const checkForUpdates = async () => {
      if (checking || !navigator.onLine) return
      checking = true
      try {
        await registration.update()
      } catch (error) {
        console.warn('No se pudo comprobar la actualización de LNA:', error)
      } finally {
        checking = false
      }
    }

    void checkForUpdates()
    window.addEventListener('focus', checkForUpdates)
    window.addEventListener('online', checkForUpdates)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdates()
    })
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
