import { isArchivedRecord } from './archiveFlag'

// Cuenta cuantos `rows` no archivados corresponden a cada padre (agrupando
// por `parentKey`). Si se pasa `activeParentIds`, ademas descarta los rows
// cuyo padre no esta en ese set -- evita que un hijo activo que cuelga de un
// padre ya dado de baja (dato legacy, o una carrera antes de que exista el
// guard de baja-bloqueada) se cuele en un conteo cuyo padre no se muestra.
export function countActiveByParent(rows, parentKey, activeParentIds) {
  return (rows ?? [])
    .filter((row) => !isArchivedRecord(row.notas))
    .filter((row) => !activeParentIds || activeParentIds.has(row[parentKey]))
    .reduce((acc, row) => {
      acc[row[parentKey]] = (acc[row[parentKey]] ?? 0) + 1
      return acc
    }, {})
}
