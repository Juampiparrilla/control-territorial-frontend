import type { CreatePersonaDTO, PersonaResponseDTO, PersonRole } from './type'

function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.replace(/\/$/, '')
  return ''
}

/** Normaliza la respuesta del API (camelCase por defecto en .NET) a PascalCase para el frontend */
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

export async function createPersona(payload: CreatePersonaDTO): Promise<PersonaResponseDTO> {
  const baseUrl = getApiBaseUrl()
  const res = await fetch(`${baseUrl}/api/Persona/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>
  return toPersonaResponseDTO(data)
}

export async function getPersonasByRole(rol: PersonRole): Promise<PersonaResponseDTO[]> {
  const baseUrl = getApiBaseUrl()
  const res = await fetch(`${baseUrl}/api/Persona/search-by-role/${rol}`)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>[]
  return Array.isArray(data) ? data.map((p) => toPersonaResponseDTO(p)) : []
}

export async function updatePersona(id: number, payload: CreatePersonaDTO): Promise<PersonaResponseDTO> {
  const baseUrl = getApiBaseUrl()
  const res = await fetch(`${baseUrl}/api/Persona/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }

  const data = (await res.json()) as Record<string, unknown>
  return toPersonaResponseDTO(data)
}

export async function deletePersona(id: number): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const res = await fetch(`${baseUrl}/api/Persona/delete/${id}`, { method: 'DELETE' })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Error HTTP ${res.status}`)
  }
}

