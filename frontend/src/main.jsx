import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { CurrencyProvider } from './context/CurrencyContext'
import App from './App.jsx'
import { installFrontendErrorMonitoring } from './utils/errorMonitoring'
import './index.css'

const apiBaseUrl = (import.meta.env.VITE_API_URL || '').trim()
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl.replace(/\/+$/, '')
}

installFrontendErrorMonitoring()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <CurrencyProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CurrencyProvider>
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('[serviceWorker]', error)
    })
  })
}
