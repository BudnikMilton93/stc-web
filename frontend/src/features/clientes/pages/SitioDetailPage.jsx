import { Link, useParams } from 'react-router-dom'
import {
  FiArchive,
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
import { isArchivedRecord, removeArchiveFlag } from '../utils/archiveFlag'
import { capitalize } from '../constants'

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
    </section>
  )
}
