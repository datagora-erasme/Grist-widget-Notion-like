import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppGalerie from './AppGalerie.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppGalerie />
  </StrictMode>,
)
