export type SystemRole = 1 | 2 | 3 | 4

export const SYSTEM_ROLE_OPTIONS: Array<{ value: SystemRole; label: string }> = [
  { value: 1, label: 'Admin Sistema' },
  { value: 2, label: 'Operador' },
  { value: 3, label: 'Supervisor' },
  { value: 4, label: 'Consulta' },
]

export type UserResponseDTO = {
  Id: number
  Username: string
  Role: SystemRole
  IsActive: boolean
  PersonaId?: number | null
  PersonaNombre?: string | null
  PersonaApellido?: string | null
  PersonaDni?: string | null
  CreatedAt: string
  UpdatedAt?: string | null
}

export type CreateUserDTO = {
  Username: string
  Password: string
  Role: SystemRole
  PersonaId?: number | null
  IsActive: boolean
}

export type UpdateUserDTO = {
  Username: string
  Role: SystemRole
  PersonaId?: number | null
  IsActive: boolean
}

export function systemRoleLabel(role: SystemRole): string {
  return SYSTEM_ROLE_OPTIONS.find((o) => o.value === role)?.label ?? `Rol ${role}`
}

export function personaDisplayName(user: UserResponseDTO): string {
  if (!user.PersonaId) return '—'
  const name = `${user.PersonaApellido ?? ''}, ${user.PersonaNombre ?? ''}`.trim()
  const dni = user.PersonaDni ? ` (DNI ${user.PersonaDni})` : ''
  return `${name}${dni}`.replace(/^,\s*/, '') || '—'
}
