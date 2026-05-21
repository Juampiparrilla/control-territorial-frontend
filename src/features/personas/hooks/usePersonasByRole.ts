import { useCallback, useEffect, useState } from 'react'
import { getPersonasByRoleCached, invalidatePersonasByRoleCache } from '../services/personasApi'
import type { PersonaResponseDTO, PersonRole } from '../types'

type UsePersonasByRoleResult = {
  data: PersonaResponseDTO[]
  loading: boolean
  error: string | null
  refresh: (force?: boolean) => Promise<void>
  invalidateCache: () => void
}

export function usePersonasByRole(rol: PersonRole | null, enabled = true): UsePersonasByRoleResult {
  const [data, setData] = useState<PersonaResponseDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (force = false) => {
      if (rol === null) return
      setLoading(true)
      setError(null)
      try {
        const list = await getPersonasByRoleCached(rol, force)
        setData(list)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al cargar personas.'
        setError(msg)
        setData([])
      } finally {
        setLoading(false)
      }
    },
    [rol],
  )

  useEffect(() => {
    if (!enabled || rol === null) return
    void refresh(false)
  }, [enabled, rol, refresh])

  const invalidateCache = useCallback(() => {
    invalidatePersonasByRoleCache()
  }, [])

  return { data, loading, error, refresh, invalidateCache }
}
