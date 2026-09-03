import { useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'

const initialForm = {
  tipo: 'persona',
  nombre: '',
  dniCuit: '',
  email: '',
  telefono: '',
  direccion: '',
  notas: '',
}

// Maneja el estado del modal de alta/edicion de cliente y el guardado
// contra la API. `onSaved` se dispara despues de un guardado exitoso, para
// que quien use el hook decida como refrescar el listado.
export function useClienteForm({ onSaved }) {
  const [editingClienteId, setEditingClienteId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(initialForm)

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

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
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
    await onSaved?.()
  }

  return {
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
  }
}
