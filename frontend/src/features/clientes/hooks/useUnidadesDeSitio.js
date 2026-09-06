import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { countActiveByParent } from '../utils/countActiveByParent'
import { isArchivedRecord } from '../utils/archiveFlag'

// Carga el sitio, el cliente padre (para el Breadcrumb) y las unidades del
// sitio, mas el conteo de ocupantes activos por unidad (para el resumen y la
// columna "Personas" de la grilla) y el conteo de activos activos por unidad
// (para deshabilitar preventivamente el boton "Dar de baja" de una unidad con
// dependientes activos, ver utils/bajaBlocking.js -- misma regla que valida
// el backend). Valida que el sitio pertenezca al cliente de la URL, igual que
// hacia el componente.
export function useUnidadesDeSitio(clienteId, sitioId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sitio, setSitio] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [unidades, setUnidades] = useState([])
  const [unidadOcupanteCountMap, setUnidadOcupanteCountMap] = useState({})
  const [unidadActivoCountMap, setUnidadActivoCountMap] = useState({})
  const [includeArchived, setIncludeArchived] = useState(false)

  const reload = useCallback(async () => {
    if (!sitioId || !clienteId) {
      return
    }

    setLoading(true)
    setError('')

    // Las cinco consultas son independientes entre si y se piden todas de
    // una, no en oleadas sucesivas: contra el pooler remoto de Supabase cada
    // round trip pesa varios cientos de ms, asi que evitar oleadas es la
    // principal palanca de latencia percibida en esta pantalla. Se usa
    // allSettled (en vez de Promise.all) porque el fetch de ocupantes es
    // secundario -- si falla solo el, la pantalla igual puede mostrar
    // sitio/unidades con un aviso puntual, en vez de tirar todo por un dato
    // no critico.
    const [sitioResult, clienteResult, unidadResult, activoResult, ocupanteResult] = await Promise.allSettled([
      apiClient.get(`/sitios/${sitioId}`),
      apiClient.get(`/clientes/${clienteId}`),
      apiClient.get(`/unidades?sitioId=${sitioId}`),
      apiClient.get(`/activos?sitioId=${sitioId}`),
      apiClient.get(`/ocupantes?sitioId=${sitioId}`),
    ])

    const criticalRejection = [sitioResult, clienteResult, unidadResult, activoResult].find(
      (r) => r.status === 'rejected',
    )

    if (criticalRejection) {
      const requestError = criticalRejection.reason
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('No se encontro el sitio solicitado para este cliente.')
      } else {
        const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el sitio'
        setError(message || 'No se pudo cargar el sitio')
      }
      setUnidadOcupanteCountMap({})
      setUnidadActivoCountMap({})
      setLoading(false)
      return
    }

    const sitioData = sitioResult.value
    const clienteData = clienteResult.value

    if (!sitioData || sitioData.clienteId !== clienteId) {
      setError('No se encontro el sitio solicitado para este cliente.')
      setUnidadOcupanteCountMap({})
      setUnidadActivoCountMap({})
      setLoading(false)
      return
    }

    setUnidadActivoCountMap(
      (activoResult.value ?? [])
        .filter((activo) => activo.unidadId && activo.estado !== 'deBaja')
        .reduce((acc, activo) => {
          acc[activo.unidadId] = (acc[activo.unidadId] ?? 0) + 1
          return acc
        }, {}),
    )

    const unidadRows = unidadResult.value ?? []
    const activeUnidadIds = new Set(unidadRows.filter((item) => !isArchivedRecord(item.notas)).map((item) => item.id))

    if (ocupanteResult.status === 'rejected') {
      const requestError = ocupanteResult.reason
      const message =
        requestError instanceof ApiError ? requestError.message : 'No se pudo validar el estado de ocupantes'
      setError(message || 'No se pudo validar el estado de ocupantes')
      setUnidadOcupanteCountMap({})
    } else {
      setUnidadOcupanteCountMap(countActiveByParent(ocupanteResult.value, 'unidadId', activeUnidadIds))
    }

    setSitio(sitioData)
    setCliente(clienteData)
    setUnidades(unidadRows)
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
    unidadActivoCountMap,
    activeUnidadesCount,
    unidadesWithOcupantesCount,
    totalOcupantesCount,
    reload,
  }
}
