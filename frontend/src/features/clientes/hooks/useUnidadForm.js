import { useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { addArchiveFlag, removeArchiveFlag } from '../utils/archiveFlag'
import { useArchivableEntityActions } from './useArchivableEntityActions'

const initialForm = {
  identificador: '',
  piso: '',
  notas: '',
}

const buildUnidadPayload = (unidad, notas) => ({
  identificador: unidad.identificador,
  piso: unidad.piso,
  notas,
})

// Maneja el modal de alta/edicion de unidad. La baja logica/rehabilitacion
// (via el archive-flag en `notas`) la resuelve useArchivableEntityActions;
// aca solo se define COMO se ve el payload de una unidad para esas 2 acciones.
// `onSaved` se dispara despues de cada cambio exitoso (alta, edicion, baja o
// rehabilitacion), para que la pagina decida como refrescar el listado.
export function useUnidadForm(sitioId, { onSaved }) {
  const [showForm, setShowForm] = useState(false)
  const [editingUnidadId, setEditingUnidadId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(initialForm)

  const { actionLoadingId, handleBaja, handleRestore, bajaConfirmation, confirmBaja, cancelBaja } = useArchivableEntityActions({
    apiPath: (id) => `/unidades/${id}`,
    entityLabel: 'la unidad',
    getEntityName: (unidad) => unidad.identificador,
    buildBajaPayload: (unidad) => buildUnidadPayload(unidad, addArchiveFlag(unidad.notas)),
    buildRestorePayload: (unidad) => buildUnidadPayload(unidad, removeArchiveFlag(unidad.notas)),
    onSaved,
    setError: setFormError,
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingUnidadId('')
    setForm(initialForm)
    setFormError('')
  }

  const openCreateForm = () => {
    if (showForm && !editingUnidadId) {
      closeForm()
      return
    }

    setShowForm(true)
    setEditingUnidadId('')
    setForm(initialForm)
    setFormError('')
  }

  const openEditForm = (unidad) => {
    setShowForm(true)
    setEditingUnidadId(unidad.id)
    setForm({
      identificador: unidad.identificador ?? '',
      piso: unidad.piso ?? '',
      notas: removeArchiveFlag(unidad.notas) ?? '',
    })
    setFormError('')
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!sitioId) {
      return
    }

    setSaving(true)
    setFormError('')

    const identificador = form.identificador.trim()

    if (!identificador) {
      setFormError('El identificador es obligatorio.')
      setSaving(false)
      return
    }

    const payload = {
      identificador,
      piso: form.piso.trim() || null,
      notas: form.notas.trim() || null,
    }

    try {
      if (editingUnidadId) {
        await apiClient.put(`/unidades/${editingUnidadId}`, payload)
      } else {
        await apiClient.post('/unidades', { ...payload, sitioId })
      }
    } catch (saveError) {
      const message = saveError instanceof ApiError ? saveError.message : 'No se pudo guardar la unidad'
      setFormError(message || 'No se pudo guardar la unidad')
      setSaving(false)
      return
    }

    closeForm()
    setSaving(false)
    await onSaved?.()
  }

  return {
    showForm,
    editingUnidadId,
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
    bajaConfirmation,
    confirmBaja,
    cancelBaja,
  }
}
