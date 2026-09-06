// Valores en camelCase: coinciden con EstadoActivo serializado por la API
// (JsonStringEnumConverter CamelCase) y con el enum estado_activo de Postgres.
// Fuente de verdad: api/src/Stc.Domain/Enums/Enums.cs
const ESTADO_ACTIVO_LABELS = {
  activo: 'Activo',
  deBaja: 'De baja',
  enReparacion: 'En reparación',
}

export function estadoActivoLabel(value) {
  return ESTADO_ACTIVO_LABELS[value] ?? value
}

// Filtro global de inventario (InventarioPage)
export const ESTADO_ACTIVO_FILTER_OPTIONS = Object.entries(ESTADO_ACTIVO_LABELS).map(([value, label]) => ({
  value,
  label,
}))
