-- ============================================================
-- AJUSTE DE ALCANCE: el negocio dejo de ofrecer reparacion de
-- PC/impresoras y venta de insumos sueltos. Ahora ofrece
-- unicamente instalacion de camaras de seguridad, porteros
-- electricos y cerraduras magneticas (y su mantenimiento).
--
-- Postgres no permite eliminar valores de un enum (no existe
-- `alter type ... drop value`), asi que la estrategia es:
--   1. crear un enum nuevo con los valores vigentes
--   2. migrar cada columna que usa el enum viejo al nuevo tipo
--   3. eliminar el enum viejo y renombrar el nuevo en su lugar
--
-- No hay datos productivos que preservar en el entorno remoto
-- (confirmado por el dueño del sistema: solo datos de prueba),
-- por lo que esta migracion no incluye logica de mapeo de datos
-- existentes. Es apta para `supabase db reset`.
-- ============================================================

-- ------------------------------------------------------------
-- tipo_servicio: se quitan 'reparacion', 'formateo' y
-- 'venta_insumo' (ya no aplican). Se conserva 'mantenimiento'
-- porque las camaras/porteros/cerraduras instaladas requieren
-- mantenimiento periodico, y 'otro' como catch-all generico.
-- ------------------------------------------------------------
create type tipo_servicio_new as enum ('instalacion', 'mantenimiento', 'otro');

alter table ordenes_trabajo
  alter column tipo_servicio type tipo_servicio_new
  using tipo_servicio::text::tipo_servicio_new;

drop type tipo_servicio;
alter type tipo_servicio_new rename to tipo_servicio;

-- ------------------------------------------------------------
-- tipo_activo: se quitan 'pc' e 'impresora' (ya no se instalan
-- ni se reparan). Se conservan los activos de seguridad y 'otro'.
-- ------------------------------------------------------------
create type tipo_activo_new as enum ('camara', 'portero', 'cerradura_magnetica', 'otro');

alter table activos
  alter column tipo type tipo_activo_new
  using tipo::text::tipo_activo_new;

drop type tipo_activo;
alter type tipo_activo_new rename to tipo_activo;

-- ------------------------------------------------------------
-- estado_orden: se renombra el valor 'esperando_repuesto' a
-- 'esperando_material', que generaliza mejor el caso de uso:
-- ordenes de instalacion tambien pueden quedar en pausa
-- esperando que llegue un material (cable, camara, cerradura,
-- etc.), no solo un "repuesto" en sentido de reparacion.
-- ------------------------------------------------------------
create type estado_orden_new as enum ('pendiente', 'en_proceso', 'esperando_material', 'resuelto', 'cancelado');

alter table ordenes_trabajo alter column estado drop default;

alter table ordenes_trabajo
  alter column estado type estado_orden_new
  using (
    case estado::text
      when 'esperando_repuesto' then 'esperando_material'
      else estado::text
    end
  )::estado_orden_new;

alter table ordenes_trabajo alter column estado set default 'pendiente';

drop type estado_orden;
alter type estado_orden_new rename to estado_orden;

-- ------------------------------------------------------------
-- insumos: se actualiza el comentario de 'categoria' para
-- reflejar el nuevo alcance (materiales de instalacion, no
-- catalogo de venta al publico).
--
-- Decision sobre 'precio_venta': se conserva la columna. Ya no
-- representa un precio de venta al publico (no se vende insumo
-- suelto), pero sigue siendo util para valorizar el stock
-- (ej: costo de reposicion estimado usado en cotizaciones de
-- instalacion) y para no romper reportes/calculos existentes.
-- Se documenta su nuevo significado via comentario de columna.
-- ------------------------------------------------------------
comment on column insumos.categoria is 'Categoria del material de instalacion, ej: "camaras", "porteros", "cerraduras", "cableado", "otro".';
comment on column insumos.precio_venta is 'Valor de referencia del insumo para valorizar stock y cotizar instalaciones. No es un precio de venta al publico (no se vende insumo suelto).';
