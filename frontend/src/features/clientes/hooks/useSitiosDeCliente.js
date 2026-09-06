import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { isArchivedRecord } from '../utils/archiveFlag'

// Carga el cliente y sus sitios, mas el conteo de unidades activas por sitio
// (para el resumen y la columna "Departamentos" de la grilla), el total de
// equipamiento de sitio activo del cliente y el conteo de activos activos por
// sitio (equipamiento directo + activos de cualquiera de sus unidades, ya que
// `activos.sitioId` queda seteado en ambos casos -- ver ActivosEndpoints en
// la API). Este ultimo conteo es el que permite deshabilitar preventivamente
// el boton "Dar de baja" de un sitio con dependientes activos (ver
// utils/bajaBlocking.js), la misma regla que valida el backend. Tambien
// resuelve el filtro "mostrar dados de baja" en memoria, igual que hace
// useClientesList con la busqueda por nombre.
export function useSitiosDeCliente(clienteId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cliente, setCliente] = useState(null)
  const [sitios, setSitios] = useState([])
  const [sitioUnidadCountMap, setSitioUnidadCountMap] = useState({})
  const [sitioActivoCountMap, setSitioActivoCountMap] = useState({})
  const [includeArchived, setIncludeArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [activeEquipamientoCount, setActiveEquipamientoCount] = useState(0)

  const reload = useCallback(async () => {
    if (!clienteId) {
      return
    }

    setLoading(true)
    setError('')

    let clienteData
    let sitioRows
    let activoRows

    try {
      ;[clienteData, sitioRows, activoRows] = await Promise.all([
        apiClient.get(`/clientes/${clienteId}`),
        apiClient.get(`/sitios?clienteId=${clienteId}`),
        apiClient.get(`/activos?clienteId=${clienteId}`),
      ])
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('No se encontro el cliente solicitado.')
      } else {
        const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el cliente'
        setError(message || 'No se pudo cargar el cliente')
      }
      setCliente(null)
      setSitios([])
      setSitioUnidadCountMap({})
      setSitioActivoCountMap({})
      setActiveEquipamientoCount(0)
      setLoading(false)
      return
    }

    activoRows = activoRows ?? []
    const activosActivos = activoRows.filter((item) => item.estado !== 'deBaja')

    setActiveEquipamientoCount(activosActivos.filter((item) => !item.unidadId && !item.ocupanteId).length)

    setSitioActivoCountMap(
      activosActivos.reduce((acc, activo) => {
        if (!activo.sitioId) {
          return acc
        }

        acc[activo.sitioId] = (acc[activo.sitioId] ?? 0) + 1
        return acc
      }, {}),
    )

    sitioRows = sitioRows ?? []
    const activeSitioIds = sitioRows.filter((item) => !isArchivedRecord(item.notas)).map((item) => item.id)

    let unidadCountMap = {}

    if (activeSitioIds.length > 0) {
      try {
        const unidadesPorSitio = await Promise.all(
          activeSitioIds.map((sitioId) => apiClient.get(`/unidades?sitioId=${sitioId}`)),
        )

        unidadCountMap = unidadesPorSitio.flat().reduce((acc, unidad) => {
          if (isArchivedRecord(unidad.notas)) {
            return acc
          }

          acc[unidad.sitioId] = (acc[unidad.sitioId] ?? 0) + 1
          return acc
        }, {})
      } catch (requestError) {
        const message =
          requestError instanceof ApiError ? requestError.message : 'No se pudo validar el estado de unidades'
        setError(message || 'No se pudo validar el estado de unidades')
        setCliente(clienteData)
        setSitios(sitioRows)
        setSitioUnidadCountMap({})
        setSitioActivoCountMap({})
        setLoading(false)
        return
      }
    }

    setCliente(clienteData)
    setSitios(sitioRows)
    setSitioUnidadCountMap(unidadCountMap)
    setLoading(false)
  }, [clienteId])

  useEffect(() => {
    void reload()
  }, [reload])

  const visibleSitios = useMemo(() => {
    const bySituacion = includeArchived ? sitios : sitios.filter((item) => !isArchivedRecord(item.notas))

    const cleanTerm = search.trim().toLowerCase()
    if (!cleanTerm) {
      return bySituacion
    }

    return bySituacion.filter(
      (item) => item.nombre?.toLowerCase().includes(cleanTerm) || item.direccion?.toLowerCase().includes(cleanTerm),
    )
  }, [includeArchived, search, sitios])

  const activeSitiosCount = useMemo(
    () => sitios.filter((item) => !isArchivedRecord(item.notas)).length,
    [sitios],
  )

  const sitiosWithUnidadesCount = useMemo(
    () => Object.values(sitioUnidadCountMap).filter((count) => count > 0).length,
    [sitioUnidadCountMap],
  )

  const totalUnidadesCount = useMemo(
    () => Object.values(sitioUnidadCountMap).reduce((acc, count) => acc + count, 0),
    [sitioUnidadCountMap],
  )

  return {
    loading,
    error,
    cliente,
    sitios: visibleSitios,
    includeArchived,
    setIncludeArchived,
    search,
    setSearch,
    sitioUnidadCountMap,
    sitioActivoCountMap,
    activeSitiosCount,
    sitiosWithUnidadesCount,
    totalUnidadesCount,
    activeEquipamientoCount,
    reload,
  }
}
