import { Link } from 'react-router-dom'
import { FiEdit2, FiEye, FiPlus, FiSave, FiSearch, FiUser, FiX } from 'react-icons/fi'
import { Modal } from '../../../components/ui/Modal'
import { DataGrid } from '../../../components/ui/DataGrid'
import { capitalize, TIPO_CLIENTE_OPTIONS } from '../constants'
import { useClientesList } from '../hooks/useClientesList'
import { useClienteForm } from '../hooks/useClienteForm'

export function ClientesPage() {
  const { clientes, loading, error, search, setSearch, reload } = useClientesList()
  const {
    editingClienteId,
    showForm,
    saving,
    formError,
    form,
    updateField,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSave,
  } = useClienteForm({ onSaved: reload })

  const clientesColumns = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: 'minmax(150px, 1.4fr)',
      primary: true,
      render: (cliente) => (
        <strong className="list-title-with-icon">
          <FiUser aria-hidden="true" />
          {cliente.nombre}
        </strong>
      ),
    },
    {
      key: 'direccion',
      header: 'Dirección',
      width: 'minmax(140px, 1.4fr)',
      render: (cliente) => <span>{cliente.direccion || 'Sin dirección'}</span>,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: 'minmax(90px, 0.7fr)',
      render: (cliente) => <span>{capitalize(cliente.tipo)}</span>,
    },
    {
      key: 'telefono',
      header: 'Celular',
      width: 'minmax(110px, 0.9fr)',
      render: (cliente) => <span>{cliente.telefono || 'Sin celular'}</span>,
    },
    {
      key: 'editar',
      header: 'Editar',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (cliente) => (
        <button
          type="button"
          className="ghost-btn minimal-btn icon-only-btn"
          aria-label={`Editar cliente ${cliente.nombre}`}
          title="Editar"
          onClick={() => openEditForm(cliente)}
        >
          <FiEdit2 aria-hidden="true" />
        </button>
      ),
    },
    {
      key: 'detalle',
      header: 'Detalle',
      width: '4.6rem',
      align: 'center',
      actions: true,
      render: (cliente) => (
        <Link
          className="primary-btn minimal-btn icon-only-btn"
          aria-label={`Ver detalle de ${cliente.nombre}`}
          title="Ver detalle"
          to={`/panel-admin/clientes/${cliente.id}`}
        >
          <FiEye aria-hidden="true" />
        </Link>
      ),
    },
  ]

  return (
    <section className="crud-shell">
      <div className="crud-header">
        <div>
          <p className="eyebrow">Clientes</p>
          <h2>Listado de clientes</h2>
          <p className="muted-text">Alta, edición y acceso al detalle cliente → sitio → unidad.</p>
        </div>
        <button type="button" className="primary-btn" onClick={openCreateForm}>
          <FiPlus aria-hidden="true" />
          Nuevo cliente
        </button>
      </div>

      <article className="crud-card">
        <div className="toolbar-row">
          <div className="search-field">
            <label className="visually-hidden" htmlFor="cliente-search-input">
              Buscar por nombre
            </label>
            <FiSearch className="search-field-icon" aria-hidden="true" />
            <input
              id="cliente-search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre..."
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

        {error ? <p className="form-error">{error}</p> : null}

        {loading ? <p className="muted-text">Cargando clientes...</p> : null}

        {!loading && clientes.length === 0 ? (
          <p className="muted-text">No hay clientes para mostrar con este criterio.</p>
        ) : null}

        {!loading && clientes.length > 0 ? (
          <DataGrid
            ariaLabel="Clientes"
            emptyMessage="No hay clientes para mostrar con este criterio."
            rows={clientes}
            columns={clientesColumns}
          />
        ) : null}
      </article>

      <Modal open={showForm} title={editingClienteId ? 'Editar cliente' : 'Alta de cliente'} onClose={closeForm}>
        <form className="crud-form" onSubmit={handleSave}>
          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => updateField('tipo', e.target.value)}>
              {TIPO_CLIENTE_OPTIONS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {capitalize(tipo)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nombre
            <input value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} required />
          </label>

          <label>
            DNI / CUIT
            <input value={form.dniCuit} onChange={(e) => updateField('dniCuit', e.target.value)} />
          </label>

          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </label>

          <label>
            Teléfono
            <input value={form.telefono} onChange={(e) => updateField('telefono', e.target.value)} />
          </label>

          <label>
            Dirección
            <input value={form.direccion} onChange={(e) => updateField('direccion', e.target.value)} />
          </label>

          <label className="span-2">
            Notas
            <textarea value={form.notas} onChange={(e) => updateField('notas', e.target.value)} />
          </label>

          {formError ? <p className="form-error span-2">{formError}</p> : null}

          <div className="form-actions span-2">
            <button className="primary-btn" type="submit" disabled={saving}>
              <FiSave aria-hidden="true" />
              {saving ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
