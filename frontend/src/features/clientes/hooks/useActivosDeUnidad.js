import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'

// Carga los activos de una unidad. A diferencia de sitios/unidades/ocupantes,
// los activos tienen un estado real en la API (`activo` / `deBaja`), sin
// necesidad del archive-flag en `notas`.
export function useActivosDeUnidad(unidadId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activos, setActivos] = useState([])
  const [includeInactive, setIncludeInactive] = useState(false)

  const reload = useCallback(async () => {
    if (!unidadId) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiClient.get(`/activos?unidadId=${unidadId}`)
      setActivos(data ?? [])
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar los activos'
      setError(message || 'No se pudieron cargar los activos')
      setActivos([])
    } finally {
      setLoading(false)
    }
  }, [unidadId])

  useEffect(() => {
    void reload()
  }, [reload])

  const visibleActivos = useMemo(() => {
    if (includeInactive) {
      return activos
    }

    return activos.filter((item) => item.estado !== 'deBaja')
  }, [activos, includeInactive])

  const activeActivosCount = useMemo(() => activos.filter((item) => item.estado !== 'deBaja').length, [activos])

  return {
    loading,
    error,
    activos,
    visibleActivos,
    includeInactive,
    setIncludeInactive,
    activeActivosCount,
    reload,
  }
}
