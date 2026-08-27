import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { toFriendlySupabaseError } from '../../../lib/supabaseErrors'

const TIPO_ACTIVO_OPTIONS = ['camara', 'portero', 'cerradura_magnetica', 'otro']

export function InventarioPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clientes, setClientes] = useState([])
  const [sitios, setSitios] = useState([])
  const [activos, setActivos] = useState([])

  const [tipoFilter, setTipoFilter] = useState('')
  const [clienteFilter, setClienteFilter] = useState('')
  const [sitioFilter, setSitioFilter] = useState('')
  const [serieFilter, setSerieFilter] = useState('')

  const loadClientes = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('clientes')
      .select('id, nombre')
      .order('nombre', { ascending: true })

    if (queryError) {
      throw queryError
    }

    setClientes(data ?? [])
  }, [])

  const loadSitios = useCallback(async (clienteId = '') => {
    let query = supabase.from('sitios').select('id, cliente_id, nombre').order('nombre', { ascending: true })

    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      throw queryError
    }

    setSitios(data ?? [])
  }, [])

  const loadActivos = useCallback(async () => {
    setLoading(true)
    setError('')

    let query = supabase
      .from('activos')
      .select(
        'id, tipo, marca, modelo, numero_serie, fecha_instalacion, garantia_hasta, estado, cliente_id, sitio_id, unidad_id, ocupante_id, created_at, cliente:clientes(nombre), sitio:sitios(nombre), unidad:unidades(identificador), ocupante:ocupantes(nombre)',
      )
      .order('created_at', { ascending: false })

    if (tipoFilter) {
      query = query.eq('tipo', tipoFilter)
    }

    if (clienteFilter) {
      query = query.eq('cliente_id', clienteFilter)
    }

    if (sitioFilter) {
      query = query.eq('sitio_id', sitioFilter)
    }

    if (serieFilter.trim()) {
      query = query.ilike('numero_serie', `%${serieFilter.trim()}%`)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      setError(toFriendlySupabaseError(queryError, 'No se pudieron cargar los activos'))
      setActivos([])
      setLoading(false)
      return
    }

    setActivos(data ?? [])
    setLoading(false)
  }, [clienteFilter, serieFilter, sitioFilter, tipoFilter])

  useEffect(() => {
    void (async () => {
      try {
        await loadClientes()
      } catch (err) {
        setError(toFriendlySupabaseError(err, 'No se pudieron cargar los clientes para filtrar'))
      }
    })()
  }, [loadClientes])

  useEffect(() => {
    void (async () => {
      try {
        await loadSitios(clienteFilter)
      } catch (err) {
        setError(toFriendlySupabaseError(err, 'No se pudieron cargar los sitios para filtrar'))
      }
    })()
  }, [clienteFilter, loadSitios])

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

  return (
    <section className="crud-shell">
      <div className="crud-header">
        <div>
          <p className="eyebrow">Activos</p>
          <h2>Listado global de activos</h2>
          <p className="muted-text">Filtra por tipo, cliente, sitio y numero de serie.</p>
        </div>
      </div>

      <article className="crud-card">
        <div className="filter-grid">
          <label>
            Tipo
            <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
              <option value="">Todos</option>
              {TIPO_ACTIVO_OPTIONS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
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
            Numero de serie
            <input
              value={serieFilter}
              onChange={(e) => setSerieFilter(e.target.value)}
              placeholder="Buscar por numero de serie"
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {loading ? <p className="muted-text">Cargando activos...</p> : null}

        {!loading && activos.length === 0 ? (
          <p className="muted-text">No hay activos para los filtros aplicados.</p>
        ) : null}

        {!loading && activos.length > 0 ? (
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
                {activos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.tipo}</td>
                    <td>{item.estado}</td>
                    <td>
                      {(item.marca || 'Sin marca')} / {(item.modelo || 'Sin modelo')}
                    </td>
                    <td>{item.numero_serie || 'Sin serie'}</td>
                    <td>{item.cliente?.nombre || '-'}</td>
                    <td>{item.sitio?.nombre || '-'}</td>
                    <td>{item.unidad?.identificador || '-'}</td>
                    <td>{item.ocupante?.nombre || '-'}</td>
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