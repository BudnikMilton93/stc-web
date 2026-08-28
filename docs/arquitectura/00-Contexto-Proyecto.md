# 00 - Contexto del proyecto

Este documento resume el contexto de negocio del sistema y las decisiones de origen sobre cómo se armó la base de datos. Para el detalle de cómo está organizado el frontend, ver [01-Estructura.MD](01-Estructura.MD). Para la API en C#, ver [02-Backend-API.md](02-Backend-API.md). Para un mapa visual de todo esto junto, ver [03-Diagrama.html](03-Diagrama.html) (abrir en el navegador).

## Qué es el sistema

STC React Web es un sistema de gestión interna (CRM técnico) para un negocio que ofrece **instalación de cámaras de seguridad, porteros eléctricos y cerraduras magnéticas**. El negocio no ofrece reparación de equipos informáticos ni venta de insumos al público — ese fue el alcance original del proyecto, pero se redujo antes de avanzar con nuevas funcionalidades.

El sistema es de **uso interno**: solo lo usan el dueño y sus técnicos. No hay clientes externos con acceso al panel, salvo el formulario público de leads en la landing.

## Stack

- Frontend: React + Vite, React Router.
- Backend/API: **API propia en C# (.NET, minimal APIs + EF Core)**, ver [02-Backend-API.md](02-Backend-API.md). Reemplaza el plan original de Edge Functions.
- Base de datos: Supabase (Postgres) — se sigue usando solo como el Postgres alojado (y Supabase Auth para el login). La API en C# es ahora la única capa que habla directo con la base para leer/escribir datos de negocio.
- **Migración completa**: el frontend ya consume la API en C# (vía `src/lib/apiClient.js`) para clientes/sitios/unidades/ocupantes/activos/inventario. `@supabase/supabase-js` se sigue usando únicamente para Supabase Auth (login, sesión) — no para datos de negocio. RLS pasa a ser defensa en profundidad, no la autorización primaria (ver [02-Backend-API.md](02-Backend-API.md)).

## Origen del esquema de base de datos

El esquema se definió en dos migraciones iniciales y se versiona con **Supabase CLI**, no con SQL pegado directo en el dashboard:

- `supabase/migrations/20260724195455_schema.sql` — tablas (clientes, contactos_cliente, sitios, unidades, ocupantes, activos, ordenes_trabajo, orden_items, insumos, movimientos_stock, usuarios, leads, adjuntos), enums, índices y triggers de `updated_at`.
- `supabase/migrations/20260724195456_rls_policies.sql` — políticas de Row Level Security: staff autenticado con CRUD completo salvo delete (solo admin), con excepción de insert público sin sesión en `leads`.
- `supabase/migrations/20260724203439_fix_uuid_extension_schema.sql` — corrección de la extensión `uuid-ossp` para compatibilidad remota.

## Reducción de alcance (instalación únicamente)

El negocio dejó de ofrecer reparación de equipos informáticos y venta de insumos sueltos. Esto generó una migración de ajuste:

- `supabase/migrations/20260827140000_narrow_service_scope.sql` — recorta `tipo_servicio` (queda `instalacion`, `mantenimiento`, `otro`) y `tipo_activo` (queda `camara`, `portero`, `cerradura_magnetica`, `otro`); renombra `esperando_repuesto` a `esperando_material` en `estado_orden`; redocumenta `insumos` como materiales de instalación (stock interno), no catálogo de venta al público.

La tabla `insumos` se mantiene, redefinida: sirve para llevar stock de materiales de instalación (cámaras, cerraduras, cableado, etc.), no para venta al público. Sigue relacionada con `orden_items` (qué material se usó en una orden) y `movimientos_stock` (entradas/salidas de stock).

## Convenciones de trabajo con la base de datos

- Todo cambio de esquema va en una migración nueva dentro de `supabase/migrations/`, con formato `<timestamp>_<descripcion>.sql`.
- Antes de aplicar en remoto, las migraciones se validan en local con `supabase start` + `supabase db reset`.
- Los tipos de TypeScript del frontend se regeneran con `supabase gen types typescript --local > frontend/src/types/database.types.ts` (o `--linked` si se generan contra el proyecto remoto) después de cada cambio de esquema, para no quedar desincronizados.
- No se comitean keys (anon key, service_role key, project-ref) — van en variables de entorno (`.env`, ignorado por git).
