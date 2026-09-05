// Valores en camelCase: coinciden con TipoActivo serializado por la API
// (JsonStringEnumConverter CamelCase) y con el enum tipo_activo de Postgres.
// Fuente de verdad: api/src/Stc.Domain/Enums/Enums.cs
const TIPO_ACTIVO_LABELS = {
  camara: 'Cámara',
  portero: 'Portero',
  cerraduraMagnetica: 'Cerradura magnética',
  llavero: 'Llavero',
  controlAcceso: 'Control de acceso',
  otro: 'Otro',
}

function buildOptions(values) {
  return values.map((value) => ({ value, label: TIPO_ACTIVO_LABELS[value] }))
}

// Activos de ocupante/unidad (UnidadDetailPage)
export const TIPOS_ACTIVO_OPTIONS = buildOptions(['camara', 'portero', 'cerraduraMagnetica', 'llavero', 'otro'])

// Equipamiento de sitio (SitioDetailPage): sin cerraduraMagnetica ni llavero,
// que son especificos de unidad/ocupante, no de areas comunes.
export const TIPOS_EQUIPAMIENTO_SITIO_OPTIONS = buildOptions(['camara', 'portero', 'controlAcceso', 'otro'])

// Filtro global de inventario (InventarioPage)
export const TIPO_ACTIVO_FILTER_OPTIONS = buildOptions(['camara', 'portero', 'cerraduraMagnetica', 'otro'])
