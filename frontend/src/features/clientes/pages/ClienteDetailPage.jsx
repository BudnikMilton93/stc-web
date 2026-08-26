import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FiArchive,
  FiArrowLeft,
  FiCheckCircle,
  FiEdit2,
  FiEye,
  FiHome,
  FiLayers,
  FiMapPin,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiX,
  FiXCircle,
} from 'react-icons/fi'
import { supabase } from '../../../lib/supabase'
import { toFriendlySupabaseError } from '../../../lib/supabaseErrors'

const SITIO_TIPOS = ['edificio', 'casa', 'oficina', 'comercio', 'otro']

const initialSitioForm = {
  nombre: '',
  tipo: 'edificio',
  direccion: '',
  ciudad: '',
  notas: '',
}

const ARCHIVE_FLAG = '[BAJA_LOGICA]'

function isArchivedRecord(notas) {
  return typeof notas === 'string' && notas.includes(ARCHIVE_FLAG)
}

function addArchiveFlag(notas) {
  if (isArchivedRecord(notas)) {
    return notas
  }
  return notas ? `${notas}\n${ARCHIVE_FLAG}` : ARCHIVE_FLAG
}

function removeArchiveFlag(notas) {
  if (!notas) {
    return null
  }

  const cleaned = notas
    .replace(ARCHIVE_FLAG, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  return cleaned || null
}

export function ClienteDetailPage() {
  const { clienteId } = useParams()

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [cliente, setCliente] = useState(null)
  const [sitios, setSitios] = useState([])
  const [sitioUnidadCountMap, setSitioUnidadCountMap] = useState({})

  const [showCreateSitio, setShowCreateSitio] = useState(false)
  const [editingSitioId, setEditingSitioId] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [sitioForm, setSitioForm] = useState(initialSitioForm)
  const [sitioSaving, setSitioSaving] = useState(false)
  const [sitioActionLoadingId, setSitioActionLoadingId] = useState('')
  const [sitioError, setSitioError] = useState('')

  const visibleSitios = useMemo(() => {
    if (includeArchived) {
      return sitios
    }

    return sitios.filter((item) => !isArchivedRecord(item.notas))
  }, [includeArchived, sitios])

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

  const loadData = useMemo(
    () =>
      async function fetchData() {
        if (!clienteId) {
          return
        }

        setLoading(true)
        setPageError('')

        const [clienteResult, sitiosResult] = await Promise.all([
          supabase
            .from('clientes')
            .select('id, tipo, nombre, dni_cuit, email, telefono, direccion, notas, created_at')
            .eq('id', clienteId)
            .maybeSingle(),
          supabase
            .from('sitios')
            .select('id, cliente_id, nombre, tipo, direccion, ciudad, notas, created_at')
            .eq('cliente_id', clienteId)
            .order('created_at', { ascending: false }),
        ])

        if (clienteResult.error) {
          setPageError(toFriendlySupabaseError(clienteResult.error, 'No se pudo cargar el cliente'))
          setCliente(null)
          setSitios([])
          setSitioUnidadCountMap({})
          setLoading(false)
          return
        }

        if (!clienteResult.data) {
          setPageError('No se encontro el cliente solicitado.')
          setCliente(null)
          setSitios([])
          setSitioUnidadCountMap({})
          setLoading(false)
          return
        }

        if (sitiosResult.error) {
          setPageError(toFriendlySupabaseError(sitiosResult.error, 'No se pudieron cargar los sitios'))
          setCliente(clienteResult.data)
          setSitios([])
          setSitioUnidadCountMap({})
          setLoading(false)
          return
        }

        const sitioRows = sitiosResult.data ?? []
        const activeSitioIds = sitioRows
          .filter((item) => !isArchivedRecord(item.notas))
          .map((item) => item.id)

        let unidadCountMap = {}

        if (activeSitioIds.length > 0) {
          const unidadesResult = await supabase
            .from('unidades')
            .select('sitio_id, notas')
            .in('sitio_id', activeSitioIds)

          if (unidadesResult.error) {
            setPageError(toFriendlySupabaseError(unidadesResult.error, 'No se pudo validar el estado de unidades'))
            setCliente(clienteResult.data)
            setSitios(sitioRows)
            setSitioUnidadCountMap({})
            setLoading(false)
            return
          }

          unidadCountMap = (unidadesResult.data ?? []).reduce((acc, unidad) => {
            if (isArchivedRecord(unidad.notas)) {
              return acc
            }

            acc[unidad.sitio_id] = (acc[unidad.sitio_id] ?? 0) + 1
            return acc
          }, {})
        }

        setCliente(clienteResult.data)
        setSitios(sitioRows)
        setSitioUnidadCountMap(unidadCountMap)
        setLoading(false)
      },
    [clienteId],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  const resetSitioForm = () => {
    setShowCreateSitio(false)
    setEditingSitioId('')
    setSitioForm(initialSitioForm)
    setSitioError('')
  }

  const startCreateSitio = () => {
    if (showCreateSitio && !editingSitioId) {
      resetSitioForm()
      return
    }

    setShowCreateSitio(true)
    setEditingSitioId('')
    setSitioForm(initialSitioForm)
    setSitioError('')
  }

  const startEditSitio = (sitio) => {
    setShowCreateSitio(true)
    setEditingSitioId(sitio.id)
    setSitioForm({
      nombre: sitio.nombre ?? '',
      tipo: sitio.tipo ?? 'edificio',
      direccion: sitio.direccion ?? '',
      ciudad: sitio.ciudad ?? '',
      notas: removeArchiveFlag(sitio.notas) ?? '',
    })
    setSitioError('')
  }

  const handleSaveSitio = async (event) => {
    event.preventDefault()
    if (!clienteId) {
      return
    }

    setSitioSaving(true)
    setSitioError('')

    const payload = {
      cliente_id: clienteId,
      nombre: sitioForm.nombre.trim(),
      tipo: sitioForm.tipo,
      direccion: sitioForm.direccion.trim(),
      ciudad: sitioForm.ciudad.trim() || null,
      notas: sitioForm.notas.trim() || null,
    }

    if (!payload.nombre || !payload.direccion) {
      setSitioError('Nombre y direccion son obligatorios.')
      setSitioSaving(false)
      return
    }

    const query = editingSitioId
      ? supabase.from('sitios').update(payload).eq('id', editingSitioId)
      : supabase.from('sitios').insert(payload)

    const { error } = await query

    if (error) {
      setSitioError(toFriendlySupabaseError(error, 'No se pudo guardar el sitio'))
      setSitioSaving(false)
      return
    }

    resetSitioForm()
    setSitioSaving(false)
    await loadData()
  }

  const handleBajaSitio = async (sitio) => {
    const confirmed = window.confirm(
      `Dar de baja el sitio "${sitio.nombre}"? Se ocultara de la vista principal.`,
    )

    if (!confirmed) {
      return
    }

    setSitioActionLoadingId(sitio.id)
    const { error } = await supabase
      .from('sitios')
      .update({ notas: addArchiveFlag(sitio.notas) })
      .eq('id', sitio.id)

    if (error) {
      setSitioError(toFriendlySupabaseError(error, 'No se pudo dar de baja el sitio'))
      setSitioActionLoadingId('')
      return
    }

    setSitioActionLoadingId('')
    await loadData()
  }

  const handleRestoreSitio = async (sitio) => {
    setSitioActionLoadingId(sitio.id)
    const { error } = await supabase
      .from('sitios')
      .update({ notas: removeArchiveFlag(sitio.notas) })
      .eq('id', sitio.id)

    if (error) {
      setSitioError(toFriendlySupabaseError(error, 'No se pudo rehabilitar el sitio'))
      setSitioActionLoadingId('')
      return
    }

    setSitioActionLoadingId('')
    await loadData()
  }

  if (loading) {
    return <section className="placeholder-card">Cargando cliente...</section>
  }

  if (pageError) {
    return (
      <section className="placeholder-card">
        <h2>Detalle de cliente</h2>
        <p className="form-error">{pageError}</p>
      </section>
    )
  }

  return (
    <section className="crud-shell">
      <div className="crud-header">
        <div>
          <p className="eyebrow">Cliente</p>
          <h2>{cliente?.nombre}</h2>
          <p className="muted-text">
            Tipo: <strong>{cliente?.tipo}</strong> {cliente?.email ? `• ${cliente.email}` : ''}
          </p>
        </div>
        <Link className="ghost-btn" to="/panel-admin/clientes">
          <FiArrowLeft aria-hidden="true" />
          Volver a clientes
        </Link>
      </div>

      <article className="crud-card entity-overview-grid">
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiMapPin aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Sitios activos</p>
            <p className="entity-overview-value">{activeSitiosCount}</p>
          </div>
        </div>
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiLayers aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Sitios con departamentos</p>
            <p className="entity-overview-value">{sitiosWithUnidadesCount}</p>
          </div>
        </div>
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiHome aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Departamentos totales</p>
            <p className="entity-overview-value">{totalUnidadesCount}</p>
          </div>
        </div>
      </article>

      <article className="crud-card">
        <div className="section-title-row">
          <h3>Sitios asociados</h3>
          <button type="button" className="primary-btn" onClick={startCreateSitio}>
            {showCreateSitio && !editingSitioId ? <FiX aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
            {showCreateSitio && !editingSitioId ? 'Cancelar' : 'Nuevo sitio'}
          </button>
        </div>

        <label className="inline-check">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Mostrar sitios dados de baja
        </label>

        {showCreateSitio && (
          <form className="crud-form" onSubmit={handleSaveSitio}>
            <label>
              Nombre
              <input
                value={sitioForm.nombre}
                onChange={(e) => setSitioForm((prev) => ({ ...prev, nombre: e.target.value }))}
                required
              />
            </label>
            <label>
              Tipo
              <select
                value={sitioForm.tipo}
                onChange={(e) => setSitioForm((prev) => ({ ...prev, tipo: e.target.value }))}
              >
                {SITIO_TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Direccion
              <input
                value={sitioForm.direccion}
                onChange={(e) => setSitioForm((prev) => ({ ...prev, direccion: e.target.value }))}
                required
              />
            </label>
            <label>
              Ciudad
              <input
                value={sitioForm.ciudad}
                onChange={(e) => setSitioForm((prev) => ({ ...prev, ciudad: e.target.value }))}
              />
            </label>
            <label className="span-2">
              Notas
              <textarea
                rows={3}
                value={sitioForm.notas}
                onChange={(e) => setSitioForm((prev) => ({ ...prev, notas: e.target.value }))}
              />
            </label>

            {sitioError ? <p className="form-error span-2">{sitioError}</p> : null}

            <div className="form-actions span-2">
              <button className="primary-btn" type="submit" disabled={sitioSaving}>
                <FiSave aria-hidden="true" />
                {sitioSaving ? 'Guardando...' : editingSitioId ? 'Guardar cambios' : 'Guardar sitio'}
              </button>
              <button type="button" className="ghost-btn" onClick={resetSitioForm}>
                <FiX aria-hidden="true" />
                Cancelar
              </button>
            </div>
          </form>
        )}
        <br>
        </br>
        {visibleSitios.length === 0 ? (
          <p className="muted-text">Este cliente todavia no tiene sitios registrados.</p>
        ) : (
          <div className="list-grid">
            {visibleSitios.map((sitio) => {
              const archived = isArchivedRecord(sitio.notas)
              const unidadCount = sitioUnidadCountMap[sitio.id] ?? 0
              return (
              <article className="list-item" key={sitio.id}>
                <div>
                  <h4 className="list-title-with-icon">
                    <FiMapPin aria-hidden="true" />
                    {sitio.nombre}
                  </h4>
                  <p>
                    {sitio.tipo} • {sitio.direccion}
                  </p>
                  {sitio.ciudad ? <p>{sitio.ciudad}</p> : null}
                  <div className="status-chip-row">
                    <span className={`status-chip ${unidadCount > 0 ? 'ok' : 'empty'}`}>
                      {unidadCount > 0 ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
                      {unidadCount > 0
                        ? `${unidadCount} departamento${unidadCount > 1 ? 's' : ''}`
                        : 'Sin departamentos'}
                    </span>
                  </div>
                  {archived ? <p className="warning-chip">Dado de baja</p> : null}
                </div>
                <div className="item-actions">
                  <button type="button" className="ghost-btn" onClick={() => startEditSitio(sitio)}>
                    <FiEdit2 aria-hidden="true" />
                    Editar
                  </button>
                  {archived ? (
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={sitioActionLoadingId === sitio.id}
                      onClick={() => void handleRestoreSitio(sitio)}
                    >
                      <FiRotateCcw aria-hidden="true" />
                      Rehabilitar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="danger-btn"
                      disabled={sitioActionLoadingId === sitio.id}
                      onClick={() => void handleBajaSitio(sitio)}
                    >
                      <FiArchive aria-hidden="true" />
                      Dar de baja
                    </button>
                  )}
                  <Link className="ghost-btn" to={`/panel-admin/clientes/${clienteId}/sitios/${sitio.id}`}>
                    <FiEye aria-hidden="true" />
                    Ver detalle
                  </Link>
                </div>
              </article>
              )
            })}
          </div>
        )}
      </article>
    </section>
  )
}
