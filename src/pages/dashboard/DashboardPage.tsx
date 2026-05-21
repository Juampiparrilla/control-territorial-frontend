import React from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '../../lib/authStorage'
import '../../App.css'
import PersonasPage from '../personas'

export default function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()

  function handleLogout(): void {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <main className="app">
      <div className="app-header-row">
        <h1>Control Territorial</h1>
        <button type="button" className="app-logout-btn" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
      <PersonasPage />
    </main>
  )
}
