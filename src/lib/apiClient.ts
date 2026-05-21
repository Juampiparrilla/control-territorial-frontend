import { clearToken, getToken } from './authStorage'
import { getApiBaseUrl } from './apiBase'

export type ApiRequestOptions = RequestInit & {
  /** Si es false, no envía Bearer (ej. login). Default: true */
  auth?: boolean
  /** Si es false, no redirige a /login en 401. Default: true */
  redirectOn401?: boolean
}

let unauthorizedHandler: (() => void) | null = null

/** Permite integrar React Router sin acoplar apiClient al router. */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

function handleUnauthorized(redirectOn401: boolean): void {
  clearToken()
  if (!redirectOn401) return
  if (unauthorizedHandler) {
    unauthorizedHandler()
    return
  }
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

function buildHeaders(init: ApiRequestOptions, auth: boolean): Headers {
  const headers = new Headers(init.headers)
  if (auth) {
    const token = getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }
  return headers
}

export async function apiFetch(path: string, init: ApiRequestOptions = {}): Promise<Response> {
  const { auth = true, redirectOn401 = true, ...fetchInit } = init
  const baseUrl = getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`

  const headers = buildHeaders(fetchInit, auth)
  const res = await fetch(url, { ...fetchInit, headers })

  if (res.status === 401 && auth) {
    handleUnauthorized(redirectOn401)
  }

  return res
}

export async function apiJson<T>(path: string, init: ApiRequestOptions = {}): Promise<T> {
  const res = await apiFetch(path, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  if (!text.trim()) {
    return undefined as T
  }
  return JSON.parse(text) as T
}
