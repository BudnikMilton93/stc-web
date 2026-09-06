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

    // sitioId/clienteId vienen de la URL, no del resultado de /unidades/:id,
    // asi que las tres consultas son independientes entre si y se piden todas
    // de una (Promise.allSettled, para poder seguir distinguiendo cual fallo
    // y dar el mensaje de error correspondiente) en vez de esperar la unidad
    // primero: contra el pooler remoto de Supabase cada round trip pesa
    // varios cientos de ms, asi que evitar esa espera secuencial es la
    // principal palanca de latencia percibida en esta pantalla. Si la unidad
    // no existe, se cancelan sitio/cliente (todavia en vuelo en el caso
    // comun) para no completarlas al pedo -- se pierde el descarte
    // silencioso que tenia el codigo secuencial de antes.
    const abortSitioCliente = new AbortController()
    const unidadPromise = apiClient.get(`/unidades/${unidadId}`)
    unidadPromise.catch(() => abortSitioCliente.abort())

    const [unidadResult, sitioResult, clienteResult] = await Promise.allSettled([
      unidadPromise,
      apiClient.get(`/sitios/${sitioId}`, { signal: abortSitioCliente.signal }),
      apiClient.get(`/clientes/${clienteId}`, { signal: abortSitioCliente.signal }),
    ])

    if (unidadResult.status === 'rejected') {
      const requestError = unidadResult.reason
      if (requestError instanceof ApiError && requestError.status === 404) {
        setError('No se encontro la unidad solicitada para este sitio.')
      } else {
        const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar la unidad'
        setError(message || 'No se pudo cargar la unidad')
      }
      setLoading(false)
      return
    }

    if (sitioResult.status === 'rejected' || clienteResult.status === 'rejected') {
      const requestError = sitioResult.status === 'rejected' ? sitioResult.reason : clienteResult.reason
      const message =
        requestError instanceof ApiError ? requestError.message : 'No se pudo cargar la informacion de la unidad'
      setError(message || 'No se pudo cargar la informacion de la unidad')
      setLoading(false)
      return
    }

    const unidadData = unidadResult.value
    const sitioData = sitioResult.value
    const clienteData = clienteResult.value

    if (!unidadData || unidadData.sitioId !== sitioId) {
      setError('No se encontro la unidad solicitada para este sitio.')
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
