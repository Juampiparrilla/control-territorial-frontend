import { apiFetch, apiJson } from '../../../lib/apiClient'
import type {
  CreatePersonaDTO,
  PadronRowImportDTO,
  PadronUploadResultDTO,
  PersonaResponseDTO,
  PersonRole,
} from '../types'

function toPersonaResponseDTO(raw: Record<string, unknown>): PersonaResponseDTO {
  return {
    Id: (raw.id ?? raw.Id) as number,
    Nombre: (raw.nombre ?? raw.Nombre) as string,
    Apellido: (raw.apellido ?? raw.Apellido) as string,
    DNI: (raw.dni ?? raw.DNI) as string,
    Rol: (raw.rol ?? raw.Rol) as PersonRole,
    Telefono: (raw.telefono ?? raw.Telefono) as string | null | undefined,
    EscuelaId: (raw.escuelaId ?? raw.EscuelaId) as number | null | undefined,
    EscuelaNombre: (raw.escuelaNombre ?? raw.EscuelaNombre) as string | null | undefined,
    MesaId: (raw.mesaId ?? raw.MesaId) as number | null | undefined,
    NroMesa: (raw.nroMesa ?? raw.NroMesa) as number | null | undefined,
    LiderId: (raw.liderId ?? raw.LiderId) as number | null | undefined,
    LiderNombre: (raw.liderNombre ?? raw.LiderNombre) as string | null | undefined,
  }
}

function mapPadronUploadResult(data: Record<string, unknown>): PadronUploadResultDTO {
  const dnis = data.DnisNotFound ?? data.dnisNotFound
  return {
    TotalRows: Number(data.TotalRows ?? data.totalRows ?? 0),
    RowsStored: Number(data.RowsStored ?? data.rowsStored ?? 0),
    PersonasUpdated: Number(data.PersonasUpdated ?? data.personasUpdated ?? 0),
    DnisNotFound: Array.isArray(dnis) ? (dnis as string[]) : [],
  }
}

export async function createPersona(payload: CreatePersonaDTO): Promise<PersonaResponseDTO> {
  const data = await apiJson<Record<string, unknown>>('/api/Persona/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return toPersonaResponseDTO(data)
}

export async function getPersonasByRole(rol: PersonRole): Promise<PersonaResponseDTO[]> {
  const res = await apiFetch(`/api/Persona/search-by-role/${rol}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }
  const data = (await res.json()) as Record<string, unknown>[]
  return Array.isArray(data) ? data.map((p) => toPersonaResponseDTO(p)) : []
}

export async function updatePersona(id: number, payload: CreatePersonaDTO): Promise<PersonaResponseDTO> {
  const data = await apiJson<Record<string, unknown>>(`/api/Persona/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return toPersonaResponseDTO(data)
}

export async function deletePersona(id: number): Promise<void> {
  const res = await apiFetch(`/api/Persona/delete/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }
}

export async function uploadPadron(file: File): Promise<PadronUploadResultDTO> {
  const fd = new FormData()
  fd.append('file', file)
  const data = await apiJson<Record<string, unknown>>('/api/Padron/upload', {
    method: 'POST',
    body: fd,
  })
  return mapPadronUploadResult(data)
}

export async function matchPadronByDni(dni: string): Promise<PadronRowImportDTO | null> {
  const res = await apiFetch(`/api/Padron/match-by-dni/${encodeURIComponent(dni)}`)
  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }
  const data = (await res.json()) as Record<string, unknown>
  return {
    DNI: String(data.DNI ?? data.dni ?? ''),
    Nombre: String(data.Nombre ?? data.nombre ?? ''),
    Apellido: String(data.Apellido ?? data.apellido ?? ''),
    EscuelaNombre: String(data.EscuelaNombre ?? data.escuelaNombre ?? ''),
    MesaNro: Number(data.MesaNro ?? data.mesaNro ?? 0),
    Orden: (data.Orden ?? data.orden ?? null) as string | null,
  }
}

export async function syncPadronActive(): Promise<PadronUploadResultDTO> {
  const data = await apiJson<Record<string, unknown>>('/api/Padron/sync-active', { method: 'POST' })
  return mapPadronUploadResult(data)
}

/** Invalida caché en memoria (p. ej. tras crear/editar/borrar). */
export function invalidatePersonasByRoleCache(): void {
  roleCache.clear()
}

const roleCache = new Map<PersonRole, PersonaResponseDTO[]>()

export async function getPersonasByRoleCached(rol: PersonRole, force = false): Promise<PersonaResponseDTO[]> {
  if (!force && roleCache.has(rol)) {
    return roleCache.get(rol)!
  }
  const data = await getPersonasByRole(rol)
  roleCache.set(rol, data)
  return data
}
