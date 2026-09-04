-- ============================================================
-- EQUIPAMIENTO DE SITIO
--
-- Hasta ahora `activos` siempre representaba un equipo asignado a
-- un ocupante dentro de una unidad (la UI lo forzaba, aunque el
-- schema ya tenia unidad_id/ocupante_id nullable). Se necesita
-- trackear tambien equipamiento instalado a nivel de SITIO (areas
-- comunes de un edificio, playa de estacionamiento, etc.), sin
-- ocupante ni unidad: camaras, porteros y controles de acceso de
-- uso comun, instancia por instancia (no un contador agregado).
--
-- Decision: extender la tabla `activos` existente en vez de crear
-- una tabla nueva. Ya soporta unidad_id/ocupante_id nullable
-- (pensada originalmente para "equipo de area comun"), ya tiene
-- cliente_id + sitio_id, y OrdenTrabajo.ActivoId puede referenciar
-- estos items sin agregar una FK nueva. Una tabla separada
-- duplicaria columnas (tipo, marca, modelo, numero_serie, estado,
-- fechas) sin necesidad real: es un CRM chico de uso interno, no
-- amerita el overhead de mantenimiento de un segundo modelo.
--
-- Cambios:
--   1. tipo_activo: se agregan 'llavero' (activo de ocupante/unidad,
--      hoy mapeaba a 'otro') y 'control_acceso' (equipamiento de
--      sitio nuevo).
--   2. activos: se agregan proximo_mantenimiento y ultima_revision
--      (fechas informativas, sin alertas automaticas - fuera de
--      alcance de esta fase).
--
-- No hay datos productivos que migrar (confirmado por el dueño del
-- sistema). Apta para `supabase db reset`.
-- ============================================================

alter type tipo_activo add value if not exists 'llavero';
alter type tipo_activo add value if not exists 'control_acceso';

alter table activos
  add column proximo_mantenimiento date,
  add column ultima_revision date;

comment on column activos.proximo_mantenimiento is 'Fecha informativa de proximo mantenimiento programado. Sin alertas automaticas (fuera de alcance).';
comment on column activos.ultima_revision is 'Fecha del ultimo relevamiento manual hecho al equipo, independiente de las ordenes de trabajo.';

-- Invariante reforzada tambien en la API (ActivosEndpoints): un activo
-- con unidad_id tiene ocupante_id y sitio_id; sin unidad_id, no puede
-- tener ocupante_id (equipamiento de sitio no se asigna a un ocupante)
-- pero siempre requiere sitio_id (siempre cuelga de un sitio).
alter table activos
  add constraint activos_unidad_ocupante_check check (
    (unidad_id is not null and ocupante_id is not null and sitio_id is not null)
    or (unidad_id is null and ocupante_id is null and sitio_id is not null)
  );
