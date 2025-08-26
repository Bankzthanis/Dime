import React from 'react'
import ReactDOM from 'react-dom/client'

// ใช้คอมโพเนนต์หลักเป็น DimePortfolioDashboard
import DimePortfolioDashboard from './DimePortfolioDashboard'

// CSS หลักที่เชื่อมกับ Tailwind
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DimePortfolioDashboard />
  </React.StrictMode>,
)
