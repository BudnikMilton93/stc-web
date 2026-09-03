import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { isArchivedRecord } from '../utils/archiveFlag'

// Carga los ocupantes de una unidad. Expone tanto la lista filtrada por el
// toggle "mostrar dados de baja" (para la grilla) como la lista de ocupantes
// activos (para el autocomplete de activos y la regla que bloquea el alta de
// un activo sin al menos un ocupante activo).
export function useOcupantesDeUnidad(unidadId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ocupantes, setOcupantes] = useState([])
  const [includeArchived, setIncludeArchived] = useState(false)

  const reload = useCallback(async () => {
    if (!unidadId) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiClient.get(`/ocupantes?unidadId=${unidadId}`)
      setOcupantes(data ?? [])
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar los ocupantes'
      setError(message || 'No se pudieron cargar los ocupantes')
      setOcupantes([])
    } finally {
      setLoading(false)
    }
  }, [unidadId])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectableOcupantes = useMemo(
    () => ocupantes.filter((item) => !isArchivedRecord(item.notas)),
    [ocupantes],
  )

  const visibleOcupantes = useMemo(() => {
    if (includeArchived) {
      return ocupantes
    }

    return selectableOcupantes
  }, [includeArchived, ocupantes, selectableOcupantes])

  const activeOcupantesCount = selectableOcupantes.length

  return {
    loading,
    error,
    ocupantes,
    visibleOcupantes,
    selectableOcupantes,
    includeArchived,
    setIncludeArchived,
    activeOcupantesCount,
    reload,
  }
}
