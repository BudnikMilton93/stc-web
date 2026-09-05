import { Link, useParams } from 'react-router-dom'
import {
  FiArchive,
  FiCamera,
  FiCheckCircle,
  FiEdit2,
  FiEye,
  FiHome,
  FiLayers,
  FiMapPin,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiSearch,
  FiX,
  FiXCircle,
} from 'react-icons/fi'
import { Modal } from '../../../components/ui/Modal'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { DataGrid } from '../../../components/ui/DataGrid'
import { Breadcrumb } from '../../../components/ui/Breadcrumb'
import { useSitiosDeCliente } from '../hooks/useSitiosDeCliente'
import { useSitioForm } from '../hooks/useSitioForm'
import { isArchivedRecord } from '../utils/archiveFlag'
import { capitalize } from '../constants'

const SITIO_TIPOS = ['Edificio', 'Casa', 'Oficina', 'Comercio', 'Otro']

export function ClienteDetailPage() {
  const { clienteId } = useParams()

  const {
    loading,
    error: pageError,
    cliente,
    sitios: visibleSitios,
    includeArchived,
    setIncludeArchived,
    search,
    setSearch,
    sitioUnidadCountMap,
    activeSitiosCount,
    sitiosWithUnidadesCount,
    totalUnidadesCount,
    activeEquipamientoCount,
    reload,
  } = useSitiosDeCliente(clienteId)

  const {
    showForm: showCreateSitio,
    editingSitioId,
    saving: sitioSaving,
    actionLoadingId: sitioActionLoadingId,
    formError: sitioError,
    form: sitioForm,
    updateField: updateSitioField,
    openCreateForm: startCreateSitio,
    openEditForm: startEditSitio,
    closeForm: resetSitioForm,
    handleSave: handleSaveSitio,
    handleBaja: handleBajaSitio,
    handleRestore: handleRestoreSitio,
    bajaConfirmation: sitioBajaConfirmation,
    confirmBaja: confirmBajaSitio,
    cancelBaja: cancelBajaSitio,
  } = useSitioForm(clienteId, { onSaved: reload })

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
            {capitalize(sitio.tipo)} • {sitio.direccion}
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
      key: 'editar',
      header: '',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (sitio) => (
        <button
          type="button"
          className="ghost-btn minimal-btn icon-only-btn"
          aria-label={`Editar sitio ${sitio.nombre}`}
          title="Editar"
          onClick={() => startEditSitio(sitio)}
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
      render: (sitio) => {
        const archived = isArchivedRecord(sitio.notas)
        return archived ? (
          <button
            type="button"
            className="ghost-btn minimal-btn icon-only-btn"
            aria-label={`Rehabilitar sitio ${sitio.nombre}`}
            title="Rehabilitar"
            disabled={sitioActionLoadingId === sitio.id}
            onClick={() => void handleRestoreSitio(sitio)}
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="danger-btn minimal-btn icon-only-btn"
            aria-label={`Dar de baja sitio ${sitio.nombre}`}
            title="Dar de baja"
            disabled={sitioActionLoadingId === sitio.id}
            onClick={() => void handleBajaSitio(sitio)}
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
      render: (sitio) => (
        <Link
          className="primary-btn minimal-btn icon-only-btn"
          aria-label={`Ver detalle de ${sitio.nombre}`}
          title="Ver detalle"
          to={`/panel-admin/clientes/${clienteId}/sitios/${sitio.id}`}
        >
          <FiEye aria-hidden="true" />
        </Link>
      ),
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
      <Breadcrumb
        items={[
          { label: 'Clientes', to: '/panel-admin/clientes' },
          { label: cliente?.nombre ?? 'Cliente' },
        ]}
      />

      <div className="crud-header">
        <div>
          <p className="eyebrow">Cliente</p>
          <h2>{cliente?.nombre}</h2>
          <p className="muted-text">
            Tipo: <strong>{capitalize(cliente?.tipo)}</strong> {cliente?.email ? `• ${cliente.email}` : ''}
          </p>
        </div>
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
        <div className="entity-overview-card">
          <div className="entity-overview-icon">
            <FiCamera aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Equipamiento de sitio</p>
            <p className="entity-overview-value">{activeEquipamientoCount}</p>
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

        <div className="toolbar-row">
          <div className="search-field">
            <label className="visually-hidden" htmlFor="sitio-search-input">
              Buscar por nombre o dirección
            </label>
            <FiSearch className="search-field-icon" aria-hidden="true" />
            <input
              id="sitio-search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o dirección..."
            />
            {search ? (
              <button
                type="button"
                className="search-field-clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearch('')}
              >
                <FiX aria-hidden="true" />
              </button>
            ) : null}
          </div>
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
          emptyMessage={
            search
              ? 'Ningun sitio coincide con la busqueda.'
              : 'Este cliente todavia no tiene sitios registrados.'
          }
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
              onChange={(e) => updateSitioField('nombre', e.target.value)}
              required
            />
          </label>
          <label>
            Tipo
            <select value={sitioForm.tipo} onChange={(e) => updateSitioField('tipo', e.target.value)}>
              {SITIO_TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dirección
            <input
              value={sitioForm.direccion}
              onChange={(e) => updateSitioField('direccion', e.target.value)}
              required
            />
          </label>
          <label>
            Ciudad
            <input value={sitioForm.ciudad} onChange={(e) => updateSitioField('ciudad', e.target.value)} />
          </label>
          <label className="span-2">
            Notas
            <textarea
              rows={3}
              value={sitioForm.notas}
              onChange={(e) => updateSitioField('notas', e.target.value)}
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

      <ConfirmDialog
        open={sitioBajaConfirmation.open}
        title="Dar de baja sitio"
        message={`¿Dar de baja ${sitioBajaConfirmation.entityLabel} "${sitioBajaConfirmation.entityName}"? Se ocultará de la vista principal, pero podés rehabilitarlo después.`}
        confirmLabel="Dar de baja"
        loading={sitioBajaConfirmation.loading}
        error={sitioBajaConfirmation.error}
        onConfirm={() => void confirmBajaSitio()}
        onCancel={cancelBajaSitio}
      />
    </section>
  )
}
