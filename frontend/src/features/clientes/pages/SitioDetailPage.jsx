import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArchive, FiCheckCircle, FiEdit3, FiExternalLink, FiHome, FiMapPin, FiRotateCcw, FiUsers, FiXCircle } from 'react-icons/fi'
import { apiClient, ApiError } from '../../../lib/apiClient'

const initialUnidadForm = {
  identificador: '',
  piso: '',
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

export function SitioDetailPage() {
  const { clienteId, sitioId } = useParams()

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [sitio, setSitio] = useState(null)
  const [unidades, setUnidades] = useState([])
  const [unidadOcupanteCountMap, setUnidadOcupanteCountMap] = useState({})

  const [showCreateUnidad, setShowCreateUnidad] = useState(false)
  const [editingUnidadId, setEditingUnidadId] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [unidadForm, setUnidadForm] = useState(initialUnidadForm)
  const [unidadSaving, setUnidadSaving] = useState(false)
  const [unidadActionLoadingId, setUnidadActionLoadingId] = useState('')
  const [unidadError, setUnidadError] = useState('')

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

  const loadData = useMemo(
    () =>
      async function fetchData() {
        if (!sitioId || !clienteId) {
          return
        }

        setLoading(true)
        setPageError('')

        let sitioData
        let unidadRows

        try {
          ;[sitioData, unidadRows] = await Promise.all([
            apiClient.get(`/sitios/${sitioId}`),
            apiClient.get(`/unidades?sitioId=${sitioId}`),
          ])
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 404) {
            setPageError('No se encontro el sitio solicitado para este cliente.')
          } else {
            const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el sitio'
            setPageError(message || 'No se pudo cargar el sitio')
          }
          setUnidadOcupanteCountMap({})
          setLoading(false)
          return
        }

        if (!sitioData || sitioData.clienteId !== clienteId) {
          setPageError('No se encontro el sitio solicitado para este cliente.')
          setUnidadOcupanteCountMap({})
          setLoading(false)
          return
        }

        unidadRows = unidadRows ?? []
        const activeUnidadIds = unidadRows
          .filter((item) => !isArchivedRecord(item.notas))
          .map((item) => item.id)

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
            setPageError(message || 'No se pudo validar el estado de ocupantes')
            setSitio(sitioData)
            setUnidades(unidadRows)
            setUnidadOcupanteCountMap({})
            setLoading(false)
            return
          }
        }

        setSitio(sitioData)
        setUnidades(unidadRows)
        setUnidadOcupanteCountMap(ocupanteCountMap)
        setLoading(false)
      },
    [clienteId, sitioId],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  const resetUnidadForm = () => {
    setShowCreateUnidad(false)
    setEditingUnidadId('')
    setUnidadForm(initialUnidadForm)
    setUnidadError('')
  }

  const startCreateUnidad = () => {
    if (showCreateUnidad && !editingUnidadId) {
      resetUnidadForm()
      return
    }

    setShowCreateUnidad(true)
    setEditingUnidadId('')
    setUnidadForm(initialUnidadForm)
    setUnidadError('')
  }

  const startEditUnidad = (unidad) => {
    setShowCreateUnidad(true)
    setEditingUnidadId(unidad.id)
    setUnidadForm({
      identificador: unidad.identificador ?? '',
      piso: unidad.piso ?? '',
      notas: removeArchiveFlag(unidad.notas) ?? '',
    })
    setUnidadError('')
  }

  const handleSaveUnidad = async (event) => {
    event.preventDefault()
    if (!sitioId) {
      return
    }

    setUnidadSaving(true)
    setUnidadError('')

    const identificador = unidadForm.identificador.trim()

    if (!identificador) {
      setUnidadError('El identificador es obligatorio.')
      setUnidadSaving(false)
      return
    }

    const basePayload = {
      identificador,
      piso: unidadForm.piso.trim() || null,
      notas: unidadForm.notas.trim() || null,
    }

    try {
      if (editingUnidadId) {
        await apiClient.put(`/unidades/${editingUnidadId}`, basePayload)
      } else {
        await apiClient.post('/unidades', { ...basePayload, sitioId })
      }
    } catch (saveError) {
      const message = saveError instanceof ApiError ? saveError.message : 'No se pudo guardar la unidad'
      setUnidadError(message || 'No se pudo guardar la unidad')
      setUnidadSaving(false)
      return
    }

    resetUnidadForm()
    setUnidadSaving(false)
    await loadData()
  }

  const handleBajaUnidad = async (unidad) => {
    const confirmed = window.confirm(
      `Dar de baja la unidad "${unidad.identificador}"? Se ocultara de la vista principal.`,
    )

    if (!confirmed) {
      return
    }

    setUnidadActionLoadingId(unidad.id)

    try {
      await apiClient.put(`/unidades/${unidad.id}`, {
        identificador: unidad.identificador,
        piso: unidad.piso,
        notas: addArchiveFlag(unidad.notas),
      })
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo dar de baja la unidad'
      setUnidadError(message || 'No se pudo dar de baja la unidad')
      setUnidadActionLoadingId('')
      return
    }

    setUnidadActionLoadingId('')
    await loadData()
  }

  const handleRestoreUnidad = async (unidad) => {
    setUnidadActionLoadingId(unidad.id)

    try {
      await apiClient.put(`/unidades/${unidad.id}`, {
        identificador: unidad.identificador,
        piso: unidad.piso,
        notas: removeArchiveFlag(unidad.notas),
      })
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo rehabilitar la unidad'
      setUnidadError(message || 'No se pudo rehabilitar la unidad')
      setUnidadActionLoadingId('')
      return
    }

    setUnidadActionLoadingId('')
    await loadData()
  }

  if (loading) {
    return <section className="placeholder-card">Cargando sitio...</section>
  }

  if (pageError) {
    return (
      <section className="placeholder-card">
        <h2>Detalle de sitio</h2>
        <p className="form-error">{pageError}</p>
      </section>
    )
  }

  return (
    <section className="crud-shell">
      <div className="crud-header">
        <div>
          <p className="eyebrow">Sitio</p>
          <h2>{sitio?.nombre}</h2>
          <p className="muted-text">
            {sitio?.tipo} • {sitio?.direccion}
          </p>
        </div>
        <div className="header-actions">
          <Link className="ghost-btn" to={`/panel-admin/clientes/${clienteId}`}>
            Volver al cliente
          </Link>
        </div>
      </div>

      <article className="crud-card entity-overview-grid">
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiHome aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Departamentos activos</p>
            <p className="entity-overview-value">{activeUnidadesCount}</p>
          </div>
        </div>
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiUsers aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Departamentos con ocupantes</p>
            <p className="entity-overview-value">{unidadesWithOcupantesCount}</p>
          </div>
        </div>
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiMapPin aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Ocupantes totales</p>
            <p className="entity-overview-value">{totalOcupantesCount}</p>
          </div>
        </div>
      </article>

      <article className="crud-card">
        <div className="section-title-row">
          <h3>Unidades</h3>
          <button
            type="button"
            className="primary-btn"
            onClick={startCreateUnidad}
          >
            {showCreateUnidad && !editingUnidadId ? 'Cancelar' : 'Nueva unidad'}
          </button>
        </div>

        <label className="inline-check">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Mostrar unidades dadas de baja
        </label>

        <div className="units-management-layout">
        {showCreateUnidad && (
          <form className="crud-form unit-editor" aria-label="Formulario de unidad" onSubmit={handleSaveUnidad}>
            <label>
              Identificador
              <input
                value={unidadForm.identificador}
                onChange={(e) => setUnidadForm((prev) => ({ ...prev, identificador: e.target.value }))}
                placeholder="Ej: 3B"
                required
              />
            </label>
            <label>
              Piso
              <input
                value={unidadForm.piso}
                onChange={(e) => setUnidadForm((prev) => ({ ...prev, piso: e.target.value }))}
                placeholder="Ej: 3"
              />
            </label>
            <label className="span-2">
              Notas
              <textarea
                rows={3}
                value={unidadForm.notas}
                onChange={(e) => setUnidadForm((prev) => ({ ...prev, notas: e.target.value }))}
              />
            </label>

            {unidadError ? <p className="form-error span-2">{unidadError}</p> : null}

            <div className="form-actions span-2">
              <button className="primary-btn" type="submit" disabled={unidadSaving}>
                {unidadSaving ? 'Guardando...' : editingUnidadId ? 'Guardar cambios' : 'Guardar unidad'}
              </button>
              <button type="button" className="ghost-btn" onClick={resetUnidadForm}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {visibleUnidades.length === 0 ? (
          <p className="muted-text">Aun no hay unidades para este sitio.</p>
        ) : (
          <div className="data-grid-shell compact-shell units-grid-shell">
            <div className="data-grid-table units-grid" role="table" aria-label="Unidades del sitio">
              <div className="data-grid-head" role="row">
                <span role="columnheader">Unidad</span>
                <span role="columnheader">Ubicación</span>
                <span role="columnheader">Personas</span>
                <span role="columnheader">Situación</span>
                <span role="columnheader">Gestionar</span>
              </div>
              {visibleUnidades.map((unidad) => {
                const archived = isArchivedRecord(unidad.notas)
                const ocupanteCount = unidadOcupanteCountMap[unidad.id] ?? 0
                const notes = removeArchiveFlag(unidad.notas)
                return (
                  <article className="data-grid-row" role="row" key={unidad.id}>
                    <div className="data-grid-cell data-grid-primary" role="cell" data-label="Unidad">
                      <strong className="list-title-with-icon">
                        <FiHome aria-hidden="true" />
                        {unidad.identificador}
                      </strong>
                      {notes ? <span className="unit-notes">{notes}</span> : null}
                    </div>
                    <div className="data-grid-cell" role="cell" data-label="Ubicación">
                      <span>{unidad.piso ? `Piso ${unidad.piso}` : 'Sin ubicación indicada'}</span>
                    </div>
                    <div className="data-grid-cell" role="cell" data-label="Personas">
                      <span className={`status-chip ${ocupanteCount > 0 ? 'ok' : 'empty'}`}>
                        {ocupanteCount > 0 ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
                        {ocupanteCount > 0
                          ? `${ocupanteCount} persona${ocupanteCount > 1 ? 's' : ''}`
                          : 'Sin personas asignadas'}
                      </span>
                    </div>
                    <div className="data-grid-cell" role="cell" data-label="Situación">
                      {archived ? <span className="warning-chip">Inactiva</span> : <span className="status-chip ok">Activa</span>}
                    </div>
                    <div className="data-grid-cell data-grid-actions" role="cell" data-label="Gestionar">
                      <button
                        type="button"
                        className="ghost-btn minimal-btn unit-action-btn"
                        aria-label={`Modificar unidad ${unidad.identificador}`}
                        title="Modificar unidad"
                        onClick={() => startEditUnidad(unidad)}
                      >
                        <FiEdit3 aria-hidden="true" />
                        <span className="unit-action-label">Modificar</span>
                      </button>
                      {archived ? (
                        <button
                          type="button"
                          className="ghost-btn minimal-btn unit-action-btn"
                          disabled={unidadActionLoadingId === unidad.id}
                          aria-label={`Activar unidad ${unidad.identificador}`}
                          title="Activar unidad"
                          onClick={() => void handleRestoreUnidad(unidad)}
                        >
                          <FiRotateCcw aria-hidden="true" />
                          <span className="unit-action-label">Activar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="danger-btn minimal-btn unit-action-btn"
                          disabled={unidadActionLoadingId === unidad.id}
                          aria-label={`Desactivar unidad ${unidad.identificador}`}
                          title="Desactivar unidad"
                          onClick={() => void handleBajaUnidad(unidad)}
                        >
                          <FiArchive aria-hidden="true" />
                          <span className="unit-action-label">Desactivar</span>
                        </button>
                      )}
                      <Link
                        className="ghost-btn minimal-btn unit-action-btn"
                        aria-label={`Abrir ficha de la unidad ${unidad.identificador}`}
                        title="Abrir ficha"
                        to={`/panel-admin/clientes/${clienteId}/sitios/${sitioId}/unidades/${unidad.id}`}
                      >
                        <FiExternalLink aria-hidden="true" />
                        <span className="unit-action-label">Abrir ficha</span>
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
        </div>
      </article>
    </section>
  )
}
