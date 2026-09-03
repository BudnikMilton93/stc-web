import { useCallback, useEffect, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'

// Carga la unidad y su cadena de pertenencia (sitio, cliente), validando que
// coincidan con los ids de la URL. No incluye ocupantes/activos: esos viven
// en sus propios hooks (useOcupantesDeUnidad / useActivosDeUnidad).
export function useUnidadDetail(clienteId, sitioId, unidadId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unidad, setUnidad] = useState(null)
  const [sitio, setSitio] = useState(null)
  const [cliente, setCliente] = useState(null)

  const reload = useCallback(async () => {
    if (!unidadId || !sitioId || !clienteId) {
      return
    }

    setLoading(true)
    setError('')

    let unidadData

    try {
      unidadData = await apiClient.get(`/unidades/${unidadId}`)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('No se encontro la unidad solicitada para este sitio.')
      } else {
        const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar la unidad'
        setError(message || 'No se pudo cargar la unidad')
      }
      setLoading(false)
      return
    }

    if (!unidadData || unidadData.sitioId !== sitioId) {
      setError('No se encontro la unidad solicitada para este sitio.')
      setLoading(false)
      return
    }

    let sitioData
    let clienteData

    try {
      ;[sitioData, clienteData] = await Promise.all([
        apiClient.get(`/sitios/${sitioId}`),
        apiClient.get(`/clientes/${clienteId}`),
      ])
    } catch (requestError) {
      const message =
        requestError instanceof ApiError ? requestError.message : 'No se pudo cargar la informacion de la unidad'
      setError(message || 'No se pudo cargar la informacion de la unidad')
      setLoading(false)
      return
    }

    if (!sitioData || sitioData.clienteId !== clienteId) {
      setError('No se encontro el sitio asociado a esta unidad.')
      setLoading(false)
      return
    }

    if (!clienteData) {
      setError('No se encontro el cliente asociado a este sitio.')
      setLoading(false)
      return
    }

    setUnidad(unidadData)
    setSitio(sitioData)
    setCliente(clienteData)
    setLoading(false)
  }, [clienteId, sitioId, unidadId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { loading, error, unidad, sitio, cliente, reload }
}
