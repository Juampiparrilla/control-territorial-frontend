const TOKEN_KEY = 'token'

export function getToken(): string | null {
  try {
    const value = localStorage.getItem(TOKEN_KEY)
    return value && value.length > 0 ? value : null
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}
