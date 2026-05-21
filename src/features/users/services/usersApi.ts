import { apiFetch, apiJson } from '../../../lib/apiClient'
import type { CreateUserDTO, UpdateUserDTO, UserResponseDTO } from '../types'

const ROLE_BY_NAME: Record<string, UserResponseDTO['Role']> = {
  AdminSistema: 1,
  Operador: 2,
  Supervisor: 3,
  Consulta: 4,
}

function parseSystemRole(raw: unknown): UserResponseDTO['Role'] {
  if (typeof raw === 'number') return raw as UserResponseDTO['Role']
  if (typeof raw === 'string' && ROLE_BY_NAME[raw]) return ROLE_BY_NAME[raw]
  return 2
}

function mapUser(raw: Record<string, unknown>): UserResponseDTO {
  return {
    Id: Number(raw.id ?? raw.Id),
    Username: String(raw.username ?? raw.Username ?? ''),
    Role: parseSystemRole(raw.role ?? raw.Role),
    IsActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
    PersonaId: (raw.personaId ?? raw.PersonaId) as number | null | undefined,
    PersonaNombre: (raw.personaNombre ?? raw.PersonaNombre) as string | null | undefined,
    PersonaApellido: (raw.personaApellido ?? raw.PersonaApellido) as string | null | undefined,
    PersonaDni: (raw.personaDni ?? raw.PersonaDni) as string | null | undefined,
    CreatedAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
    UpdatedAt: (raw.updatedAt ?? raw.UpdatedAt) as string | null | undefined,
  }
}

export async function getUsers(): Promise<UserResponseDTO[]> {
  const data = await apiJson<Record<string, unknown>[]>('/api/users')
  return Array.isArray(data) ? data.map(mapUser) : []
}

export async function getUserById(id: number): Promise<UserResponseDTO> {
  const data = await apiJson<Record<string, unknown>>(`/api/users/${id}`)
  return mapUser(data)
}

export async function createUser(payload: CreateUserDTO): Promise<UserResponseDTO> {
  const data = await apiJson<Record<string, unknown>>('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return mapUser(data)
}

export async function updateUser(id: number, payload: UpdateUserDTO): Promise<UserResponseDTO> {
  const data = await apiJson<Record<string, unknown>>(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return mapUser(data)
}

export async function deleteUser(id: number): Promise<void> {
  const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }
}

export async function resetUserPassword(id: number, password: string): Promise<void> {
  const res = await apiFetch(`/api/users/${id}/reset-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }
}

export async function toggleUserActive(id: number): Promise<UserResponseDTO> {
  const data = await apiJson<Record<string, unknown>>(`/api/users/${id}/toggle-active`, {
    method: 'PATCH',
  })
  return mapUser(data)
}
