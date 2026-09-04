// Estado visual del proximo mantenimiento de un item de equipamiento de
// sitio, para poder resaltar en la grilla cuales conviene revisar pronto.
// Es puramente informativo (fuera de alcance: alertas/notificaciones
// automaticas) -- solo determina que "chip" mostrar y como ordenar la lista.
const DIAS_PROXIMO = 30

export function getMantenimientoStatus(fechaIso) {
  if (!fechaIso) {
    return 'sinDefinir'
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = new Date(`${fechaIso}T00:00:00`)
  const diffDias = Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias < 0) {
    return 'vencido'
  }
  if (diffDias <= DIAS_PROXIMO) {
    return 'proximo'
  }
  return 'ok'
}

// Ordena por proxima fecha de mantenimiento ascendente, priorizando lo
// vencido/proximo primero; los items sin fecha definida quedan al final.
export function sortByProximoMantenimiento(items) {
  return [...items].sort((a, b) => {
    if (!a.proximoMantenimiento && !b.proximoMantenimiento) return 0
    if (!a.proximoMantenimiento) return 1
    if (!b.proximoMantenimiento) return -1
    return a.proximoMantenimiento.localeCompare(b.proximoMantenimiento)
  })
}
