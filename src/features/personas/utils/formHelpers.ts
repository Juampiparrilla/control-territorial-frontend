import type { CreatePersonaDTO, PersonaResponseDTO, PersonRole } from '../types'

export function emptyForm(rol: PersonRole): CreatePersonaDTO {
  return {
    Nombre: '',
    Apellido: '',
    DNI: '',
    Rol: rol,
    Telefono: '',
    Escuela: '',
    Mesa: '',
    LiderId: null,
  }
}

export function formFromEntity(entity: PersonaResponseDTO): CreatePersonaDTO {
  return {
    Nombre: entity.Nombre,
    Apellido: entity.Apellido,
    DNI: entity.DNI,
    Rol: entity.Rol,
    Telefono: entity.Telefono ?? '',
    Escuela: entity.EscuelaNombre ?? '',
    Mesa: entity.NroMesa != null ? String(entity.NroMesa) : '',
    LiderId: entity.LiderId ?? null,
  }
}

export function normalizeOptionalString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}
