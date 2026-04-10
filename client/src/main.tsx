import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProvider } from './contexts/AppContext'
import Home from './pages/Home'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <Home />
    </AppProvider>
  </StrictMode>,
)
