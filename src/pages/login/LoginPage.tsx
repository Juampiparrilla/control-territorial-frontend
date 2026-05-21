import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { loginUser } from '../../api/auth'
import { isAuthenticated } from '../../lib/authStorage'
import { sanitizePassword } from '../../features/personas/utils/sanitizers'
import { sanitizeUsername } from '../../shared/utils/username'
import './LoginPage.css'

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')
}

export default function LoginPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!username || !password) {
      setError('Completá usuario y contraseña')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await loginUser(username, password)
      if (!result.ok) {
        if (result.status === 401) {
          setError('Usuario o contraseña incorrectos')
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
        <p className="login-subtitle">Ingresá con tu usuario y contraseña</p>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          {error ? (
            <div className="login-error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="login-field">
            <label htmlFor="login-username">Usuario</label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
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
        <p className="login-hint">Si migraste desde una versión anterior, tu usuario puede ser tu DNI (solo números).</p>
      </div>
    </div>
  )
}
