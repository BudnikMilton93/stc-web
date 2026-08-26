export function toFriendlySupabaseError(error, fallbackMessage = 'No se pudo completar la operacion') {
  if (!error) {
    return fallbackMessage
  }

  const message = String(error.message ?? '').toLowerCase()
  const details = String(error.details ?? '').toLowerCase()
  const hint = String(error.hint ?? '').toLowerCase()

  const looksLikeRls =
    error.code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    details.includes('row-level security') ||
    hint.includes('row-level security')

  if (looksLikeRls) {
    return 'No tenes permisos para realizar esta accion en este recurso.'
  }

  if (error.code === '23505') {
    return 'Ya existe un registro con esos datos. Verifica que no este duplicado.'
  }

  return error.message || fallbackMessage
}
