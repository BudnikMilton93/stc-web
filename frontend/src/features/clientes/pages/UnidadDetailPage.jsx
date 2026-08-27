import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FiCheckCircle,
  FiCpu,
  FiHome,
  FiLock,
  FiMapPin,
  FiPlusCircle,
  FiTool,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'
import { supabase } from '../../../lib/supabase'
import { toFriendlySupabaseError } from '../../../lib/supabaseErrors'

const TIPOS_ACTIVO = ['camara', 'portero', 'cerradura_magnetica', 'otro']

const initialOcupanteForm = {
  nombre: '',
  telefono: '',
  email: '',
  es_titular: true,
  notas: '',
}

const initialActivoForm = {
  tipo: 'camara',
  marca: '',
  modelo: '',
  numero_serie: '',
  fecha_instalacion: '',
  garantia_hasta: '',
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

export function UnidadDetailPage() {
  const { clienteId, sitioId, unidadId } = useParams()

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const [unidad, setUnidad] = useState(null)
  const [sitio, setSitio] = useState(null)
  const [cliente, setCliente] = useState(null)
  const [ocupantes, setOcupantes] = useState([])
  const [activos, setActivos] = useState([])

  const [showOcupanteForm, setShowOcupanteForm] = useState(false)
  const [editingOcupanteId, setEditingOcupanteId] = useState('')
  const [includeArchivedOcupantes, setIncludeArchivedOcupantes] = useState(false)
  const [ocupanteForm, setOcupanteForm] = useState(initialOcupanteForm)
  const [ocupanteSaving, setOcupanteSaving] = useState(false)
  const [ocupanteActionLoadingId, setOcupanteActionLoadingId] = useState('')
  const [ocupanteError, setOcupanteError] = useState('')

  const [editingActivoId, setEditingActivoId] = useState('')
  const [includeInactiveActivos, setIncludeInactiveActivos] = useState(false)
  const [activoForm, setActivoForm] = useState(initialActivoForm)
  const [activoSaving, setActivoSaving] = useState(false)
  const [activoActionLoadingId, setActivoActionLoadingId] = useState('')
  const [activoError, setActivoError] = useState('')

  const [ocupanteQuery, setOcupanteQuery] = useState('')
  const [selectedOcupanteId, setSelectedOcupanteId] = useState('')
  const [activeManager, setActiveManager] = useState(null)

  const selectableOcupantes = useMemo(
    () => ocupantes.filter((item) => !isArchivedRecord(item.notas)),
    [ocupantes],
  )

  const visibleOcupantes = useMemo(() => {
    if (includeArchivedOcupantes) {
      return ocupantes
    }

    return ocupantes.filter((item) => !isArchivedRecord(item.notas))
  }, [includeArchivedOcupantes, ocupantes])

  const visibleActivos = useMemo(() => {
    if (includeInactiveActivos) {
      return activos
    }

    return activos.filter((item) => item.estado !== 'de_baja')
  }, [activos, includeInactiveActivos])

  const activeOcupantesCount = useMemo(
    () => ocupantes.filter((item) => !isArchivedRecord(item.notas)).length,
    [ocupantes],
  )

  const activeActivosCount = useMemo(
    () => activos.filter((item) => item.estado !== 'de_baja').length,
    [activos],
  )

  const canCreateActivo = activeOcupantesCount > 0
  const isActivoFormLocked = !editingActivoId && !canCreateActivo

  const filteredOcupantes = useMemo(() => {
    const query = ocupanteQuery.trim().toLowerCase()
    if (!query) {
      return selectableOcupantes
    }
    return selectableOcupantes.filter((item) => item.nombre.toLowerCase().includes(query))
  }, [ocupanteQuery, selectableOcupantes])

  const selectedOcupante = useMemo(
    () => selectableOcupantes.find((item) => item.id === selectedOcupanteId) ?? null,
    [selectableOcupantes, selectedOcupanteId],
  )

  const loadData = useMemo(
    () =>
      async function fetchData() {
        if (!unidadId || !sitioId || !clienteId) {
          return
        }

        setLoading(true)
        setPageError('')

        const unidadResult = await supabase
          .from('unidades')
          .select('id, sitio_id, identificador, piso, notas, created_at')
          .eq('id', unidadId)
          .eq('sitio_id', sitioId)
          .maybeSingle()

        if (unidadResult.error) {
          setPageError(toFriendlySupabaseError(unidadResult.error, 'No se pudo cargar la unidad'))
          setLoading(false)
          return
        }

        if (!unidadResult.data) {
          setPageError('No se encontro la unidad solicitada para este sitio.')
          setLoading(false)
          return
        }

        const [sitioResult, clienteResult, ocupantesResult, activosResult] = await Promise.all([
          supabase
            .from('sitios')
            .select('id, cliente_id, nombre, tipo, direccion')
            .eq('id', sitioId)
            .eq('cliente_id', clienteId)
            .maybeSingle(),
          supabase.from('clientes').select('id, nombre').eq('id', clienteId).maybeSingle(),
          supabase
            .from('ocupantes')
            .select('id, unidad_id, nombre, telefono, email, es_titular, notas, created_at')
            .eq('unidad_id', unidadId)
            .order('created_at', { ascending: false }),
          supabase
            .from('activos')
            .select(
              'id, cliente_id, sitio_id, unidad_id, ocupante_id, tipo, marca, modelo, numero_serie, fecha_instalacion, garantia_hasta, estado, notas, created_at',
            )
            .eq('unidad_id', unidadId)
            .order('created_at', { ascending: false }),
        ])

        if (sitioResult.error || !sitioResult.data) {
          setPageError(
            sitioResult.error
              ? toFriendlySupabaseError(sitioResult.error, 'No se pudo validar el sitio')
              : 'No se encontro el sitio asociado a esta unidad.',
          )
          setLoading(false)
          return
        }

        if (clienteResult.error || !clienteResult.data) {
          setPageError(
            clienteResult.error
              ? toFriendlySupabaseError(clienteResult.error, 'No se pudo validar el cliente')
              : 'No se encontro el cliente asociado a este sitio.',
          )
          setLoading(false)
          return
        }

        if (ocupantesResult.error) {
          setPageError(toFriendlySupabaseError(ocupantesResult.error, 'No se pudieron cargar los ocupantes'))
          setLoading(false)
          return
        }

        if (activosResult.error) {
          setPageError(toFriendlySupabaseError(activosResult.error, 'No se pudieron cargar los activos'))
          setLoading(false)
          return
        }

        setUnidad(unidadResult.data)
        setSitio(sitioResult.data)
        setCliente(clienteResult.data)
        setOcupantes(ocupantesResult.data ?? [])
        setActivos(activosResult.data ?? [])
        setLoading(false)
      },
    [clienteId, sitioId, unidadId],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  const resetOcupanteForm = () => {
    setShowOcupanteForm(false)
    setEditingOcupanteId('')
    setOcupanteForm(initialOcupanteForm)
    setOcupanteError('')
  }

  const startCreateOcupante = () => {
    if (showOcupanteForm && !editingOcupanteId) {
      resetOcupanteForm()
      return
    }

    setShowOcupanteForm(true)
    setEditingOcupanteId('')
    setOcupanteForm(initialOcupanteForm)
    setOcupanteError('')
  }

  const startEditOcupante = (ocupante) => {
    setActiveManager('ocupantes')
    setShowOcupanteForm(true)
    setEditingOcupanteId(ocupante.id)
    setOcupanteForm({
      nombre: ocupante.nombre ?? '',
      telefono: ocupante.telefono ?? '',
      email: ocupante.email ?? '',
      es_titular: Boolean(ocupante.es_titular),
      notas: removeArchiveFlag(ocupante.notas) ?? '',
    })
    setOcupanteError('')
  }

  const saveOcupante = async (event) => {
    event.preventDefault()
    if (!unidadId) {
      return
    }

    setOcupanteSaving(true)
    setOcupanteError('')

    const payload = {
      unidad_id: unidadId,
      nombre: ocupanteForm.nombre.trim(),
      telefono: ocupanteForm.telefono.trim() || null,
      email: ocupanteForm.email.trim() || null,
      es_titular: ocupanteForm.es_titular,
      notas: ocupanteForm.notas.trim() || null,
    }

    if (!payload.nombre) {
      setOcupanteError('El nombre del ocupante es obligatorio.')
      setOcupanteSaving(false)
      return
    }

    const query = editingOcupanteId
      ? supabase.from('ocupantes').update(payload).eq('id', editingOcupanteId).select('id, nombre').maybeSingle()
      : supabase.from('ocupantes').insert(payload).select('id, nombre').maybeSingle()

    const { data, error } = await query

    if (error) {
      setOcupanteError(toFriendlySupabaseError(error, 'No se pudo guardar el ocupante'))
      setOcupanteSaving(false)
      return
    }

    resetOcupanteForm()
    setOcupanteSaving(false)

    await loadData()

    if (data?.id) {
      setSelectedOcupanteId(data.id)
      setOcupanteQuery(data.nombre)
    }
  }

  const handleBajaOcupante = async (ocupante) => {
    const confirmed = window.confirm(
      `Dar de baja al ocupante "${ocupante.nombre}"? Se ocultara de la vista principal.`,
    )

    if (!confirmed) {
      return
    }

    setOcupanteActionLoadingId(ocupante.id)
    const { error } = await supabase
      .from('ocupantes')
      .update({ notas: addArchiveFlag(ocupante.notas) })
      .eq('id', ocupante.id)

    if (error) {
      setOcupanteError(toFriendlySupabaseError(error, 'No se pudo dar de baja el ocupante'))
      setOcupanteActionLoadingId('')
      return
    }

    if (selectedOcupanteId === ocupante.id) {
      setSelectedOcupanteId('')
      setOcupanteQuery('')
    }

    setOcupanteActionLoadingId('')
    await loadData()
  }

  const handleRestoreOcupante = async (ocupante) => {
    setOcupanteActionLoadingId(ocupante.id)
    const { error } = await supabase
      .from('ocupantes')
      .update({ notas: removeArchiveFlag(ocupante.notas) })
      .eq('id', ocupante.id)

    if (error) {
      setOcupanteError(toFriendlySupabaseError(error, 'No se pudo rehabilitar el ocupante'))
      setOcupanteActionLoadingId('')
      return
    }

    setOcupanteActionLoadingId('')
    await loadData()
  }

  const resetActivoForm = () => {
    setEditingActivoId('')
    setActivoForm(initialActivoForm)
    setSelectedOcupanteId('')
    setOcupanteQuery('')
    setActivoError('')
  }

  const startEditActivo = (activo) => {
    setActiveManager('activos')
    setEditingActivoId(activo.id)
    setActivoForm({
      tipo: activo.tipo,
      marca: activo.marca ?? '',
      modelo: activo.modelo ?? '',
      numero_serie: activo.numero_serie ?? '',
      fecha_instalacion: activo.fecha_instalacion ?? '',
      garantia_hasta: activo.garantia_hasta ?? '',
      notas: activo.notas ?? '',
    })

    const owner = selectableOcupantes.find((item) => item.id === activo.ocupante_id)
    if (owner) {
      setSelectedOcupanteId(owner.id)
      setOcupanteQuery(owner.nombre)
    } else {
      setSelectedOcupanteId('')
      setOcupanteQuery('')
    }

    setActivoError('')
  }

  const saveActivo = async (event) => {
    event.preventDefault()
    if (!unidadId || !sitioId || !clienteId) {
      return
    }

    setActivoSaving(true)
    setActivoError('')

    if (!selectedOcupanteId) {
      setActivoError('Debes seleccionar un ocupante existente de la unidad o crearlo antes de guardar.')
      setActivoSaving(false)
      return
    }

    const payload = {
      cliente_id: clienteId,
      sitio_id: sitioId,
      unidad_id: unidadId,
      ocupante_id: selectedOcupanteId,
      tipo: activoForm.tipo,
      marca: activoForm.marca.trim() || null,
      modelo: activoForm.modelo.trim() || null,
      numero_serie: activoForm.numero_serie.trim() || null,
      fecha_instalacion: activoForm.fecha_instalacion || null,
      garantia_hasta: activoForm.garantia_hasta || null,
      notas: activoForm.notas.trim() || null,
    }

    const query = editingActivoId
      ? supabase.from('activos').update(payload).eq('id', editingActivoId)
      : supabase.from('activos').insert(payload)

    const { error } = await query

    if (error) {
      setActivoError(toFriendlySupabaseError(error, 'No se pudo guardar el activo'))
      setActivoSaving(false)
      return
    }

    resetActivoForm()
    setActivoSaving(false)
    await loadData()
  }

  const handleBajaActivo = async (activo) => {
    const confirmed = window.confirm(
      `Dar de baja el activo "${activo.numero_serie || activo.tipo}"?`,
    )

    if (!confirmed) {
      return
    }

    setActivoActionLoadingId(activo.id)
    const { error } = await supabase
      .from('activos')
      .update({ estado: 'de_baja' })
      .eq('id', activo.id)

    if (error) {
      setActivoError(toFriendlySupabaseError(error, 'No se pudo dar de baja el activo'))
      setActivoActionLoadingId('')
      return
    }

    setActivoActionLoadingId('')
    await loadData()
  }

  const handleRestoreActivo = async (activo) => {
    setActivoActionLoadingId(activo.id)
    const { error } = await supabase
      .from('activos')
      .update({ estado: 'activo' })
      .eq('id', activo.id)

    if (error) {
      setActivoError(toFriendlySupabaseError(error, 'No se pudo rehabilitar el activo'))
      setActivoActionLoadingId('')
      return
    }

    setActivoActionLoadingId('')
    await loadData()
  }

  const pickOcupante = (id, nombre) => {
    setSelectedOcupanteId(id)
    setOcupanteQuery(nombre)
  }

  const goToOcupantesForm = () => {
    setActiveManager('ocupantes')
    setShowOcupanteForm(true)
    setEditingOcupanteId('')
    setOcupanteError('')
  }

  if (loading) {
    return <section className="placeholder-card">Cargando unidad...</section>
  }

  if (pageError) {
    return (
      <section className="placeholder-card">
        <h2>Detalle de unidad</h2>
        <p className="form-error">{pageError}</p>
      </section>
    )
  }

  return (
    <section className="crud-shell">
      <div className="crud-header">
        <div>
          <p className="eyebrow">Unidad</p>
          <h2>
            {sitio?.nombre} • {unidad?.identificador}
          </h2>
          <p className="muted-text">Cliente: {cliente?.nombre}</p>
        </div>
        <Link className="ghost-btn" to={`/panel-admin/clientes/${clienteId}/sitios/${sitioId}`}>
          Volver al sitio
        </Link>
      </div>

      <article className="crud-card entity-overview-grid">
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiMapPin aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Sitio</p>
            <p className="entity-overview-value text">{sitio?.nombre || '-'}</p>
          </div>
        </div>
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiUsers aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Ocupantes activos</p>
            <p className="entity-overview-value">{activeOcupantesCount}</p>
          </div>
        </div>
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiCpu aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Activos activos</p>
            <p className="entity-overview-value">{activeActivosCount}</p>
          </div>
        </div>
      </article>

      {activeManager ? (
        <div className="manager-context-bar">
          <p>
            Gestionando: <strong>{activeManager === 'ocupantes' ? 'ocupantes' : 'activos'}</strong>
          </p>
          <button type="button" className="ghost-btn minimal-btn" onClick={() => setActiveManager(null)}>
            Cambiar gestion
          </button>
        </div>
      ) : (
        <article className="crud-card management-selector">
          <div className="management-selector-heading">
            <p className="eyebrow">Gestion de la unidad</p>
            <h3>Que quieres administrar?</h3>
            <p className="muted-text">Elige un modulo para trabajar de forma individual.</p>
          </div>
          <div className="management-options">
            <button type="button" className="management-option occupants-option" onClick={() => setActiveManager('ocupantes')}>
              <span className="management-option-icon"><FiUsers aria-hidden="true" /></span>
              <span className="management-option-copy">
                <strong>Gestionar ocupantes</strong>
                <span>Altas, edicion y bajas de las personas de esta unidad.</span>
              </span>
              <span className="management-option-count">{activeOcupantesCount}</span>
            </button>
            <button type="button" className="management-option assets-option" onClick={() => setActiveManager('activos')}>
              <span className="management-option-icon"><FiCpu aria-hidden="true" /></span>
              <span className="management-option-copy">
                <strong>Gestionar activos</strong>
                <span>Inventario y asignacion de equipos a un ocupante.</span>
              </span>
              <span className="management-option-count">{activeActivosCount}</span>
            </button>
          </div>
        </article>
      )}

      {activeManager === 'ocupantes' ? (
        <article className="crud-card card-intent-occupants">
          <div className="section-title-row">
            <h3 className="list-title-with-icon">
              <FiUsers aria-hidden="true" />
              Gestion de ocupantes
            </h3>
            <button
              type="button"
              className="primary-btn minimal-btn"
              onClick={startCreateOcupante}
            >
              {showOcupanteForm && !editingOcupanteId ? 'Cancelar' : 'Nuevo ocupante'}
            </button>
          </div>

          <p className="muted-text section-help-text">
            <FiUserPlus aria-hidden="true" />
            Primero crea o edita ocupantes. Luego asignalos a los activos desde la columna derecha.
          </p>
          <div>
            {canCreateActivo ? (
              <p className="step-success-note">
                <FiCheckCircle aria-hidden="true" />
                Ya puedes pasar al Paso 2 y dar de alta activos.
              </p>
            ) : (
              <p className="step-warning-note">
                <FiLock aria-hidden="true" />
                Aun no hay ocupantes activos en esta unidad. Este paso es obligatorio para habilitar activos.
              </p>
            )}
          </div>

          <label className="inline-check">
            <input
              type="checkbox"
              checked={includeArchivedOcupantes}
              onChange={(event) => setIncludeArchivedOcupantes(event.target.checked)}
            />
            Mostrar ocupantes dados de baja
          </label>
          
          <div className="mb-4">
            {showOcupanteForm && (
              <form className="crud-form" onSubmit={saveOcupante}>
                <label>
                  Nombre
                  <input
                    value={ocupanteForm.nombre}
                    onChange={(e) => setOcupanteForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Telefono
                  <input
                    value={ocupanteForm.telefono}
                    onChange={(e) =>
                      setOcupanteForm((prev) => ({ ...prev, telefono: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={ocupanteForm.email}
                    onChange={(e) => setOcupanteForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </label>
                <label>
                  Titular
                  <select
                    value={ocupanteForm.es_titular ? 'si' : 'no'}
                    onChange={(e) =>
                      setOcupanteForm((prev) => ({ ...prev, es_titular: e.target.value === 'si' }))
                    }
                  >
                    <option value="si">Si</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="span-2">
                  Notas
                  <textarea
                    rows={3}
                    value={ocupanteForm.notas}
                    onChange={(e) => setOcupanteForm((prev) => ({ ...prev, notas: e.target.value }))}
                  />
                </label>

                {ocupanteError ? <p className="form-error span-2">{ocupanteError}</p> : null}

                <div className="form-actions span-2">
                  <button className="primary-btn minimal-btn" type="submit" disabled={ocupanteSaving}>
                    {ocupanteSaving
                      ? 'Guardando...'
                      : editingOcupanteId
                        ? 'Guardar cambios'
                        : 'Guardar ocupante'}
                  </button>
                  <button type="button" className="ghost-btn minimal-btn" onClick={resetOcupanteForm}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {visibleOcupantes.length === 0 ? (
            <p className="muted-text">Aun no hay ocupantes en esta unidad.</p>
          ) : (
            <div className="data-grid-shell compact-shell">
              <div className="data-grid-table occupants-grid" role="table" aria-label="Ocupantes de la unidad">
                <div className="data-grid-head" role="row">
                  <span role="columnheader">Ocupante</span>
                  <span role="columnheader">Contacto</span>
                  <span role="columnheader">Rol</span>
                  <span role="columnheader">Estado</span>
                  <span role="columnheader">Acciones</span>
                </div>
              {visibleOcupantes.map((item) => {
                const archived = isArchivedRecord(item.notas)
                return (
                <article className="data-grid-row" role="row" key={item.id}>
                  <div className="data-grid-cell data-grid-primary" role="cell" data-label="Ocupante">
                    <strong>{item.nombre}</strong>
                  </div>
                  <div className="data-grid-cell" role="cell" data-label="Contacto">
                    <span>{item.telefono || 'Sin telefono'}</span>
                    <span>{item.email || 'Sin email'}</span>
                  </div>
                  <div className="data-grid-cell" role="cell" data-label="Rol">
                    <span>{item.es_titular ? 'Titular' : 'No titular'}</span>
                  </div>
                  <div className="data-grid-cell" role="cell" data-label="Estado">
                    {archived ? <span className="warning-chip">Dado de baja</span> : <span className="status-chip ok">Activo</span>}
                  </div>
                  <div className="data-grid-cell data-grid-actions" role="cell" data-label="Acciones">
                    <button type="button" className="ghost-btn minimal-btn" onClick={() => startEditOcupante(item)}>
                      Editar
                    </button>
                    {archived ? (
                      <button
                        type="button"
                        className="ghost-btn minimal-btn"
                        disabled={ocupanteActionLoadingId === item.id}
                        onClick={() => void handleRestoreOcupante(item)}
                      >
                        Rehabilitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="danger-btn minimal-btn"
                        disabled={ocupanteActionLoadingId === item.id}
                        onClick={() => void handleBajaOcupante(item)}
                      >
                        Dar de baja
                      </button>
                    )}
                  </div>
                </article>
                )
              })}
              </div>
            </div>
          )}
        </article>
      ) : activeManager === 'activos' ? (
        <article className="crud-card card-intent-assets">
          <div className="section-title-row">
            <h3 className="list-title-with-icon">
              <FiCpu aria-hidden="true" />
              {editingActivoId ? 'Editar activo' : 'Gestion de activos'}
            </h3>
            {editingActivoId ? (
              <button type="button" className="ghost-btn minimal-btn" onClick={resetActivoForm}>
                Cancelar edicion
              </button>
            ) : null}
          </div>

          <p className="muted-text section-help-text">
            <FiTool aria-hidden="true" />
            Cada activo debe quedar asociado a un ocupante existente de esta unidad.
          </p>

          {isActivoFormLocked ? (
            <div className="step-warning-box" role="status" aria-live="polite">
              <p>
                <FiLock aria-hidden="true" />
                Alta de activo bloqueada: primero debes completar el alta de al menos 1 ocupante.
              </p>
              <button type="button" className="ghost-btn minimal-btn" onClick={goToOcupantesForm}>
                <FiUserPlus aria-hidden="true" />
                Ir a alta de ocupante
              </button>
            </div>
          ) : null}

          <form className="crud-form" onSubmit={saveActivo}>
            <label>
              Tipo
              <select
                value={activoForm.tipo}
                disabled={isActivoFormLocked}
                onChange={(e) => setActivoForm((prev) => ({ ...prev, tipo: e.target.value }))}
              >
                {TIPOS_ACTIVO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Marca
              <input
                value={activoForm.marca}
                disabled={isActivoFormLocked}
                onChange={(e) => setActivoForm((prev) => ({ ...prev, marca: e.target.value }))}
              />
            </label>
            <label>
              Modelo
              <input
                value={activoForm.modelo}
                disabled={isActivoFormLocked}
                onChange={(e) => setActivoForm((prev) => ({ ...prev, modelo: e.target.value }))}
              />
            </label>
            <label>
              Numero de serie
              <input
                value={activoForm.numero_serie}
                disabled={isActivoFormLocked}
                onChange={(e) => setActivoForm((prev) => ({ ...prev, numero_serie: e.target.value }))}
              />
            </label>
            <label>
              Fecha instalacion
              <input
                type="date"
                value={activoForm.fecha_instalacion}
                disabled={isActivoFormLocked}
                onChange={(e) =>
                  setActivoForm((prev) => ({ ...prev, fecha_instalacion: e.target.value }))
                }
              />
            </label>
            <label>
              Garantia hasta
              <input
                type="date"
                value={activoForm.garantia_hasta}
                disabled={isActivoFormLocked}
                onChange={(e) => setActivoForm((prev) => ({ ...prev, garantia_hasta: e.target.value }))}
              />
            </label>

            <div className="span-2 autocomplete-box">
              <label htmlFor="ocupante-autocomplete">Ocupante responsable (autocomplete de esta unidad)</label>
              <input
                id="ocupante-autocomplete"
                value={ocupanteQuery}
                disabled={isActivoFormLocked}
                onChange={(e) => {
                  setOcupanteQuery(e.target.value)
                  setSelectedOcupanteId('')
                }}
                placeholder="Buscar ocupante existente"
              />
              {selectedOcupante ? (
                <p className="selection-pill">Seleccionado: {selectedOcupante.nombre}</p>
              ) : (
                <p className="muted-text">Selecciona un ocupante de la lista para poder guardar el activo.</p>
              )}
              <div className="autocomplete-list" role="listbox" aria-label="Ocupantes sugeridos">
                {filteredOcupantes.slice(0, 8).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="autocomplete-option"
                    disabled={isActivoFormLocked}
                    onClick={() => pickOcupante(item.id, item.nombre)}
                  >
                    {item.nombre}
                    {item.es_titular ? ' (titular)' : ''}
                  </button>
                ))}
                {filteredOcupantes.length === 0 ? (
                  <p className="muted-text small">No hay coincidencias. Crea un ocupante nuevo.</p>
                ) : null}
              </div>
              <button type="button" className="ghost-btn minimal-btn" onClick={goToOcupantesForm}>
                <FiPlusCircle aria-hidden="true" />
                Crear ocupante nuevo
              </button>
            </div>

            <label className="span-2">
              Notas
              <textarea
                rows={3}
                value={activoForm.notas}
                disabled={isActivoFormLocked}
                onChange={(e) => setActivoForm((prev) => ({ ...prev, notas: e.target.value }))}
              />
            </label>

            {activoError ? <p className="form-error span-2">{activoError}</p> : null}

            <div className="form-actions span-2">
              <button className="primary-btn minimal-btn" type="submit" disabled={activoSaving || isActivoFormLocked}>
                {activoSaving
                  ? 'Guardando...'
                  : editingActivoId
                    ? 'Guardar cambios'
                    : 'Guardar activo'}
              </button>
            </div>
          </form>

          <hr className="divider" />

          <h3 className="list-title-with-icon">
            <FiHome aria-hidden="true" />
            Activos de la unidad
          </h3>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={includeInactiveActivos}
              onChange={(event) => setIncludeInactiveActivos(event.target.checked)}
            />
            Mostrar activos dados de baja
          </label>

          {visibleActivos.length === 0 ? (
            <p className="muted-text">Aun no hay activos cargados en esta unidad.</p>
          ) : (
            <div className="data-grid-shell compact-shell">
              <div className="data-grid-table assets-grid" role="table" aria-label="Activos de la unidad">
                <div className="data-grid-head" role="row">
                  <span role="columnheader">Activo</span>
                  <span role="columnheader">Serie</span>
                  <span role="columnheader">Ocupante</span>
                  <span role="columnheader">Estado</span>
                  <span role="columnheader">Acciones</span>
                </div>
              {visibleActivos.map((item) => {
                const owner = ocupantes.find((occ) => occ.id === item.ocupante_id)
                return (
                  <article className="data-grid-row" role="row" key={item.id}>
                    <div className="data-grid-cell data-grid-primary" role="cell" data-label="Activo">
                      <strong>{item.tipo}</strong>
                      <span>{(item.marca || 'Sin marca')} • {(item.modelo || 'Sin modelo')}</span>
                    </div>
                    <div className="data-grid-cell" role="cell" data-label="Serie">
                      <span>{item.numero_serie || 'Sin serie'}</span>
                    </div>
                    <div className="data-grid-cell" role="cell" data-label="Ocupante">
                      <span>{owner?.nombre || 'Sin asignar'}</span>
                    </div>
                    <div className="data-grid-cell" role="cell" data-label="Estado">
                      {item.estado === 'de_baja' ? (
                        <span className="warning-chip">De baja</span>
                      ) : (
                        <span className="status-chip ok">Activo</span>
                      )}
                    </div>
                    <div className="data-grid-cell data-grid-actions" role="cell" data-label="Acciones">
                      <button type="button" className="ghost-btn minimal-btn" onClick={() => startEditActivo(item)}>
                        Editar
                      </button>
                      {item.estado === 'de_baja' ? (
                        <button
                          type="button"
                          className="ghost-btn minimal-btn"
                          disabled={activoActionLoadingId === item.id}
                          onClick={() => void handleRestoreActivo(item)}
                        >
                          Rehabilitar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="danger-btn minimal-btn"
                          disabled={activoActionLoadingId === item.id}
                          onClick={() => void handleBajaActivo(item)}
                        >
                          Dar de baja
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
              </div>
            </div>
          )}
        </article>
      ) : null}
    </section>
  )
}
