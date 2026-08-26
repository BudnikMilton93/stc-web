import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiEdit2, FiEye, FiPlus, FiSave, FiX } from 'react-icons/fi'
import { supabase } from '../../../lib/supabase'
import { toFriendlySupabaseError } from '../../../lib/supabaseErrors'
import { TIPO_CLIENTE_OPTIONS } from '../constants'

const initialForm = {
  tipo: 'persona',
  nombre: '',
  dni_cuit: '',
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

  const loadClientes = useCallback(async (term = '') => {
    setLoading(true)
    setError('')

    let request = supabase
      .from('clientes')
      .select('id, tipo, nombre, dni_cuit, email, telefono, direccion, notas, created_at, updated_at')
      .order('nombre', { ascending: true })

    const cleanTerm = term.trim()

    if (cleanTerm) {
      request = request.textSearch('nombre', cleanTerm, {
        config: 'spanish',
        type: 'websearch',
      })
    }

    const { data, error: queryError } = await request

    if (queryError && cleanTerm) {
      const fallbackResult = await supabase
        .from('clientes')
        .select('id, tipo, nombre, dni_cuit, email, telefono, direccion, notas, created_at, updated_at')
        .ilike('nombre', `%${cleanTerm}%`)
        .order('nombre', { ascending: true })

      if (fallbackResult.error) {
        setError(toFriendlySupabaseError(fallbackResult.error, 'No se pudieron cargar los clientes'))
        setClientes([])
        setLoading(false)
        return
      }

      setClientes(fallbackResult.data ?? [])
      setLoading(false)
      return
    }

    if (queryError) {
      setError(toFriendlySupabaseError(queryError, 'No se pudieron cargar los clientes'))
      setClientes([])
      setLoading(false)
      return
    }

    setClientes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadClientes(search)
  }, [loadClientes, search])

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
      dni_cuit: cliente.dni_cuit ?? '',
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
      dni_cuit: form.dni_cuit.trim() || null,
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

    const query = editingClienteId
      ? supabase.from('clientes').update(payload).eq('id', editingClienteId)
      : supabase.from('clientes').insert(payload)

    const { error: saveError } = await query

    if (saveError) {
      setFormError(toFriendlySupabaseError(saveError, 'No se pudo guardar el cliente'))
      setSaving(false)
      return
    }

    closeForm()
    setSaving(false)
    await loadClientes(search)
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
            Buscar por nombre (full-text)
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

        {!loading && clientes.length === 0 ? (
          <p className="muted-text">No hay clientes para mostrar con este criterio.</p>
        ) : null}

        {!loading && clientes.length > 0 ? (
          <div className="list-grid">
            {clientes.map((cliente) => (
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
                value={form.dni_cuit}
                onChange={(e) => setForm((p) => ({ ...p, dni_cuit: e.target.value }))}
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
                rows={3}
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
