import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { loginUser } from '../../api/auth'
import { isAuthenticated } from '../../lib/authStorage'
import { sanitizeDni } from '../../shared/utils/dni'
import { sanitizePassword } from '../../features/personas/utils/sanitizers'
import './LoginPage.css'

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')
}

export default function LoginPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!dni || !password) {
      setError('Completá DNI y contraseña')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await loginUser(dni, password)
      if (!result.ok) {
        if (result.status === 401) {
          setError('DNI o contraseña incorrectos')
        } else {
          setError('No se pudo iniciar sesión')
        }
        return
      }
      navigate('/dashboard')
    } catch (err) {
      if (isNetworkError(err)) {
        setError('Error de conexión. Intentá de nuevo.')
      } else {
        setError('No se pudo iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Control Territorial</h1>
        <p className="login-subtitle">Ingresá con tu DNI y contraseña</p>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          {error ? (
            <div className="login-error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="login-field">
            <label htmlFor="login-dni">DNI</label>
            <input
              id="login-dni"
              name="dni"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="username"
              value={dni}
              onChange={(e) => setDni(sanitizeDni(e.target.value))}
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(sanitizePassword(e.target.value))}
              disabled={loading}
            />
          </div>
          <div className="login-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
