import { apiFetch } from '../lib/apiClient'
import { setToken } from '../lib/authStorage'

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; status: number }

type LoginResponseBody = {
  token?: string
  Token?: string
  expiresAtUtc?: string
  ExpiresAtUtc?: string
}

function extractToken(data: LoginResponseBody): string | undefined {
  const raw = data.token ?? data.Token
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}

export async function loginUser(dni: string, password: string): Promise<LoginResult> {
  const res = await apiFetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, password }),
    auth: false,
    redirectOn401: false,
  })

  if (res.status === 401) {
    return { ok: false, status: 401 }
  }

  if (!res.ok) {
    return { ok: false, status: res.status }
  }

  const text = await res.text()
  if (!text.trim()) {
    return { ok: false, status: 500 }
  }

  try {
    const data = JSON.parse(text) as LoginResponseBody
    const token = extractToken(data)
    if (!token) {
      return { ok: false, status: 500 }
    }
    setToken(token)
    return { ok: true, token }
  } catch {
    return { ok: false, status: 500 }
  }
}
