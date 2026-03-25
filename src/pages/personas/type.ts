export type PersonRole = 0 | 1 | 2 | 3 | 4 | 5

export const PERSON_ROLE_OPTIONS: Array<{ value: PersonRole; label: string }> = [
  { value: 0, label: 'Administrador' },
  { value: 1, label: 'Grupo' },
  { value: 2, label: 'Referente' },
  { value: 3, label: 'Puntero' },
  { value: 4, label: 'Votante' },
  { value: 5, label: 'Chofer' },
]

export type CreatePersonaDTO = {
  Nombre: string
  Apellido: string
  DNI: string
  Rol: PersonRole
  Telefono?: string | null
  Escuela?: string | null
  Mesa?: string | null
  LiderId?: number | null
}

export type PersonaResponseDTO = {
  Id: number
  Nombre: string
  Apellido: string
  DNI: string
  Rol: PersonRole
  Telefono?: string | null
  EscuelaId?: number | null
  EscuelaNombre?: string | null
  MesaId?: number | null
  NroMesa?: number | null
  LiderId?: number | null
  LiderNombre?: string | null
}

export type PadronRowImportDTO = {
  DNI: string
  Nombre: string
  Apellido: string
  EscuelaNombre: string
  MesaNro: number
  Orden?: string | null
}

export type PadronActiveDTO = {
  Id: number
  UploadedAtUtc: string
  FileName: string
  RowsCount: number
}

export type PadronUploadResultDTO = {
  TotalRows: number
  RowsStored: number
  PersonasUpdated: number
  DnisNotFound: string[]
}

/** Pestañas: personas por rol + Reportes (estadísticas) */
export const PERSONAS_TABS = [
  { id: 'inicio', rol: 0 as PersonRole, label: 'Inicio', singular: '', leaderRole: null as PersonRole | null, isReportes: false },
  { id: 'grupos', rol: 1 as PersonRole, label: 'Grupos', singular: 'grupo', leaderRole: null as PersonRole | null, isReportes: false },
  { id: 'referentes', rol: 2 as PersonRole, label: 'Referentes', singular: 'referente', leaderRole: 1 as PersonRole, isReportes: false },
  { id: 'punteros', rol: 3 as PersonRole, label: 'Punteros', singular: 'puntero', leaderRole: 2 as PersonRole, isReportes: false },
  { id: 'votantes', rol: 4 as PersonRole, label: 'Votantes', singular: 'votante', leaderRole: 3 as PersonRole, isReportes: false },
  { id: 'reportes', rol: 0 as PersonRole, label: 'Reportes', singular: '', leaderRole: null as PersonRole | null, isReportes: true },
  { id: 'configuracion', rol: 0 as PersonRole, label: 'Configuración', singular: '', leaderRole: null as PersonRole | null, isReportes: false },
] as const

