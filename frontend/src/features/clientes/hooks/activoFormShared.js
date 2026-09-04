// Campos de formulario y payload comunes a useActivoForm (activos de
// ocupante/unidad) y useEquipamientoSitioForm (equipamiento de sitio).
// Compartir esto evita que un cambio de contrato de /activos (como
// proximoMantenimiento/ultimaRevision) se aplique en un hook y se olvide en
// el otro.
export const initialActivoBaseForm = {
  tipo: 'camara',
  marca: '',
  modelo: '',
  numero_serie: '',
  fecha_instalacion: '',
  garantia_hasta: '',
  proximo_mantenimiento: '',
  ultima_revision: '',
  notas: '',
}

export const mapActivoToBaseForm = (activo) => ({
  tipo: activo.tipo,
  marca: activo.marca ?? '',
  modelo: activo.modelo ?? '',
  numero_serie: activo.numeroSerie ?? '',
  fecha_instalacion: activo.fechaInstalacion ?? '',
  garantia_hasta: activo.garantiaHasta ?? '',
  proximo_mantenimiento: activo.proximoMantenimiento ?? '',
  ultima_revision: activo.ultimaRevision ?? '',
  notas: activo.notas ?? '',
})

export const buildActivoBasePayload = (form) => ({
  tipo: form.tipo,
  marca: form.marca.trim() || null,
  modelo: form.modelo.trim() || null,
  numeroSerie: form.numero_serie.trim() || null,
  fechaInstalacion: form.fecha_instalacion || null,
  garantiaHasta: form.garantia_hasta || null,
  proximoMantenimiento: form.proximo_mantenimiento || null,
  ultimaRevision: form.ultima_revision || null,
  notas: form.notas.trim() || null,
})

export const buildActivoLifecyclePayload = (activo, estado) => ({
  tipo: activo.tipo,
  ocupanteId: activo.ocupanteId,
  marca: activo.marca,
  modelo: activo.modelo,
  numeroSerie: activo.numeroSerie,
  fechaInstalacion: activo.fechaInstalacion,
  garantiaHasta: activo.garantiaHasta,
  proximoMantenimiento: activo.proximoMantenimiento,
  ultimaRevision: activo.ultimaRevision,
  notas: activo.notas,
  estado,
})
