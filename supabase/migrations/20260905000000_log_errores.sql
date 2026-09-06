-- ============================================================
-- LOG DE ERRORES TECNICOS DE LA API
--
-- Alcance (discovery cerrado, docs/roadmaps/00-fortalecimiento.md
-- item 11): unicamente excepciones no controladas de la API en C#
-- (siempre terminan en 5xx). NO es auditoria de negocio, NO es
-- logging de frontend, NO dispara alertas en tiempo real.
--
-- Consumo: revision manual via SQL directo. No hay endpoint propio
-- (fuera de alcance) ni UI en el frontend.
--
-- Deliberadamente no se loguea el body del request (puede traer
-- datos sensibles de clientes/contactos/ocupantes). La query string
-- si se guarda: en este sistema los filtros son mayormente IDs.
--
-- Sin politica de retencion por ahora (bajo trafico, no bloqueante).
-- Sin RLS: esta tabla la escribe/lee exclusivamente la propia API
-- (nunca el frontend), igual que el resto de las tablas de negocio
-- desde que se migro a Postgres-solo-via-API.
-- ============================================================

create table log_errores (
  id uuid primary key default extensions.uuid_generate_v4(),
  "timestamp" timestamptz not null default now(),
  ruta text not null,
  metodo_http text not null,
  status_code int not null,
  usuario_id uuid references usuarios(id) on delete set null, -- null en requests anonimos (ej. POST /leads)
  tipo_excepcion text not null,
  mensaje text not null,
  stack_trace text,
  query_string text
);

create index idx_log_errores_timestamp on log_errores("timestamp");
