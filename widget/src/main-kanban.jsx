import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppKanban from './AppKanban.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppKanban />
  </StrictMode>,
)
