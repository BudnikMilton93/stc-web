import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { sortByProximoMantenimiento } from '../utils/mantenimiento'

// Carga el equipamiento instalado a nivel de sitio (camaras, porteros y
// controles de acceso de areas comunes): activos con sitioId pero sin
// unidad ni ocupante asignado. Distinto de useActivosDeUnidad, que lista los
// activos de una unidad puntual (siempre con ocupante). Igual que activos,
// usa el estado real de la API ('activo' / 'deBaja'), no el archive-flag de
// notas.
export function useEquipamientoDeSitio(sitioId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [equipamiento, setEquipamiento] = useState([])
  const [includeInactive, setIncludeInactive] = useState(false)

  const reload = useCallback(async () => {
    if (!sitioId) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiClient.get(`/activos?sitioId=${sitioId}&soloEquipamientoSitio=true`)
      setEquipamiento(sortByProximoMantenimiento(data ?? []))
    } catch (requestError) {
      const message =
        requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el equipamiento del sitio'
      setError(message || 'No se pudo cargar el equipamiento del sitio')
      setEquipamiento([])
    } finally {
      setLoading(false)
    }
  }, [sitioId])

  useEffect(() => {
    void reload()
  }, [reload])

  const visibleEquipamiento = useMemo(() => {
    if (includeInactive) {
      return equipamiento
    }

    return equipamiento.filter((item) => item.estado !== 'deBaja')
  }, [equipamiento, includeInactive])

  const activeEquipamientoCount = useMemo(
    () => equipamiento.filter((item) => item.estado !== 'deBaja').length,
    [equipamiento],
  )

  return {
    loading,
    error,
    equipamiento,
    visibleEquipamiento,
    includeInactive,
    setIncludeInactive,
    activeEquipamientoCount,
    reload,
  }
}
