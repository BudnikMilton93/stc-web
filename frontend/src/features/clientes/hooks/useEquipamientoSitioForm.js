import { useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { useArchivableEntityActions } from './useArchivableEntityActions'
import { buildActivoBasePayload, buildActivoLifecyclePayload, initialActivoBaseForm, mapActivoToBaseForm } from './activoFormShared'

const initialForm = initialActivoBaseForm

const buildEquipamientoPayload = (item, estado) => ({
  ...buildActivoLifecyclePayload(item, estado),
  ocupanteId: null,
})

// Maneja el modal de alta/edicion de equipamiento de sitio (camaras, porteros
// y controles de acceso de areas comunes: activos con sitioId pero sin
// unidad ni ocupante). Analogo a useActivoForm, pero sin la logica de
// autocomplete de ocupante -- este equipamiento nunca tiene uno.
export function useEquipamientoSitioForm({ clienteId, sitioId, equipamiento, onSaved }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(initialForm)

  const { actionLoadingId, handleBaja, handleRestore, bajaConfirmation, confirmBaja, cancelBaja } = useArchivableEntityActions({
    apiPath: (id) => `/activos/${id}`,
    entityLabel: 'el equipamiento',
    getEntityName: (item) => item.numeroSerie || item.tipo,
    buildBajaPayload: (item) => buildEquipamientoPayload(item, 'deBaja'),
    buildRestorePayload: (item) => buildEquipamientoPayload(item, 'activo'),
    onSaved,
    setError: setFormError,
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingId('')
    setForm(initialForm)
    setFormError('')
  }

  const openCreateForm = () => {
    if (showForm && !editingId) {
      closeForm()
      return
    }

    setShowForm(true)
    setEditingId('')
    setForm(initialForm)
    setFormError('')
  }

  const startEditForm = (item) => {
    setShowForm(true)
    setEditingId(item.id)
    setForm(mapActivoToBaseForm(item))
    setFormError('')
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!sitioId || !clienteId) {
      return
    }

    setSaving(true)
    setFormError('')

    const itemActual = editingId ? equipamiento.find((item) => item.id === editingId) : null

    const payload = buildActivoBasePayload(form)

    try {
      if (editingId) {
        await apiClient.put(`/activos/${editingId}`, {
          ...payload,
          ocupanteId: null,
          estado: itemActual?.estado ?? 'activo',
        })
      } else {
        await apiClient.post('/activos', {
          ...payload,
          clienteId,
          sitioId,
          unidadId: null,
          ocupanteId: null,
        })
      }
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo guardar el equipamiento'
      setFormError(message || 'No se pudo guardar el equipamiento')
      setSaving(false)
      return
    }

    closeForm()
    setSaving(false)
    await onSaved?.()
  }

  return {
    showForm,
    editingId,
    saving,
    actionLoadingId,
    formError,
    form,
    updateField,
    openCreateForm,
    startEditForm,
    closeForm,
    handleSave,
    handleBaja,
    handleRestore,
    bajaConfirmation,
    confirmBaja,
    cancelBaja,
  }
}
