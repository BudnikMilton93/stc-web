-- ============================================================
-- ESQUEMA: Sistema de gestión de clientes, instalaciones y servicio técnico
-- Postgres (compatible con Supabase / Neon / RDS)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type tipo_cliente as enum ('persona', 'empresa', 'consorcio');
create type tipo_sitio as enum ('edificio', 'casa', 'oficina', 'comercio', 'otro');
create type tipo_activo as enum ('camara', 'portero', 'cerradura_magnetica', 'pc', 'impresora', 'otro');
create type estado_activo as enum ('activo', 'de_baja', 'en_reparacion');
create type tipo_servicio as enum ('instalacion', 'reparacion', 'mantenimiento', 'formateo', 'venta_insumo', 'otro');
create type estado_orden as enum ('pendiente', 'en_proceso', 'esperando_repuesto', 'resuelto', 'cancelado');
create type prioridad_orden as enum ('baja', 'normal', 'alta', 'urgente');
create type estado_lead as enum ('nuevo', 'contactado', 'convertido', 'descartado');
create type rol_usuario as enum ('admin', 'tecnico');

-- ------------------------------------------------------------
-- USUARIOS DEL PANEL (empleados / técnicos)
-- Si usás Supabase Auth, auth_id referencia auth.users(id)
-- ------------------------------------------------------------
create table usuarios (
  id uuid primary key default extensions.uuid_generate_v4(),
  auth_id uuid unique, -- fk logico a auth.users si usas Supabase Auth
  nombre text not null,
  email text unique not null,
  rol rol_usuario not null default 'tecnico',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CLIENTES
-- ------------------------------------------------------------
create table clientes (
  id uuid primary key default extensions.uuid_generate_v4(),
  tipo tipo_cliente not null default 'persona',
  nombre text not null,               -- nombre completo o razon social
  dni_cuit text,
  email text,
  telefono text,
  direccion text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clientes_nombre on clientes using gin (to_tsvector('spanish', nombre));

-- Contactos secundarios (ej: administrador de consorcio, encargado, portero del edificio)
create table contactos_cliente (
  id uuid primary key default extensions.uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nombre text not null,
  cargo text,                          -- "Administrador", "Encargado", etc.
  telefono text,
  email text,
  es_principal boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_contactos_cliente on contactos_cliente(cliente_id);

-- ------------------------------------------------------------
-- SITIOS (edificios, casas, oficinas donde hay instalaciones)
-- ------------------------------------------------------------
create table sitios (
  id uuid primary key default extensions.uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nombre text not null,                -- "Edificio Colon 450"
  tipo tipo_sitio not null default 'edificio',
  direccion text not null,
  ciudad text,
  notas text,
  created_at timestamptz not null default now()
);

create index idx_sitios_cliente on sitios(cliente_id);
create index idx_sitios_direccion on sitios using gin (to_tsvector('spanish', direccion));

-- ------------------------------------------------------------
-- UNIDADES (departamentos/oficinas dentro de un sitio)
-- Un edificio se divide en unidades; una casa puede no tener ninguna.
-- ------------------------------------------------------------
create table unidades (
  id uuid primary key default extensions.uuid_generate_v4(),
  sitio_id uuid not null references sitios(id) on delete cascade,
  identificador text not null,   -- "3B", "PB 1", "Depto 12", etc.
  piso text,
  notas text,
  created_at timestamptz not null default now(),
  unique (sitio_id, identificador)
);

create index idx_unidades_sitio on unidades(sitio_id);

-- ------------------------------------------------------------
-- OCUPANTES (personas asociadas a una unidad — no son "clientes"
-- facturables, son el contacto/tenedor de las llaves o magnetos)
-- ------------------------------------------------------------
create table ocupantes (
  id uuid primary key default extensions.uuid_generate_v4(),
  unidad_id uuid not null references unidades(id) on delete cascade,
  nombre text not null,
  telefono text,
  email text,
  es_titular boolean not null default true, -- distingue el contacto conocido de otros convivientes
  notas text,
  created_at timestamptz not null default now()
);

create index idx_ocupantes_unidad on ocupantes(unidad_id);
create index idx_ocupantes_nombre on ocupantes using gin (to_tsvector('spanish', nombre));

-- ------------------------------------------------------------
-- ACTIVOS (equipos instalados en un sitio/unidad, o propiedad del
-- cliente traida al local para reparacion — ej: una PC no tiene sitio_id)
-- ------------------------------------------------------------
create table activos (
  id uuid primary key default extensions.uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  sitio_id uuid references sitios(id) on delete set null,   -- null = no instalado en un sitio (ej: PC de reparacion)
  unidad_id uuid references unidades(id) on delete set null, -- null = equipo de area comun (portero general, camaras)
  ocupante_id uuid references ocupantes(id) on delete set null, -- quien tiene asignado este magneto/llave especifico
  tipo tipo_activo not null,
  marca text,
  modelo text,
  numero_serie text,          -- el ID unico del magneto va aca
  fecha_instalacion date,
  garantia_hasta date,
  estado estado_activo not null default 'activo',
  notas text,
  created_at timestamptz not null default now()
);

create index idx_activos_cliente on activos(cliente_id);
create index idx_activos_sitio on activos(sitio_id);
create index idx_activos_unidad on activos(unidad_id);
create index idx_activos_ocupante on activos(ocupante_id);
create index idx_activos_tipo on activos(tipo);
create index idx_activos_numero_serie on activos(numero_serie);

-- ------------------------------------------------------------
-- ORDENES DE TRABAJO (ticket activo + registro historico)
-- ------------------------------------------------------------
create table ordenes_trabajo (
  id uuid primary key default extensions.uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  sitio_id uuid references sitios(id) on delete set null,
  activo_id uuid references activos(id) on delete set null,
  tecnico_id uuid references usuarios(id) on delete set null,
  tipo_servicio tipo_servicio not null,
  descripcion text not null,
  estado estado_orden not null default 'pendiente',
  prioridad prioridad_orden not null default 'normal',
  fecha_solicitud timestamptz not null default now(),
  fecha_programada timestamptz,
  fecha_resolucion timestamptz,
  notas_resolucion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ordenes_cliente on ordenes_trabajo(cliente_id);
create index idx_ordenes_sitio on ordenes_trabajo(sitio_id);
create index idx_ordenes_activo on ordenes_trabajo(activo_id);
create index idx_ordenes_estado on ordenes_trabajo(estado);
create index idx_ordenes_fecha on ordenes_trabajo(fecha_solicitud desc);

-- ------------------------------------------------------------
-- INSUMOS / INVENTARIO
-- ------------------------------------------------------------
create table insumos (
  id uuid primary key default extensions.uuid_generate_v4(),
  nombre text not null,
  categoria text,                      -- "camaras", "cerraduras", "insumos_pc", etc.
  sku text unique,
  unidad text not null default 'unidad',
  stock_actual numeric not null default 0,
  stock_minimo numeric not null default 0,
  precio_costo numeric(12,2),
  precio_venta numeric(12,2),
  created_at timestamptz not null default now()
);

create index idx_insumos_categoria on insumos(categoria);

-- Items usados/vendidos en una orden de trabajo (repuestos + mano de obra)
create table orden_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  orden_id uuid not null references ordenes_trabajo(id) on delete cascade,
  insumo_id uuid references insumos(id) on delete set null, -- null = mano de obra u otro concepto
  descripcion text not null,
  cantidad numeric not null default 1,
  precio_unitario numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_orden_items_orden on orden_items(orden_id);

-- Movimientos de stock (entradas/salidas) para trazabilidad de inventario
create table movimientos_stock (
  id uuid primary key default extensions.uuid_generate_v4(),
  insumo_id uuid not null references insumos(id) on delete cascade,
  orden_item_id uuid references orden_items(id) on delete set null, -- si la salida vino de una orden
  tipo text not null check (tipo in ('entrada', 'salida', 'ajuste')),
  cantidad numeric not null,
  motivo text,
  created_at timestamptz not null default now()
);

create index idx_movimientos_insumo on movimientos_stock(insumo_id);

-- ------------------------------------------------------------
-- LEADS (formulario público del sitio, antes de convertirse en cliente)
-- Tabla separada por seguridad: el sitio público solo puede
-- insertar aca, nunca tocar 'clientes' directamente.
-- ------------------------------------------------------------
create table leads (
  id uuid primary key default extensions.uuid_generate_v4(),
  nombre text not null,
  telefono text,
  email text,
  servicio_interes text,
  mensaje text,
  estado estado_lead not null default 'nuevo',
  cliente_id uuid references clientes(id) on delete set null, -- se completa al convertir
  created_at timestamptz not null default now()
);

create index idx_leads_estado on leads(estado);

-- ------------------------------------------------------------
-- ADJUNTOS (fotos de instalaciones, remitos, comprobantes)
-- Tabla polimorfica simple: se referencia por tipo + id de entidad
-- ------------------------------------------------------------
create table adjuntos (
  id uuid primary key default extensions.uuid_generate_v4(),
  entidad_tipo text not null check (entidad_tipo in ('activo', 'orden_trabajo', 'sitio')),
  entidad_id uuid not null,
  url text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

create index idx_adjuntos_entidad on adjuntos(entidad_tipo, entidad_id);

-- ------------------------------------------------------------
-- TRIGGER: updated_at automatico
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_clientes_updated_at before update on clientes
  for each row execute function set_updated_at();

create trigger trg_ordenes_updated_at before update on ordenes_trabajo
  for each row execute function set_updated_at();
