import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection:', event.reason?.message || event.reason)
  if (event.reason?.message?.includes('json') || event.reason?.message?.includes('JSON')) {
    console.error('Response error details:', event.reason)
    event.preventDefault()
  }
})

window.addEventListener('error', event => {
  if (event.message?.includes('json') || event.message?.includes('JSON')) {
    console.error('Caught JSON parse error:', event)
    event.preventDefault()
  }
})

const origFetch = window.fetch
window.fetch = function(...args) {
  return origFetch.apply(this, args).catch(err => {
    console.error(`Fetch failed for ${args[0]}:`, err.message)
    throw err
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
