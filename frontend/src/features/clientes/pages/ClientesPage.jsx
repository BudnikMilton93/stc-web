import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiEdit2, FiEye, FiPlus, FiSave, FiX } from 'react-icons/fi'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { TIPO_CLIENTE_OPTIONS } from '../constants'

const initialForm = {
  tipo: 'persona',
  nombre: '',
  dniCuit: '',
  email: '',
  telefono: '',
  direccion: '',
  notas: '',
}

export function ClientesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')

  const [editingClienteId, setEditingClienteId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(initialForm)

  const loadClientes = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiClient.get('/clientes')
      setClientes(data ?? [])
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar los clientes'
      setError(message || 'No se pudieron cargar los clientes')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadClientes()
  }, [loadClientes])

  // Filtro en memoria: la API todavia no expone busqueda full-text como
  // hacia Supabase (textSearch + fallback ilike), asi que filtramos del lado
  // del cliente sobre la lista ya cargada.
  const filteredClientes = useMemo(() => {
    const cleanTerm = search.trim().toLowerCase()

    if (!cleanTerm) {
      return clientes
    }

    return clientes.filter((cliente) => cliente.nombre?.toLowerCase().includes(cleanTerm))
  }, [clientes, search])

  const openCreateForm = () => {
    setEditingClienteId('')
    setForm(initialForm)
    setFormError('')
    setShowForm(true)
  }

  const openEditForm = (cliente) => {
    setEditingClienteId(cliente.id)
    setForm({
      tipo: cliente.tipo,
      nombre: cliente.nombre ?? '',
      dniCuit: cliente.dniCuit ?? '',
      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
      direccion: cliente.direccion ?? '',
      notas: cliente.notas ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setFormError('')
    setEditingClienteId('')
    setForm(initialForm)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')

    const payload = {
      tipo: form.tipo,
      nombre: form.nombre.trim(),
      dniCuit: form.dniCuit.trim() || null,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      notas: form.notas.trim() || null,
    }

    if (!payload.nombre) {
      setFormError('El nombre es obligatorio.')
      setSaving(false)
      return
    }

    try {
      if (editingClienteId) {
        await apiClient.put(`/clientes/${editingClienteId}`, payload)
      } else {
        await apiClient.post('/clientes', payload)
      }
    } catch (saveError) {
      const message = saveError instanceof ApiError ? saveError.message : 'No se pudo guardar el cliente'
      setFormError(message || 'No se pudo guardar el cliente')
      setSaving(false)
      return
    }

    closeForm()
    setSaving(false)
    await loadClientes()
  }

  return (
    <section className="crud-shell">
      <div className="crud-header">
        <div>
          <p className="eyebrow">Clientes</p>
          <h2>Listado de clientes</h2>
          <p className="muted-text">Alta, edicion y acceso al detalle cliente → sitio → unidad.</p>
        </div>
        <button type="button" className="primary-btn" onClick={openCreateForm}>
          <FiPlus aria-hidden="true" />
          Nuevo cliente
        </button>
      </div>

      <article className="crud-card">
        <div className="toolbar-row">
          <label className="search-field" htmlFor="cliente-search-input">
            Buscar por nombre
            <input
              id="cliente-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej: consorcio colon"
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {loading ? <p className="muted-text">Cargando clientes...</p> : null}

        {!loading && filteredClientes.length === 0 ? (
          <p className="muted-text">No hay clientes para mostrar con este criterio.</p>
        ) : null}

        {!loading && filteredClientes.length > 0 ? (
          <div className="list-grid">
            {filteredClientes.map((cliente) => (
              <article className="list-item" key={cliente.id}>
                <div>
                  <h4>{cliente.nombre}</h4>
                  <p>Tipo: {cliente.tipo}</p>
                  {cliente.telefono ? <p>Tel: {cliente.telefono}</p> : null}
                  {cliente.email ? <p>Email: {cliente.email}</p> : null}
                </div>
                <div className="item-actions">
                  <button type="button" className="ghost-btn" onClick={() => openEditForm(cliente)}>
                    <FiEdit2 aria-hidden="true" />
                    Editar
                  </button>
                  <Link className="primary-btn" to={`/panel-admin/clientes/${cliente.id}`}>
                    <FiEye aria-hidden="true" />
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>

      {showForm ? (
        <article className="crud-card">
          <div className="section-title-row">
            <h3>{editingClienteId ? 'Editar cliente' : 'Alta de cliente'}</h3>
            <button type="button" className="ghost-btn" onClick={closeForm}>
              <FiX aria-hidden="true" />
              Cerrar
            </button>
          </div>

          <form className="crud-form" onSubmit={handleSave}>
            <label>
              Tipo
              <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}>
                {TIPO_CLIENTE_OPTIONS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                required
              />
            </label>

            <label>
              DNI / CUIT
              <input
                value={form.dniCuit}
                onChange={(e) => setForm((p) => ({ ...p, dniCuit: e.target.value }))}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </label>

            <label>
              Telefono
              <input
                value={form.telefono}
                onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
              />
            </label>

            <label>
              Direccion
              <input
                value={form.direccion}
                onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
              />
            </label>

            <label className="span-2">
              Notas
              <textarea
                value={form.notas}
                onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              />
            </label>

            {formError ? <p className="form-error span-2">{formError}</p> : null}

            <div className="form-actions span-2">
              <button className="primary-btn" type="submit" disabled={saving}>
                <FiSave aria-hidden="true" />
                {saving ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </div>
          </form>
        </article>
      ) : null}
    </section>
  )
}
