import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { TIPO_ACTIVO_FILTER_OPTIONS, TIPOS_ACTIVO_OPTIONS } from '../../../lib/tipoActivo'

export function InventarioPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clientes, setClientes] = useState([])
  const [sitios, setSitios] = useState([])
  const [unidades, setUnidades] = useState([])
  const [ocupantes, setOcupantes] = useState([])
  const [activos, setActivos] = useState([])

  const [tipoFilter, setTipoFilter] = useState('')
  const [clienteFilter, setClienteFilter] = useState('')
  const [sitioFilter, setSitioFilter] = useState('')
  const [serieFilter, setSerieFilter] = useState('')

  const loadClientes = useCallback(async () => {
    const data = await apiClient.get('/clientes')
    setClientes(
      [...(data ?? [])].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '')),
    )
  }, [])

  const loadSitios = useCallback(async (clienteId = '') => {
    const query = clienteId ? `?clienteId=${clienteId}` : ''
    const data = await apiClient.get(`/sitios${query}`)
    setSitios(
      [...(data ?? [])].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '')),
    )
  }, [])

  // La API no soporta embeds/joins como Supabase (PostgREST). Para poder mostrar
  // el nombre de la unidad y el ocupante de cada activo sin hacer un request por
  // fila, traemos todas las unidades y ocupantes una sola vez y los resolvemos
  // por id del lado del cliente. Aceptable para el volumen de datos actual.
  const loadUnidades = useCallback(async () => {
    const data = await apiClient.get('/unidades')
    setUnidades(data ?? [])
  }, [])

  const loadOcupantes = useCallback(async () => {
    const data = await apiClient.get('/ocupantes')
    setOcupantes(data ?? [])
  }, [])

  const tipos = Object.fromEntries(TIPOS_ACTIVO_OPTIONS.map(({ value, label }) => [value, label]))

  const loadActivos = useCallback(async () => {
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (clienteFilter) {
      params.set('clienteId', clienteFilter)
    }
    if (sitioFilter) {
      params.set('sitioId', sitioFilter)
    }

    const query = params.toString()

    try {
      const data = await apiClient.get(`/activos${query ? `?${query}` : ''}`)
      setActivos(data ?? [])
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar los activos'
      setError(message || 'No se pudieron cargar los activos')
      setActivos([])
    } finally {
      setLoading(false)
    }
  }, [clienteFilter, sitioFilter])

  useEffect(() => {
    void (async () => {
      try {
        await loadClientes()
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'No se pudieron cargar los clientes para filtrar'
        setError(message || 'No se pudieron cargar los clientes para filtrar')
      }
    })()
  }, [loadClientes])

  useEffect(() => {
    void (async () => {
      try {
        await loadSitios(clienteFilter)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'No se pudieron cargar los sitios para filtrar'
        setError(message || 'No se pudieron cargar los sitios para filtrar')
      }
    })()
  }, [clienteFilter, loadSitios])

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([loadUnidades(), loadOcupantes()])
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'No se pudieron cargar las unidades y ocupantes para el listado'
        setError(message || 'No se pudieron cargar las unidades y ocupantes para el listado')
      }
    })()
  }, [loadUnidades, loadOcupantes])

  useEffect(() => {
    if (!clienteFilter) {
      return
    }

    const selectedSitioBelongsToCliente = sitios.some((item) => item.id === sitioFilter)
    if (!selectedSitioBelongsToCliente) {
      setSitioFilter('')
    }
  }, [clienteFilter, sitioFilter, sitios])

  useEffect(() => {
    void loadActivos()
  }, [loadActivos])

  const clientesById = useMemo(() => new Map(clientes.map((item) => [item.id, item])), [clientes])
  const sitiosById = useMemo(() => new Map(sitios.map((item) => [item.id, item])), [sitios])
  const unidadesById = useMemo(() => new Map(unidades.map((item) => [item.id, item])), [unidades])
  const ocupantesById = useMemo(() => new Map(ocupantes.map((item) => [item.id, item])), [ocupantes])

  // Filtros que la API no expone por query (tipo y numero de serie): se aplican
  // en memoria sobre el listado ya cargado, igual que el buscador de ClientesPage.
  const filteredActivos = useMemo(() => {
    const serie = serieFilter.trim().toLowerCase()

    return activos.filter((item) => {
      if (tipoFilter && item.tipo !== tipoFilter) {
        return false
      }

      if (serie && !(item.numeroSerie ?? '').toLowerCase().includes(serie)) {
        return false
      }

      return true
    })
  }, [activos, serieFilter, tipoFilter])

  return (
    <section className="crud-shell">
      <div className="crud-header">
        <div>
          <p className="eyebrow">Activos</p>
          <h2>Listado global de activos</h2>
          <p className="muted-text">Filtra por tipo, cliente, sitio o número de serie.</p>
        </div>
      </div>

      <article className="crud-card">
        <div className="filter-grid">
          <label>
            Tipo
            <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
              <option value="">Todos</option>
              {TIPO_ACTIVO_FILTER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cliente
            <select value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)}>
              <option value="">Todos</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sitio
            <select value={sitioFilter} onChange={(e) => setSitioFilter(e.target.value)}>
              <option value="">Todos</option>
              {sitios.map((sitio) => (
                <option key={sitio.id} value={sitio.id}>
                  {sitio.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Número de serie
            <input
              value={serieFilter}
              onChange={(e) => setSerieFilter(e.target.value)}
              placeholder="Buscar por número de serie"
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {loading ? <p className="muted-text">Cargando activos...</p> : null}

        {!loading && filteredActivos.length === 0 ? (
          <p className="muted-text">No hay activos para los filtros aplicados.</p>
        ) : null}

        {!loading && filteredActivos.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Marca / Modelo</th>
                  <th>Serie</th>
                  <th>Cliente</th>
                  <th>Sitio</th>
                  <th>Unidad</th>
                  <th>Ocupante</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivos.map((item) => (
                  <tr key={item.id}>
                    <td>{tipos[item.tipo] || '-'}</td>
                    <td>{item.estado}</td>
                    <td>
                      {(item.marca || 'Sin marca')} / {(item.modelo || 'Sin modelo')}
                    </td>
                    <td>{item.numeroSerie || 'Sin serie'}</td>
                    <td>{clientesById.get(item.clienteId)?.nombre || '-'}</td>
                    <td>{sitiosById.get(item.sitioId)?.nombre || '-'}</td>
                    <td>{unidadesById.get(item.unidadId)?.identificador || '-'}</td>
                    <td>{ocupantesById.get(item.ocupanteId)?.nombre || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  )
}
