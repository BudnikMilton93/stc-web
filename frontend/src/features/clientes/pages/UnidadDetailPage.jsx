import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {FiArchive, FiCheckCircle, FiCpu, FiEdit2, FiLock, FiMapPin, FiPlus, FiPlusCircle, FiRotateCcw, FiSave, FiTool, FiUserPlus, FiUsers, FiX} from 'react-icons/fi'
import { Modal } from '../../../components/ui/Modal'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { DataGrid } from '../../../components/ui/DataGrid'
import { Breadcrumb } from '../../../components/ui/Breadcrumb'
import { useUnidadDetail } from '../hooks/useUnidadDetail'
import { useOcupantesDeUnidad } from '../hooks/useOcupantesDeUnidad'
import { useOcupanteForm } from '../hooks/useOcupanteForm'
import { useActivosDeUnidad } from '../hooks/useActivosDeUnidad'
import { useActivoForm } from '../hooks/useActivoForm'
import { isArchivedRecord } from '../utils/archiveFlag'
import { TIPOS_ACTIVO_OPTIONS } from '../../../lib/tipoActivo'

export function UnidadDetailPage() {
  const { clienteId, sitioId, unidadId } = useParams()

  const [activeManager, setActiveManager] = useState(null)

  const {
    loading: unidadLoading,
    error: unidadError,
    unidad,
    sitio,
    cliente,
  } = useUnidadDetail(clienteId, sitioId, unidadId)

  const {
    loading: ocupantesLoading,
    error: ocupantesError,
    ocupantes,
    visibleOcupantes,
    selectableOcupantes,
    includeArchived: includeArchivedOcupantes,
    setIncludeArchived: setIncludeArchivedOcupantes,
    activeOcupantesCount,
    reload: reloadOcupantes,
  } = useOcupantesDeUnidad(unidadId)

  const {
    loading: activosLoading,
    error: activosError,
    activos,
    visibleActivos,
    includeInactive: includeInactiveActivos,
    setIncludeInactive: setIncludeInactiveActivos,
    activeActivosCount,
    reload: reloadActivos,
  } = useActivosDeUnidad(unidadId)

  const activoForm = useActivoForm({
    clienteId,
    sitioId,
    unidadId,
    activos,
    selectableOcupantes,
    onSaved: reloadActivos,
  })

  const ocupanteForm = useOcupanteForm(unidadId, {
    onSaved: async (data) => {
      await reloadOcupantes()
      if (data?.id) {
        activoForm.pickOcupante(data.id, data.nombre)
      }
    },
    onArchived: async (ocupante) => {
      await reloadOcupantes()
      if (activoForm.selectedOcupanteId === ocupante.id) {
        activoForm.updateOcupanteQuery('')
      }
    },
  })

  const canCreateActivo = activoForm.canCreateActivo

  const goToOcupantesForm = () => {
    setActiveManager('ocupantes')
    ocupanteForm.forceOpenCreateForm()
  }

  const startEditOcupante = (item) => {
    setActiveManager('ocupantes')
    ocupanteForm.openEditForm(item)
  }

  const startEditActivo = (item) => {
    setActiveManager('activos')
    activoForm.startEditForm(item)
  }

  const ocupantesColumns = [
    {
      key: 'ocupante',
      header: 'Ocupante',
      width: 'minmax(140px, 1.2fr)',
      primary: true,
      render: (item) => <strong>{item.nombre}</strong>,
    },
    {
      key: 'contacto',
      header: 'Contacto',
      width: 'minmax(160px, 1.4fr)',
      render: (item) => (
        <>
          <span>{item.telefono || 'Sin teléfono'}</span>
          <span>{item.email || 'Sin email'}</span>
        </>
      ),
    },
    {
      key: 'rol',
      header: 'Rol',
      width: 'minmax(90px, 0.7fr)',
      render: (item) => <span>{item.esTitular ? 'Titular' : 'No titular'}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      width: 'minmax(110px, 0.8fr)',
      render: (item) =>
        isArchivedRecord(item.notas) ? (
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
      render: (item) => (
        <button
          type="button"
          className="ghost-btn minimal-btn icon-only-btn"
          aria-label={`Editar ocupante ${item.nombre}`}
          title="Editar"
          onClick={() => startEditOcupante(item)}
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
      render: (item) => {
        const archived = isArchivedRecord(item.notas)
        return archived ? (
          <button
            type="button"
            className="ghost-btn minimal-btn icon-only-btn"
            aria-label={`Rehabilitar ocupante ${item.nombre}`}
            title="Rehabilitar"
            disabled={ocupanteForm.actionLoadingId === item.id}
            onClick={() => void ocupanteForm.handleRestore(item)}
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="danger-btn minimal-btn icon-only-btn"
            aria-label={`Dar de baja ocupante ${item.nombre}`}
            title="Dar de baja"
            disabled={ocupanteForm.actionLoadingId === item.id}
            onClick={() => void ocupanteForm.handleBaja(item)}
          >
            <FiArchive aria-hidden="true" />
          </button>
        )
      },
    },
  ]

  const activosColumns = [
    {
      key: 'activo',
      header: 'Activo',
      width: 'minmax(140px, 1.2fr)',
      primary: true,
      render: (item) => (
        <>
          <strong>{item.tipo}</strong>
          <span>
            {item.marca || 'Sin marca'} • {item.modelo || 'Sin modelo'}
          </span>
        </>
      ),
    },
    {
      key: 'serie',
      header: 'Serie',
      width: 'minmax(120px, 1fr)',
      render: (item) => <span>{item.numeroSerie || 'Sin serie'}</span>,
    },
    {
      key: 'ocupante',
      header: 'Ocupante',
      width: 'minmax(120px, 1fr)',
      render: (item) => {
        const owner = ocupantes.find((occ) => occ.id === item.ocupanteId)
        return <span>{owner?.nombre || 'Sin asignar'}</span>
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
          aria-label={`Editar activo ${item.tipo}`}
          title="Editar"
          onClick={() => startEditActivo(item)}
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
            aria-label={`Rehabilitar activo ${item.tipo}`}
            title="Rehabilitar"
            disabled={activoForm.actionLoadingId === item.id}
            onClick={() => void activoForm.handleRestore(item)}
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="danger-btn minimal-btn icon-only-btn"
            aria-label={`Dar de baja activo ${item.tipo}`}
            title="Dar de baja"
            disabled={activoForm.actionLoadingId === item.id}
            onClick={() => void activoForm.handleBaja(item)}
          >
            <FiArchive aria-hidden="true" />
          </button>
        ),
    },
  ]

  const loading = unidadLoading || ocupantesLoading || activosLoading
  const pageError = unidadError || ocupantesError || activosError

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
      <Breadcrumb
        items={[
          { label: 'Clientes', to: '/panel-admin/clientes' },
          { label: cliente?.nombre ?? 'Cliente', to: `/panel-admin/clientes/${clienteId}` },
          { label: sitio?.nombre ?? 'Sitio', to: `/panel-admin/clientes/${clienteId}/sitios/${sitioId}` },
          { label: unidad?.identificador ?? 'Unidad' },
        ]}
      />

      <div className="crud-header">
        <div>
          <p className="eyebrow">Unidad</p>
          <h2>
            {sitio?.nombre} • {unidad?.identificador}
          </h2>
          <p className="muted-text">Cliente: {cliente?.nombre}</p>
        </div>
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
            Cambiar gestión
          </button>
        </div>
      ) : (
        <article className="crud-card management-selector">
          <div className="management-selector-heading">
            <p className="eyebrow">Gestión de la unidad</p>
            <h3>¿Qué quieres administrar?</h3>
            <p className="muted-text">Elige un módulo para trabajar de forma individual.</p>
          </div>
          <div className="management-options">
            <button
              type="button"
              className="management-option occupants-option"
              onClick={() => setActiveManager('ocupantes')}
            >
              <span className="management-option-icon">
                <FiUsers aria-hidden="true" />
              </span>
              <span className="management-option-copy">
                <strong>Gestionar ocupantes</strong>
                <span>Altas, edición y bajas de las personas de esta unidad.</span>
              </span>
              <span className="management-option-count">{activeOcupantesCount}</span>
            </button>
            <button
              type="button"
              className="management-option assets-option"
              onClick={() => setActiveManager('activos')}
            >
              <span className="management-option-icon">
                <FiCpu aria-hidden="true" />
              </span>
              <span className="management-option-copy">
                <strong>Gestionar activos</strong>
                <span>Inventario y asignación de equipos a un ocupante.</span>
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
              Gestión de ocupantes
            </h3>
            <button type="button" className="primary-btn minimal-btn" onClick={ocupanteForm.openCreateForm}>
              {ocupanteForm.showForm && !ocupanteForm.editingOcupanteId ? (
                <FiX aria-hidden="true" />
              ) : (
                <FiPlus aria-hidden="true" />
              )}
              {ocupanteForm.showForm && !ocupanteForm.editingOcupanteId ? 'Cancelar' : 'Nuevo ocupante'}
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

          <DataGrid
            ariaLabel="Ocupantes de la unidad"
            emptyMessage="Aun no hay ocupantes en esta unidad."
            rows={visibleOcupantes}
            columns={ocupantesColumns}
          />
        </article>
      ) : activeManager === 'activos' ? (
        <article className="crud-card card-intent-assets">
          <div className="section-title-row">
            <h3 className="list-title-with-icon">
              <FiCpu aria-hidden="true" />
              Gestión de activos
            </h3>
            <button
              type="button"
              className="primary-btn minimal-btn"
              disabled={activoForm.isFormLocked}
              onClick={activoForm.openCreateForm}
            >
              {activoForm.showForm && !activoForm.editingActivoId ? (
                <FiX aria-hidden="true" />
              ) : (
                <FiPlus aria-hidden="true" />
              )}
              {activoForm.showForm && !activoForm.editingActivoId ? 'Cancelar' : 'Nuevo activo'}
            </button>
          </div>

          <p className="muted-text section-help-text">
            <FiTool aria-hidden="true" />
            Cada activo debe quedar asociado a un ocupante existente de esta unidad.
          </p>

          {activoForm.isFormLocked ? (
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

          <label className="inline-check">
            <input
              type="checkbox"
              checked={includeInactiveActivos}
              onChange={(event) => setIncludeInactiveActivos(event.target.checked)}
            />
            Mostrar activos dados de baja
          </label>

          <DataGrid
            ariaLabel="Activos de la unidad"
            emptyMessage="Aun no hay activos cargados en esta unidad."
            rows={visibleActivos}
            columns={activosColumns}
          />
          
        </article>
      ) : null}

      <Modal
        open={ocupanteForm.showForm}
        title={ocupanteForm.editingOcupanteId ? 'Editar ocupante' : 'Alta de ocupante'}
        onClose={ocupanteForm.closeForm}
      >
        <form className="crud-form" onSubmit={ocupanteForm.handleSave}>
          <label>
            Nombre
            <input
              value={ocupanteForm.form.nombre}
              onChange={(e) => ocupanteForm.updateField('nombre', e.target.value)}
              required
            />
          </label>
          <label>
            Teléfono
            <input
              value={ocupanteForm.form.telefono}
              onChange={(e) => ocupanteForm.updateField('telefono', e.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={ocupanteForm.form.email}
              onChange={(e) => ocupanteForm.updateField('email', e.target.value)}
            />
          </label>
          <label>
            Titular
            <select
              value={ocupanteForm.form.es_titular ? 'si' : 'no'}
              onChange={(e) => ocupanteForm.updateField('es_titular', e.target.value === 'si')}
            >
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="span-2">
            Notas
            <textarea
              rows={3}
              value={ocupanteForm.form.notas}
              onChange={(e) => ocupanteForm.updateField('notas', e.target.value)}
            />
          </label>

          {ocupanteForm.formError ? <p className="form-error span-2">{ocupanteForm.formError}</p> : null}

          <div className="form-actions span-2">
            <button className="primary-btn minimal-btn" type="submit" disabled={ocupanteForm.saving}>
              <FiSave aria-hidden="true" />
              {ocupanteForm.saving
                ? 'Guardando...'
                : ocupanteForm.editingOcupanteId
                  ? 'Guardar cambios'
                  : 'Guardar ocupante'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={activoForm.showForm}
        title={activoForm.editingActivoId ? 'Editar activo' : 'Alta de activo'}
        onClose={activoForm.closeForm}
      >
        <form className="crud-form" onSubmit={activoForm.handleSave}>
          <label>
            Tipo
            <select value={activoForm.form.tipo} onChange={(e) => activoForm.updateField('tipo', e.target.value)}>
              {TIPOS_ACTIVO_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marca
            <input value={activoForm.form.marca} onChange={(e) => activoForm.updateField('marca', e.target.value)} />
          </label>
          <label>
            Modelo
            <input
              value={activoForm.form.modelo}
              onChange={(e) => activoForm.updateField('modelo', e.target.value)}
            />
          </label>
          <label>
            Número de serie
            <input
              value={activoForm.form.numero_serie}
              onChange={(e) => activoForm.updateField('numero_serie', e.target.value)}
            />
          </label>
          <label>
            Fecha instalación
            <input
              type="date"
              value={activoForm.form.fecha_instalacion}
              onChange={(e) => activoForm.updateField('fecha_instalacion', e.target.value)}
            />
          </label>
          <label>
            Garantía hasta
            <input
              type="date"
              value={activoForm.form.garantia_hasta}
              onChange={(e) => activoForm.updateField('garantia_hasta', e.target.value)}
            />
          </label>
          <label>
            Última revisión
            <input
              type="date"
              value={activoForm.form.ultima_revision}
              onChange={(e) => activoForm.updateField('ultima_revision', e.target.value)}
            />
          </label>
          <label>
            Próximo mantenimiento
            <input
              type="date"
              value={activoForm.form.proximo_mantenimiento}
              onChange={(e) => activoForm.updateField('proximo_mantenimiento', e.target.value)}
            />
          </label>

          <div className="span-2 autocomplete-box">
            <label htmlFor="ocupante-autocomplete">Ocupante responsable (autocomplete de esta unidad)</label>
            <input
              id="ocupante-autocomplete"
              value={activoForm.ocupanteQuery}
              onChange={(e) => activoForm.updateOcupanteQuery(e.target.value)}
              placeholder="Buscar ocupante existente"
            />
            {activoForm.selectedOcupante ? (
              <p className="selection-pill">Seleccionado: {activoForm.selectedOcupante.nombre}</p>
            ) : (
              <p className="muted-text">Selecciona un ocupante de la lista para poder guardar el activo.</p>
            )}
            <div className="autocomplete-list" role="listbox" aria-label="Ocupantes sugeridos">
              {activoForm.filteredOcupantes.slice(0, 8).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="autocomplete-option"
                  onClick={() => activoForm.pickOcupante(item.id, item.nombre)}
                >
                  {item.nombre}
                  {item.esTitular ? ' (titular)' : ''}
                </button>
              ))}
              {activoForm.filteredOcupantes.length === 0 ? (
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
              value={activoForm.form.notas}
              onChange={(e) => activoForm.updateField('notas', e.target.value)}
            />
          </label>

          {activoForm.formError ? <p className="form-error span-2">{activoForm.formError}</p> : null}

          <div className="form-actions span-2">
            <button className="primary-btn minimal-btn" type="submit" disabled={activoForm.saving}>
              <FiSave aria-hidden="true" />
              {activoForm.saving ? 'Guardando...' : activoForm.editingActivoId ? 'Guardar cambios' : 'Guardar activo'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={ocupanteForm.bajaConfirmation.open}
        title="Dar de baja ocupante"
        message={`¿Dar de baja ${ocupanteForm.bajaConfirmation.entityLabel} "${ocupanteForm.bajaConfirmation.entityName}"? Se ocultará de la vista principal, pero podés rehabilitarlo después.`}
        confirmLabel="Dar de baja"
        loading={ocupanteForm.bajaConfirmation.loading}
        error={ocupanteForm.bajaConfirmation.error}
        onConfirm={() => void ocupanteForm.confirmBaja()}
        onCancel={ocupanteForm.cancelBaja}
      />

      <ConfirmDialog
        open={activoForm.bajaConfirmation.open}
        title="Dar de baja activo"
        message={`¿Dar de baja ${activoForm.bajaConfirmation.entityLabel} "${activoForm.bajaConfirmation.entityName}"? Se ocultará de la vista principal, pero podés rehabilitarlo después.`}
        confirmLabel="Dar de baja"
        loading={activoForm.bajaConfirmation.loading}
        error={activoForm.bajaConfirmation.error}
        onConfirm={() => void activoForm.confirmBaja()}
        onCancel={activoForm.cancelBaja}
      />
    </section>
  )
}
