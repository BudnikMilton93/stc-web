// Centraliza el mensaje de "no se puede dar de baja" que usan Sitio y Unidad
// cuando tienen dependientes activos (unidades/ocupantes/activos). El backend
// (Stc.Api.Services.BajaLogicaValidator) es la barrera real -- esto es solo
// una mejora de UX para deshabilitar el boton preventivamente con un tooltip
// explicando el motivo, antes de intentar la request.
function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

// counts: { unidadesActivas, ocupantesActivos, activosActivos } (todos opcionales)
export function describeBajaBlockers({ unidadesActivas = 0, ocupantesActivos = 0, activosActivos = 0 } = {}) {
  const reasons = []

  if (unidadesActivas > 0) {
    reasons.push(pluralize(unidadesActivas, 'unidad activa', 'unidades activas'))
  }
  if (ocupantesActivos > 0) {
    reasons.push(pluralize(ocupantesActivos, 'ocupante activo', 'ocupantes activos'))
  }
  if (activosActivos > 0) {
    reasons.push(pluralize(activosActivos, 'activo activo', 'activos activos'))
  }

  return reasons
}

export function buildBajaBlockedTooltip(reasons) {
  if (!reasons || reasons.length === 0) {
    return ''
  }

  return `No se puede dar de baja: tiene ${reasons.join(' y ')}.`
}
