import { Link, useParams } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiArchive,
  FiCamera,
  FiCheckCircle,
  FiEdit2,
  FiEye,
  FiHome,
  FiMapPin,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiUsers,
  FiX,
  FiXCircle,
} from 'react-icons/fi'
import { Modal } from '../../../components/ui/Modal'
import { DataGrid } from '../../../components/ui/DataGrid'
import { Breadcrumb } from '../../../components/ui/Breadcrumb'
import { useUnidadesDeSitio } from '../hooks/useUnidadesDeSitio'
import { useUnidadForm } from '../hooks/useUnidadForm'
import { useEquipamientoDeSitio } from '../hooks/useEquipamientoDeSitio'
import { useEquipamientoSitioForm } from '../hooks/useEquipamientoSitioForm'
import { isArchivedRecord, removeArchiveFlag } from '../utils/archiveFlag'
import { getMantenimientoStatus } from '../utils/mantenimiento'
import { capitalize } from '../constants'

const TIPOS_EQUIPAMIENTO_SITIO = ['camara', 'portero', 'controlAcceso', 'otro']

export function SitioDetailPage() {
  const { clienteId, sitioId } = useParams()

  const {
    loading,
    error: pageError,
    sitio,
    cliente,
    unidades: visibleUnidades,
    includeArchived,
    setIncludeArchived,
    unidadOcupanteCountMap,
    activeUnidadesCount,
    unidadesWithOcupantesCount,
    totalOcupantesCount,
    reload,
  } = useUnidadesDeSitio(clienteId, sitioId)

  const {
    showForm: showCreateUnidad,
    editingUnidadId,
    saving: unidadSaving,
    actionLoadingId: unidadActionLoadingId,
    formError: unidadError,
    form: unidadForm,
    updateField: updateUnidadField,
    openCreateForm: startCreateUnidad,
    openEditForm: startEditUnidad,
    closeForm: resetUnidadForm,
    handleSave: handleSaveUnidad,
    handleBaja: handleBajaUnidad,
    handleRestore: handleRestoreUnidad,
  } = useUnidadForm(sitioId, { onSaved: reload })

  const {
    loading: equipamientoLoading,
    error: equipamientoError,
    equipamiento,
    visibleEquipamiento,
    includeInactive: includeInactiveEquipamiento,
    setIncludeInactive: setIncludeInactiveEquipamiento,
    activeEquipamientoCount,
    reload: reloadEquipamiento,
  } = useEquipamientoDeSitio(sitioId)

  const {
    showForm: showEquipamientoForm,
    editingId: editingEquipamientoId,
    saving: equipamientoSaving,
    actionLoadingId: equipamientoActionLoadingId,
    formError: equipamientoFormError,
    form: equipamientoForm,
    updateField: updateEquipamientoField,
    openCreateForm: startCreateEquipamiento,
    startEditForm: startEditEquipamiento,
    closeForm: resetEquipamientoForm,
    handleSave: handleSaveEquipamiento,
    handleBaja: handleBajaEquipamiento,
    handleRestore: handleRestoreEquipamiento,
  } = useEquipamientoSitioForm({ clienteId, sitioId, equipamiento, onSaved: reloadEquipamiento })

  const equipamientoColumns = [
    {
      key: 'equipo',
      header: 'Equipo',
      width: 'minmax(140px, 1.2fr)',
      primary: true,
      render: (item) => (
        <>
          <strong>{capitalize(item.tipo)}</strong>
          <span>
            {item.marca || 'Sin marca'} • {item.modelo || 'Sin modelo'}
          </span>
        </>
      ),
    },
    {
      key: 'serie',
      header: 'Serie',
      width: 'minmax(110px, 0.9fr)',
      render: (item) => <span>{item.numeroSerie || 'Sin serie'}</span>,
    },
    {
      key: 'ultimaRevision',
      header: 'Ultima revision',
      width: 'minmax(120px, 0.9fr)',
      render: (item) => <span>{item.ultimaRevision || 'Sin registrar'}</span>,
    },
    {
      key: 'proximoMantenimiento',
      header: 'Proximo mantenimiento',
      width: 'minmax(150px, 1fr)',
      render: (item) => {
        const status = getMantenimientoStatus(item.proximoMantenimiento)
        if (status === 'sinDefinir') {
          return <span className="muted-text">Sin definir</span>
        }
        if (status === 'vencido') {
          return (
            <span className="warning-chip">
              <FiAlertTriangle aria-hidden="true" /> Vencido • {item.proximoMantenimiento}
            </span>
          )
        }
        if (status === 'proximo') {
          return (
            <span className="status-chip empty">
              <FiAlertTriangle aria-hidden="true" /> Proximo • {item.proximoMantenimiento}
            </span>
          )
        }
        return <span className="status-chip ok">{item.proximoMantenimiento}</span>
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      width: 'minmax(100px, 0.8fr)',
      render: (item) =>
        item.estado === 'deBaja' ? (
          <span className="warning-chip">De baja</span>
        ) : (
          <span className="status-chip ok">Activo</span>
        ),
    },
    {
      key: 'editar',
      header: '',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (item) => (
        <button
          type="button"
          className="ghost-btn minimal-btn icon-only-btn"
          aria-label={`Editar equipamiento ${item.tipo}`}
          title="Editar"
          onClick={() => startEditEquipamiento(item)}
        >
          <FiEdit2 aria-hidden="true" />
        </button>
      ),
    },
    {
      key: 'archivar',
      header: '',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (item) =>
        item.estado === 'deBaja' ? (
          <button
            type="button"
            className="ghost-btn minimal-btn icon-only-btn"
            aria-label={`Rehabilitar equipamiento ${item.tipo}`}
            title="Rehabilitar"
            disabled={equipamientoActionLoadingId === item.id}
            onClick={() => void handleRestoreEquipamiento(item)}
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="danger-btn minimal-btn icon-only-btn"
            aria-label={`Dar de baja equipamiento ${item.tipo}`}
            title="Dar de baja"
            disabled={equipamientoActionLoadingId === item.id}
            onClick={() => void handleBajaEquipamiento(item)}
          >
            <FiArchive aria-hidden="true" />
          </button>
        ),
    },
  ]

  const unidadesColumns = [
    {
      key: 'unidad',
      header: 'Unidad',
      width: 'minmax(160px, 1.4fr)',
      primary: true,
      render: (unidad) => {
        const notes = removeArchiveFlag(unidad.notas)
        return (
          <>
            <strong className="list-title-with-icon">
              <FiHome aria-hidden="true" />
              {unidad.identificador}
            </strong>
            {notes ? <span className="unit-notes">{notes}</span> : null}
          </>
        )
      },
    },
    {
      key: 'ubicacion',
      header: 'Ubicación',
      width: 'minmax(140px, 1fr)',
      render: (unidad) => <span>{unidad.piso ? `Piso ${unidad.piso}` : 'Sin ubicación indicada'}</span>,
    },
    {
      key: 'personas',
      header: 'Personas',
      width: 'minmax(160px, 1fr)',
      render: (unidad) => {
        const ocupanteCount = unidadOcupanteCountMap[unidad.id] ?? 0
        return (
          <span className={`status-chip ${ocupanteCount > 0 ? 'ok' : 'empty'}`}>
            {ocupanteCount > 0 ? <FiCheckCircle aria-hidden="true" /> : <FiXCircle aria-hidden="true" />}
            {ocupanteCount > 0 ? `${ocupanteCount} persona${ocupanteCount > 1 ? 's' : ''}` : 'Sin personas asignadas'}
          </span>
        )
      },
    },
    {
      key: 'situacion',
      header: 'Situación',
      width: 'minmax(100px, 0.8fr)',
      render: (unidad) =>
        isArchivedRecord(unidad.notas) ? (
          <span className="warning-chip">Inactiva</span>
        ) : (
          <span className="status-chip ok">Activa</span>
        ),
    },
    {
      key: 'editar',
      header: '',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (unidad) => (
        <button
          type="button"
          className="ghost-btn minimal-btn icon-only-btn"
          aria-label={`Editar unidad ${unidad.identificador}`}
          title="Editar"
          onClick={() => startEditUnidad(unidad)}
        >
          <FiEdit2 aria-hidden="true" />
        </button>
      ),
    },
    {
      key: 'archivar',
      header: '',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (unidad) => {
        const archived = isArchivedRecord(unidad.notas)
        return archived ? (
          <button
            type="button"
            className="ghost-btn minimal-btn icon-only-btn"
            disabled={unidadActionLoadingId === unidad.id}
            aria-label={`Rehabilitar unidad ${unidad.identificador}`}
            title="Rehabilitar"
            onClick={() => void handleRestoreUnidad(unidad)}
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="danger-btn minimal-btn icon-only-btn"
            disabled={unidadActionLoadingId === unidad.id}
            aria-label={`Dar de baja unidad ${unidad.identificador}`}
            title="Dar de baja"
            onClick={() => void handleBajaUnidad(unidad)}
          >
            <FiArchive aria-hidden="true" />
          </button>
        )
      },
    },
    {
      key: 'detalle',
      header: '',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (unidad) => (
        <Link
          className="primary-btn minimal-btn icon-only-btn"
          aria-label={`Ver detalle de ${unidad.identificador}`}
          title="Ver detalle"
          to={`/panel-admin/clientes/${clienteId}/sitios/${sitioId}/unidades/${unidad.id}`}
        >
          <FiEye aria-hidden="true" />
        </Link>
      ),
    },
  ]

  if (loading || equipamientoLoading) {
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

  if (equipamientoError) {
    return (
      <section className="placeholder-card">
        <h2>Detalle de sitio</h2>
        <p className="form-error">{equipamientoError}</p>
      </section>
    )
  }

  return (
    <section className="crud-shell">
      <Breadcrumb
        items={[
          { label: 'Clientes', to: '/panel-admin/clientes' },
          { label: cliente?.nombre ?? 'Cliente', to: `/panel-admin/clientes/${clienteId}` },
          { label: sitio?.nombre ?? 'Sitio' },
        ]}
      />

      <div className="crud-header">
        <div>
          <p className="eyebrow">Sitio</p>
          <h2>{sitio?.nombre}</h2>
          <p className="muted-text">
            {capitalize(sitio?.tipo)} • {sitio?.direccion}
          </p>
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
          <button type="button" className="primary-btn" onClick={startCreateUnidad}>
            {showCreateUnidad && !editingUnidadId ? <FiX aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
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

        <DataGrid
          ariaLabel="Unidades del sitio"
          emptyMessage="Aun no hay unidades para este sitio."
          rows={visibleUnidades}
          columns={unidadesColumns}
        />
      </article>

      <article className="crud-card card-intent-assets">
        <div className="section-title-row">
          <h3 className="list-title-with-icon">
            <FiCamera aria-hidden="true" />
            Equipamiento de sitio
          </h3>
          <button type="button" className="primary-btn minimal-btn" onClick={startCreateEquipamiento}>
            {showEquipamientoForm && !editingEquipamientoId ? (
              <FiX aria-hidden="true" />
            ) : (
              <FiPlus aria-hidden="true" />
            )}
            {showEquipamientoForm && !editingEquipamientoId ? 'Cancelar' : 'Nuevo equipamiento'}
          </button>
        </div>

        <p className="muted-text section-help-text">
          Camaras, porteros y controles de acceso instalados en areas comunes del sitio, sin unidad ni ocupante
          asignado. Se trackean instancia por instancia.
        </p>

        <label className="inline-check">
          <input
            type="checkbox"
            checked={includeInactiveEquipamiento}
            onChange={(event) => setIncludeInactiveEquipamiento(event.target.checked)}
          />
          Mostrar equipamiento dado de baja
        </label>

        <DataGrid
          ariaLabel="Equipamiento del sitio"
          emptyMessage="Aun no hay equipamiento cargado para este sitio."
          rows={visibleEquipamiento}
          columns={equipamientoColumns}
        />
        <p className="muted-text small">Total activo: {activeEquipamientoCount}</p>
      </article>

      <Modal
        open={showCreateUnidad}
        title={editingUnidadId ? 'Editar unidad' : 'Alta de unidad'}
        onClose={resetUnidadForm}
      >
        <form className="crud-form" onSubmit={handleSaveUnidad}>
          <label>
            Identificador
            <input
              value={unidadForm.identificador}
              onChange={(e) => updateUnidadField('identificador', e.target.value)}
              placeholder="Ej: 3B"
              required
            />
          </label>
          <label>
            Piso
            <input
              value={unidadForm.piso}
              onChange={(e) => updateUnidadField('piso', e.target.value)}
              placeholder="Ej: 3"
            />
          </label>
          <label className="span-2">
            Notas
            <textarea
              rows={3}
              value={unidadForm.notas}
              onChange={(e) => updateUnidadField('notas', e.target.value)}
            />
          </label>

          {unidadError ? <p className="form-error span-2">{unidadError}</p> : null}

          <div className="form-actions span-2">
            <button className="primary-btn" type="submit" disabled={unidadSaving}>
              <FiSave aria-hidden="true" />
              {unidadSaving ? 'Guardando...' : editingUnidadId ? 'Guardar cambios' : 'Guardar unidad'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showEquipamientoForm}
        title={editingEquipamientoId ? 'Editar equipamiento' : 'Alta de equipamiento de sitio'}
        onClose={resetEquipamientoForm}
      >
        <form className="crud-form" onSubmit={handleSaveEquipamiento}>
          <label>
            Tipo
            <select
              value={equipamientoForm.tipo}
              onChange={(e) => updateEquipamientoField('tipo', e.target.value)}
            >
              {TIPOS_EQUIPAMIENTO_SITIO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {capitalize(tipo)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <input
              value={equipamientoForm.marca}
              onChange={(e) => updateEquipamientoField('marca', e.target.value)}
            />
          </label>
          <label>
            Modelo
            <input
              value={equipamientoForm.modelo}
              onChange={(e) => updateEquipamientoField('modelo', e.target.value)}
            />
          </label>
          <label>
            Numero de serie
            <input
              value={equipamientoForm.numero_serie}
              onChange={(e) => updateEquipamientoField('numero_serie', e.target.value)}
            />
          </label>
          <label>
            Fecha instalacion
            <input
              type="date"
              value={equipamientoForm.fecha_instalacion}
              onChange={(e) => updateEquipamientoField('fecha_instalacion', e.target.value)}
            />
          </label>
          <label>
            Garantia hasta
            <input
              type="date"
              value={equipamientoForm.garantia_hasta}
              onChange={(e) => updateEquipamientoField('garantia_hasta', e.target.value)}
            />
          </label>
          <label>
            Ultima revision
            <input
              type="date"
              value={equipamientoForm.ultima_revision}
              onChange={(e) => updateEquipamientoField('ultima_revision', e.target.value)}
            />
          </label>
          <label>
            Proximo mantenimiento
            <input
              type="date"
              value={equipamientoForm.proximo_mantenimiento}
              onChange={(e) => updateEquipamientoField('proximo_mantenimiento', e.target.value)}
            />
          </label>

          <label className="span-2">
            Notas
            <textarea
              rows={3}
              value={equipamientoForm.notas}
              onChange={(e) => updateEquipamientoField('notas', e.target.value)}
            />
          </label>

          {equipamientoFormError ? <p className="form-error span-2">{equipamientoFormError}</p> : null}

          <div className="form-actions span-2">
            <button className="primary-btn minimal-btn" type="submit" disabled={equipamientoSaving}>
              <FiSave aria-hidden="true" />
              {equipamientoSaving
                ? 'Guardando...'
                : editingEquipamientoId
                  ? 'Guardar cambios'
                  : 'Guardar equipamiento'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
