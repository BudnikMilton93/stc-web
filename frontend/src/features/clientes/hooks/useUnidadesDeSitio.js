import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { isArchivedRecord } from '../utils/archiveFlag'

// Carga el sitio, el cliente padre (para el Breadcrumb) y las unidades del
// sitio, mas el conteo de ocupantes activos por unidad (para el resumen y la
// columna "Personas" de la grilla). Valida que el sitio pertenezca al
// cliente de la URL, igual que hacia el componente.
export function useUnidadesDeSitio(clienteId, sitioId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sitio, setSitio] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [unidades, setUnidades] = useState([])
  const [unidadOcupanteCountMap, setUnidadOcupanteCountMap] = useState({})
  const [includeArchived, setIncludeArchived] = useState(false)

  const reload = useCallback(async () => {
    if (!sitioId || !clienteId) {
      return
    }

    setLoading(true)
    setError('')

    let sitioData
    let clienteData
    let unidadRows

    try {
      ;[sitioData, clienteData, unidadRows] = await Promise.all([
        apiClient.get(`/sitios/${sitioId}`),
        apiClient.get(`/clientes/${clienteId}`),
        apiClient.get(`/unidades?sitioId=${sitioId}`),
      ])
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('No se encontro el sitio solicitado para este cliente.')
      } else {
        const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el sitio'
        setError(message || 'No se pudo cargar el sitio')
      }
      setUnidadOcupanteCountMap({})
      setLoading(false)
      return
    }

    if (!sitioData || sitioData.clienteId !== clienteId) {
      setError('No se encontro el sitio solicitado para este cliente.')
      setUnidadOcupanteCountMap({})
      setLoading(false)
      return
    }

    unidadRows = unidadRows ?? []
    const activeUnidadIds = unidadRows.filter((item) => !isArchivedRecord(item.notas)).map((item) => item.id)

    let ocupanteCountMap = {}

    if (activeUnidadIds.length > 0) {
      try {
        const ocupantesPorUnidad = await Promise.all(
          activeUnidadIds.map((unidadId) => apiClient.get(`/ocupantes?unidadId=${unidadId}`)),
        )

        ocupanteCountMap = ocupantesPorUnidad.flat().reduce((acc, ocupante) => {
          if (isArchivedRecord(ocupante.notas)) {
            return acc
          }

          acc[ocupante.unidadId] = (acc[ocupante.unidadId] ?? 0) + 1
          return acc
        }, {})
      } catch (requestError) {
        const message =
          requestError instanceof ApiError ? requestError.message : 'No se pudo validar el estado de ocupantes'
        setError(message || 'No se pudo validar el estado de ocupantes')
        setSitio(sitioData)
        setUnidades(unidadRows)
        setUnidadOcupanteCountMap({})
        setLoading(false)
        return
      }
    }

    setSitio(sitioData)
    setCliente(clienteData)
    setUnidades(unidadRows)
    setUnidadOcupanteCountMap(ocupanteCountMap)
    setLoading(false)
  }, [clienteId, sitioId])

  useEffect(() => {
    void reload()
  }, [reload])

  const visibleUnidades = useMemo(() => {
    if (includeArchived) {
      return unidades
    }

    return unidades.filter((item) => !isArchivedRecord(item.notas))
  }, [includeArchived, unidades])

  const activeUnidadesCount = useMemo(
    () => unidades.filter((item) => !isArchivedRecord(item.notas)).length,
    [unidades],
  )

  const unidadesWithOcupantesCount = useMemo(
    () => Object.values(unidadOcupanteCountMap).filter((count) => count > 0).length,
    [unidadOcupanteCountMap],
  )

  const totalOcupantesCount = useMemo(
    () => Object.values(unidadOcupanteCountMap).reduce((acc, count) => acc + count, 0),
    [unidadOcupanteCountMap],
  )

  return {
    loading,
    error,
    sitio,
    cliente,
    unidades: visibleUnidades,
    includeArchived,
    setIncludeArchived,
    unidadOcupanteCountMap,
    activeUnidadesCount,
    unidadesWithOcupantesCount,
    totalOcupantesCount,
    reload,
  }
}
