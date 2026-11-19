import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './faceplates.css'
import './electrical.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
