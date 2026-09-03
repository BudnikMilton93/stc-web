import { useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { addArchiveFlag, removeArchiveFlag } from '../utils/archiveFlag'
import { useArchivableEntityActions } from './useArchivableEntityActions'

const initialForm = {
  nombre: '',
  tipo: 'edificio',
  direccion: '',
  ciudad: '',
  notas: '',
}

const buildSitioPayload = (sitio, notas) => ({
  nombre: sitio.nombre,
  tipo: sitio.tipo,
  direccion: sitio.direccion,
  ciudad: sitio.ciudad,
  notas,
})

// Maneja el modal de alta/edicion de sitio. La baja logica/rehabilitacion
// (via el archive-flag en `notas`) la resuelve useArchivableEntityActions;
// aca solo se define COMO se ve el payload de un sitio para esas 2 acciones.
// `onSaved` se dispara despues de cada cambio exitoso (alta, edicion, baja o
// rehabilitacion), para que la pagina decida como refrescar el listado.
export function useSitioForm(clienteId, { onSaved }) {
  const [showForm, setShowForm] = useState(false)
  const [editingSitioId, setEditingSitioId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(initialForm)

  const { actionLoadingId, handleBaja, handleRestore } = useArchivableEntityActions({
    apiPath: (id) => `/sitios/${id}`,
    entityLabel: 'el sitio',
    getEntityName: (sitio) => sitio.nombre,
    buildBajaPayload: (sitio) => buildSitioPayload(sitio, addArchiveFlag(sitio.notas)),
    buildRestorePayload: (sitio) => buildSitioPayload(sitio, removeArchiveFlag(sitio.notas)),
    onSaved,
    setError: setFormError,
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingSitioId('')
    setForm(initialForm)
    setFormError('')
  }

  const openCreateForm = () => {
    if (showForm && !editingSitioId) {
      closeForm()
      return
    }

    setShowForm(true)
    setEditingSitioId('')
    setForm(initialForm)
    setFormError('')
  }

  const openEditForm = (sitio) => {
    setShowForm(true)
    setEditingSitioId(sitio.id)
    setForm({
      nombre: sitio.nombre ?? '',
      tipo: sitio.tipo ?? 'edificio',
      direccion: sitio.direccion ?? '',
      ciudad: sitio.ciudad ?? '',
      notas: removeArchiveFlag(sitio.notas) ?? '',
    })
    setFormError('')
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!clienteId) {
      return
    }

    setSaving(true)
    setFormError('')

    const nombre = form.nombre.trim()
    const direccion = form.direccion.trim()

    if (!nombre || !direccion) {
      setFormError('Nombre y direccion son obligatorios.')
      setSaving(false)
      return
    }

    const payload = {
      nombre,
      tipo: form.tipo,
      direccion,
      ciudad: form.ciudad.trim() || null,
      notas: form.notas.trim() || null,
    }

    try {
      if (editingSitioId) {
        await apiClient.put(`/sitios/${editingSitioId}`, payload)
      } else {
        await apiClient.post('/sitios', { ...payload, clienteId })
      }
    } catch (saveError) {
      const message = saveError instanceof ApiError ? saveError.message : 'No se pudo guardar el sitio'
      setFormError(message || 'No se pudo guardar el sitio')
      setSaving(false)
      return
    }

    closeForm()
    setSaving(false)
    await onSaved?.()
  }

  return {
    showForm,
    editingSitioId,
    saving,
    actionLoadingId,
    formError,
    form,
    updateField,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSave,
    handleBaja,
    handleRestore,
  }
}
