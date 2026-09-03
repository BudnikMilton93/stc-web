// No hay soft-delete real en la API para sitios/unidades/ocupantes: la baja
// logica se simula con un flag de texto embebido en el campo `notas`. Estas
// funciones centralizan ese mecanismo para que los hooks de cada sub-entidad
// no lo dupliquen.
export const ARCHIVE_FLAG = '[BAJA_LOGICA]'

export function isArchivedRecord(notas) {
  return typeof notas === 'string' && notas.includes(ARCHIVE_FLAG)
}

export function addArchiveFlag(notas) {
  if (isArchivedRecord(notas)) {
    return notas
  }
  return notas ? `${notas}\n${ARCHIVE_FLAG}` : ARCHIVE_FLAG
}

export function removeArchiveFlag(notas) {
  if (!notas) {
    return null
  }

  const cleaned = notas
    .replace(ARCHIVE_FLAG, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  return cleaned || null
}
