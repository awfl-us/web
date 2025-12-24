import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'
import { setDefaultApiBase } from './core/public'

// Set API base at runtime: dev keeps '/api'; prod uses VITE_API_BASE
setDefaultApiBase(import.meta.env.VITE_API_BASE || '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
