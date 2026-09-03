import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'

// Carga el listado de clientes y aplica el filtro de busqueda por nombre.
// Filtro en memoria: la API todavia no expone busqueda full-text como hacia
// Supabase (textSearch + fallback ilike), asi que filtramos del lado del
// cliente sobre la lista ya cargada.
export function useClientesList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiClient.get('/clientes')
      setClientes(data ?? [])
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar los clientes'
      setError(message || 'No se pudieron cargar los clientes')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredClientes = useMemo(() => {
    const cleanTerm = search.trim().toLowerCase()

    if (!cleanTerm) {
      return clientes
    }

    return clientes.filter((cliente) => cliente.nombre?.toLowerCase().includes(cleanTerm))
  }, [clientes, search])

  return {
    clientes: filteredClientes,
    loading,
    error,
    search,
    setSearch,
    reload,
  }
}
