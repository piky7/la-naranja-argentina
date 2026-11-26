import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// La PWA comprueba nuevas versiones al iniciarse y al volver al primer plano.
// Si hay un popup o una planilla LAB abriéndose, espera a que termine antes de recargar.
let updateSW = () => Promise.resolve()
let updatePending = false
let updateObserver = null

const hasBlockingOverlay = () => Boolean(document.querySelector(
  'body.lna-stats-loading, [role="dialog"], [aria-modal="true"], .match-modal-overlay, .home-modal-overlay, .lab-match-opening'
))

const applyUpdateWhenSafe = () => {
  if (!updatePending || hasBlockingOverlay()) return
  updatePending = false
  updateObserver?.disconnect()
  updateObserver = null
  void updateSW(true)
}

updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updatePending = true
    if (hasBlockingOverlay()) {
      updateObserver = new MutationObserver(applyUpdateWhenSafe)
      updateObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'role', 'aria-modal'],
      })
      return
    }
    applyUpdateWhenSafe()
  },
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
