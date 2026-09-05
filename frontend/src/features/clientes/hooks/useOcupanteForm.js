import { useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { addArchiveFlag, removeArchiveFlag } from '../utils/archiveFlag'
import { useArchivableEntityActions } from './useArchivableEntityActions'

const initialForm = {
  nombre: '',
  telefono: '',
  email: '',
  es_titular: true,
  notas: '',
}

const buildOcupantePayload = (ocupante, notas) => ({
  nombre: ocupante.nombre,
  telefono: ocupante.telefono,
  email: ocupante.email,
  esTitular: ocupante.esTitular,
  notas,
})

// Maneja el modal de alta/edicion de ocupante. La baja logica/rehabilitacion
// (via el archive-flag en `notas`) la resuelve useArchivableEntityActions;
// aca solo se define COMO se ve el payload de un ocupante para esas 2
// acciones.
//
// - `onSaved(data)` se dispara tras un alta/edicion exitosa con la entidad
//   devuelta por la API, para que la pagina pueda pre-seleccionarla en el
//   autocomplete de activos (igual que hacia el componente original). Tambien
//   es el callback por defecto tras una rehabilitacion.
// - `onArchived(ocupante)` se dispara tras una baja exitosa (en vez de
//   `onSaved`), para que la pagina pueda limpiar esa seleccion si el ocupante
//   dado de baja era el que estaba elegido en el autocomplete de activos.
export function useOcupanteForm(unidadId, { onSaved, onArchived }) {
  const [showForm, setShowForm] = useState(false)
  const [editingOcupanteId, setEditingOcupanteId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(initialForm)

  const { actionLoadingId, handleBaja, handleRestore, bajaConfirmation, confirmBaja, cancelBaja } = useArchivableEntityActions({
    apiPath: (id) => `/ocupantes/${id}`,
    entityLabel: 'el ocupante',
    getEntityName: (ocupante) => ocupante.nombre,
    buildBajaPayload: (ocupante) => buildOcupantePayload(ocupante, addArchiveFlag(ocupante.notas)),
    buildRestorePayload: (ocupante) => buildOcupantePayload(ocupante, removeArchiveFlag(ocupante.notas)),
    onBaja: onArchived,
    onSaved,
    setError: setFormError,
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingOcupanteId('')
    setForm(initialForm)
    setFormError('')
  }

  const forceOpenCreateForm = () => {
    setShowForm(true)
    setEditingOcupanteId('')
    setForm(initialForm)
    setFormError('')
  }

  const openCreateForm = () => {
    if (showForm && !editingOcupanteId) {
      closeForm()
      return
    }

    forceOpenCreateForm()
  }

  const openEditForm = (ocupante) => {
    setShowForm(true)
    setEditingOcupanteId(ocupante.id)
    setForm({
      nombre: ocupante.nombre ?? '',
      telefono: ocupante.telefono ?? '',
      email: ocupante.email ?? '',
      es_titular: Boolean(ocupante.esTitular),
      notas: removeArchiveFlag(ocupante.notas) ?? '',
    })
    setFormError('')
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!unidadId) {
      return
    }

    setSaving(true)
    setFormError('')

    const nombre = form.nombre.trim()

    if (!nombre) {
      setFormError('El nombre del ocupante es obligatorio.')
      setSaving(false)
      return
    }

    const payload = {
      nombre,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      esTitular: form.es_titular,
      notas: form.notas.trim() || null,
    }

    let data

    try {
      data = editingOcupanteId
        ? await apiClient.put(`/ocupantes/${editingOcupanteId}`, payload)
        : await apiClient.post('/ocupantes', { ...payload, unidadId })
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo guardar el ocupante'
      setFormError(message || 'No se pudo guardar el ocupante')
      setSaving(false)
      return
    }

    closeForm()
    setSaving(false)
    await onSaved?.(data)
  }

  return {
    showForm,
    editingOcupanteId,
    saving,
    actionLoadingId,
    formError,
    form,
    updateField,
    openCreateForm,
    forceOpenCreateForm,
    openEditForm,
    closeForm,
    handleSave,
    handleBaja,
    handleRestore,
    bajaConfirmation,
    confirmBaja,
    cancelBaja,
  }
}
