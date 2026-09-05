import { useMemo, useState } from 'react'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { useArchivableEntityActions } from './useArchivableEntityActions'
import { buildActivoBasePayload, buildActivoLifecyclePayload, initialActivoBaseForm, mapActivoToBaseForm } from './activoFormShared'

const initialForm = initialActivoBaseForm

// Maneja el modal de alta/edicion de activo y el autocomplete de ocupante
// responsable. La baja/rehabilitacion la resuelve useArchivableEntityActions;
// a diferencia de sitio/unidad/ocupante (que simulan la baja con una marca de
// texto en `notas`, ver archiveFlag.js), activo SI tiene una columna real
// `estado` ('activo' | 'deBaja') -- por eso aca el payload solo cambia ese
// campo, sin tocar `notas`.
//
// `selectableOcupantes` (ocupantes activos de la unidad) se recibe como
// parametro: de el surge tanto la regla que bloquea el alta de un activo sin
// ocupantes activos (`canCreateActivo`) como las sugerencias del
// autocomplete. `activos` (el listado completo de la unidad) se necesita
// aparte, solo para poder recuperar el `estado` actual del activo que se esta
// editando en `handleSave` y no perderlo al guardar (el form no tiene un
// campo de estado propio).
export function useActivoForm({ clienteId, sitioId, unidadId, activos, selectableOcupantes, onSaved }) {
  const [showForm, setShowForm] = useState(false)
  const [editingActivoId, setEditingActivoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [ocupanteQuery, setOcupanteQuery] = useState('')
  const [selectedOcupanteId, setSelectedOcupanteId] = useState('')

  const { actionLoadingId, handleBaja, handleRestore, bajaConfirmation, confirmBaja, cancelBaja } = useArchivableEntityActions({
    apiPath: (id) => `/activos/${id}`,
    entityLabel: 'el activo',
    getEntityName: (activo) => activo.numeroSerie || activo.tipo,
    buildBajaPayload: (activo) => buildActivoLifecyclePayload(activo, 'deBaja'),
    buildRestorePayload: (activo) => buildActivoLifecyclePayload(activo, 'activo'),
    onSaved,
    setError: setFormError,
  })

  const canCreateActivo = selectableOcupantes.length > 0
  const isFormLocked = !editingActivoId && !canCreateActivo

  const filteredOcupantes = useMemo(() => {
    const query = ocupanteQuery.trim().toLowerCase()
    if (!query) {
      return selectableOcupantes
    }
    return selectableOcupantes.filter((item) => item.nombre.toLowerCase().includes(query))
  }, [ocupanteQuery, selectableOcupantes])

  const selectedOcupante = useMemo(
    () => selectableOcupantes.find((item) => item.id === selectedOcupanteId) ?? null,
    [selectableOcupantes, selectedOcupanteId],
  )

  const closeForm = () => {
    setShowForm(false)
    setEditingActivoId('')
    setForm(initialForm)
    setSelectedOcupanteId('')
    setOcupanteQuery('')
    setFormError('')
  }

  const openCreateForm = () => {
    if (showForm && !editingActivoId) {
      closeForm()
      return
    }

    setShowForm(true)
    setEditingActivoId('')
    setForm(initialForm)
    setSelectedOcupanteId('')
    setOcupanteQuery('')
    setFormError('')
  }

  const startEditForm = (activo) => {
    setShowForm(true)
    setEditingActivoId(activo.id)
    setForm(mapActivoToBaseForm(activo))

    const owner = selectableOcupantes.find((item) => item.id === activo.ocupanteId)
    if (owner) {
      setSelectedOcupanteId(owner.id)
      setOcupanteQuery(owner.nombre)
    } else {
      setSelectedOcupanteId('')
      setOcupanteQuery('')
    }

    setFormError('')
  }

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateOcupanteQuery = (value) => {
    setOcupanteQuery(value)
    setSelectedOcupanteId('')
  }

  const pickOcupante = (id, nombre) => {
    setSelectedOcupanteId(id)
    setOcupanteQuery(nombre)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!unidadId || !sitioId || !clienteId) {
      return
    }

    setSaving(true)
    setFormError('')

    if (!selectedOcupanteId) {
      setFormError('Debes seleccionar un ocupante existente de la unidad o crearlo antes de guardar.')
      setSaving(false)
      return
    }

    const activoActual = editingActivoId ? activos.find((item) => item.id === editingActivoId) : null

    const payload = buildActivoBasePayload(form)

    try {
      if (editingActivoId) {
        await apiClient.put(`/activos/${editingActivoId}`, {
          ...payload,
          ocupanteId: selectedOcupanteId,
          estado: activoActual?.estado ?? 'activo',
        })
      } else {
        await apiClient.post('/activos', {
          ...payload,
          clienteId,
          sitioId,
          unidadId,
          ocupanteId: selectedOcupanteId,
        })
      }
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo guardar el activo'
      setFormError(message || 'No se pudo guardar el activo')
      setSaving(false)
      return
    }

    closeForm()
    setSaving(false)
    await onSaved?.()
  }

  return {
    showForm,
    editingActivoId,
    saving,
    actionLoadingId,
    formError,
    form,
    ocupanteQuery,
    updateOcupanteQuery,
    selectedOcupanteId,
    selectedOcupante,
    filteredOcupantes,
    canCreateActivo,
    isFormLocked,
    updateField,
    pickOcupante,
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
