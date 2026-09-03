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
import { apiClient, ApiError } from '../../../lib/apiClient'
import { Modal } from '../../../components/ui/Modal'
import { DataGrid } from '../../../components/ui/DataGrid'

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

        let clienteData
        let sitioRows

        try {
          ;[clienteData, sitioRows] = await Promise.all([
            apiClient.get(`/clientes/${clienteId}`),
            apiClient.get(`/sitios?clienteId=${clienteId}`),
          ])
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 404) {
            setPageError('No se encontro el cliente solicitado.')
          } else {
            const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el cliente'
            setPageError(message || 'No se pudo cargar el cliente')
          }
          setCliente(null)
          setSitios([])
          setSitioUnidadCountMap({})
          setLoading(false)
          return
        }

        sitioRows = sitioRows ?? []
        const activeSitioIds = sitioRows
          .filter((item) => !isArchivedRecord(item.notas))
          .map((item) => item.id)

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
            setPageError(message || 'No se pudo validar el estado de unidades')
            setCliente(clienteData)
            setSitios(sitioRows)
            setSitioUnidadCountMap({})
            setLoading(false)
            return
          }
        }

        setCliente(clienteData)
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

    const nombre = sitioForm.nombre.trim()
    const direccion = sitioForm.direccion.trim()

    if (!nombre || !direccion) {
      setSitioError('Nombre y direccion son obligatorios.')
      setSitioSaving(false)
      return
    }

    const basePayload = {
      nombre,
      tipo: sitioForm.tipo,
      direccion,
      ciudad: sitioForm.ciudad.trim() || null,
      notas: sitioForm.notas.trim() || null,
    }

    try {
      if (editingSitioId) {
        await apiClient.put(`/sitios/${editingSitioId}`, basePayload)
      } else {
        await apiClient.post('/sitios', { ...basePayload, clienteId })
      }
    } catch (saveError) {
      const message = saveError instanceof ApiError ? saveError.message : 'No se pudo guardar el sitio'
      setSitioError(message || 'No se pudo guardar el sitio')
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

    try {
      await apiClient.put(`/sitios/${sitio.id}`, {
        nombre: sitio.nombre,
        tipo: sitio.tipo,
        direccion: sitio.direccion,
        ciudad: sitio.ciudad,
        notas: addArchiveFlag(sitio.notas),
      })
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo dar de baja el sitio'
      setSitioError(message || 'No se pudo dar de baja el sitio')
      setSitioActionLoadingId('')
      return
    }

    setSitioActionLoadingId('')
    await loadData()
  }

  const handleRestoreSitio = async (sitio) => {
    setSitioActionLoadingId(sitio.id)

    try {
      await apiClient.put(`/sitios/${sitio.id}`, {
        nombre: sitio.nombre,
        tipo: sitio.tipo,
        direccion: sitio.direccion,
        ciudad: sitio.ciudad,
        notas: removeArchiveFlag(sitio.notas),
      })
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo rehabilitar el sitio'
      setSitioError(message || 'No se pudo rehabilitar el sitio')
      setSitioActionLoadingId('')
      return
    }

    setSitioActionLoadingId('')
    await loadData()
  }

  const sitiosColumns = [
    {
      key: 'sitio',
      header: 'Sitio',
      width: 'minmax(180px, 1.6fr)',
      primary: true,
      render: (sitio) => (
        <>
          <strong className="list-title-with-icon">
            <FiMapPin aria-hidden="true" />
            {sitio.nombre}
          </strong>
          <span className="unit-notes">
            {sitio.tipo} • {sitio.direccion}
            {sitio.ciudad ? ` • ${sitio.ciudad}` : ''}
          </span>
        </>
      ),
    },
    {
      key: 'departamentos',
      header: 'Departamentos',
      width: 'minmax(150px, 1fr)',
      render: (sitio) => {
        const unidadCount = sitioUnidadCountMap[sitio.id] ?? 0
        return (
          <span className={`status-chip ${unidadCount > 0 ? 'ok' : 'empty'}`}>
            {unidadCount > 0 ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
            {unidadCount > 0 ? `${unidadCount} departamento${unidadCount > 1 ? 's' : ''}` : 'Sin departamentos'}
          </span>
        )
      },
    },
    {
      key: 'situacion',
      header: 'Situación',
      width: 'minmax(110px, 0.8fr)',
      render: (sitio) =>
        isArchivedRecord(sitio.notas) ? (
          <span className="warning-chip">Dado de baja</span>
        ) : (
          <span className="status-chip ok">Activo</span>
        ),
    },
    {
      key: 'gestionar',
      header: 'Gestionar',
      width: 'minmax(180px, 1fr)',
      actions: true,
      render: (sitio) => {
        const archived = isArchivedRecord(sitio.notas)
        return (
          <>
            <button type="button" className="ghost-btn minimal-btn" onClick={() => startEditSitio(sitio)}>
              <FiEdit2 aria-hidden="true" />
              Editar
            </button>
            {archived ? (
              <button
                type="button"
                className="ghost-btn minimal-btn"
                disabled={sitioActionLoadingId === sitio.id}
                onClick={() => void handleRestoreSitio(sitio)}
              >
                <FiRotateCcw aria-hidden="true" />
                Rehabilitar
              </button>
            ) : (
              <button
                type="button"
                className="danger-btn minimal-btn"
                disabled={sitioActionLoadingId === sitio.id}
                onClick={() => void handleBajaSitio(sitio)}
              >
                <FiArchive aria-hidden="true" />
                Dar de baja
              </button>
            )}
            <Link className="ghost-btn minimal-btn" to={`/panel-admin/clientes/${clienteId}/sitios/${sitio.id}`}>
              <FiEye aria-hidden="true" />
              Ver detalle
            </Link>
          </>
        )
      },
    },
  ]

  if (loading) {
    return <section className="placeholder-card page-fade-in">Cargando cliente...</section>
  }

  if (pageError) {
    return (
      <section className="placeholder-card page-fade-in">
        <h2>Detalle de cliente</h2>
        <p className="form-error">{pageError}</p>
      </section>
    )
  }

  return (
    <section className="crud-shell page-fade-in">
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

        <DataGrid
          ariaLabel="Sitios del cliente"
          emptyMessage="Este cliente todavia no tiene sitios registrados."
          rows={visibleSitios}
          columns={sitiosColumns}
        />
      </article>

      <Modal
        open={showCreateSitio}
        title={editingSitioId ? 'Editar sitio' : 'Alta de sitio'}
        onClose={resetSitioForm}
      >
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
          </div>
        </form>
      </Modal>
    </section>
  )
}
