# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

STC React Web es un CRM técnico interno para un negocio de instalación de cámaras de seguridad, porteros eléctricos y cerraduras magnéticas. Es de uso interno (dueño + técnicos); no hay clientes externos con acceso, salvo un formulario público de leads en la landing.

El repo tiene tres partes:

- `frontend/` — React + Vite (SPA del panel admin y landing pública).
- `api/` — API en C# (.NET, minimal APIs + EF Core) que es la única capa que habla directo con la base de datos de negocio.
- `supabase/` — migraciones SQL del schema y políticas RLS de Postgres (Supabase). Supabase ahora solo se usa como Postgres alojado + Supabase Auth (login); ya no se consulta directo desde el frontend para datos de negocio, RLS queda como defensa en profundidad.

Documentación de arquitectura más detallada (mantenerla actualizada si se toca esto): `docs/arquitectura/00-Contexto-Proyecto.md`, `01-Estructura.MD`, `02-Backend-API.md`, `03-Diagrama.html`.

## Comandos

### Frontend (`frontend/`)

```bash
npm run dev       # servidor de desarrollo (Vite), puerto 5173
npm run build     # build de producción
npm run lint      # oxlint
npm run preview   # sirve el build de producción
```

### API (`api/`)

```bash
cd api/src/Stc.Api
dotnet user-secrets set "ConnectionStrings:StcDatabase" "Host=...;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=...;SSL Mode=Require;Trust Server Certificate=true"
dotnet run --project src/Stc.Api    # corre en http://localhost:5004 (perfil "http")
```

La connection string debe usar el **connection pooler de Supabase en modo sesión (puerto 5432)**, no el host directo (resuelve a IPv6, muchas redes no lo rutean) ni el modo transacción (puerto 6543): este último no soporta bien la carga de los enums nativos de Postgres que usa el proyecto (`MapEnum`) y las queries quedan colgadas hasta timeout.

No hay proyectos de test todavía en ninguna de las dos capas.

### Supabase / base de datos (`supabase/`)

```bash
supabase start                                                    # levanta Postgres local
supabase db reset                                                 # aplica migraciones desde cero, valida en local
supabase gen types typescript --local > frontend/src/types/database.types.ts   # regenerar tipos tras un cambio de schema
```

Todo cambio de esquema va en una migración nueva en `supabase/migrations/` (`<timestamp>_<descripcion>.sql`), validada en local antes de aplicarse en remoto.

## Arquitectura

### Flujo de datos

El frontend **no** habla con Supabase para datos de negocio. Todo el CRUD (clientes, sitios, unidades, ocupantes, activos, inventario) pasa por la API en C#, vía `frontend/src/lib/apiClient.js`. `@supabase/supabase-js` (`frontend/src/lib/supabase.ts`) se usa **únicamente** para Supabase Auth (login/sesión) — no para leer/escribir tablas de negocio.

`apiClient.js` toma `VITE_API_URL` del `.env`, adjunta el JWT de la sesión activa de Supabase como `Authorization: Bearer` en cada request, y expone `get/post/put/patch/delete`. Errores no-2xx se lanzan como `ApiError { status, body, message }`.

`AuthContext` (`frontend/src/context/AuthContext.jsx`) administra la sesión de Supabase Auth y valida contra la API (`GET /usuarios/me`, no la tabla `usuarios` directo) si el usuario logueado es staff activo; si no lo es, cierra la sesión.

### API en C# (`api/`)

Tres proyectos:

- `src/Stc.Domain` — entidades y enums, sin dependencias externas.
- `src/Stc.Infrastructure` — `StcDbContext` (EF Core + Npgsql), mapeo de los enums nativos de Postgres (`ServiceCollectionExtensions.MapEnum`), configuraciones Fluent API por tabla en `Configurations/`.
- `src/Stc.Api` — minimal API endpoints (uno por recurso en `Endpoints/`), autenticación/autorización.

**Autenticación**: Supabase migró a JWT Signing Keys (claves públicas rotables) — no hay JWT secret que configurar. La API valida tokens descargando esas claves del endpoint JWKS del proyecto (`Auth/JwksRetriever.cs` + `ConfigurationManager<JsonWebKeySet>` en `Program.cs`), con cache y renovación automática.

**Autorización**: el sistema es de un solo usuario admin, sin roles (ver `supabase/migrations/20260901000000_usuario_unico_sin_roles.sql`, que colapsó el esquema staff/admin previo):

- Policy única **Activo** (`RequireClaim("activo","true")`): cualquier usuario activo en la tabla `usuarios` puede leer/crear/actualizar/borrar la mayoría de recursos. No hay distinción de roles ni de delete-only-admin.
- `PUT /ordenes/{id}` ya no tiene chequeo manual de "admin o técnico asignado" — el campo `TecnicoId` en `OrdenTrabajo` se mantiene como dato operativo/histórico, sin efecto en la autorización.
- Excepción en `POST /leads`: público (`AllowAnonymous`), sin sesión.

`Auth/CurrentUserEnrichmentMiddleware.cs` toma el `sub` del JWT de Supabase, busca el usuario correspondiente en la tabla `usuarios` y agrega los claims `activo`/`usuario_id` que consumen la policy y los endpoints. Corre después de `UseAuthentication()` y antes de `UseAuthorization()` en `Program.cs`.

Los enums se serializan en camelCase (`JsonStringEnumConverter(JsonNamingPolicy.CamelCase)` en `Program.cs`) para coincidir con los valores en minúsculas que ya espera el frontend (`Persona` -> `persona`).

Nuevos endpoints de recursos deben seguir el patrón de `Endpoints/ClientesEndpoints.cs` (`RequireAuthorization("Activo")` a nivel de grupo, sin distinción por método), salvo que el recurso necesite una regla de autorización distinta (como `leads`).

`orden_items` y `adjuntos` son las únicas tablas del schema sin endpoint propio todavía — candidatas a resolverse como sub-recursos (`/ordenes/{id}/items`, `/adjuntos?entidad_tipo=...&entidad_id=...`).

### Frontend (`frontend/`)

Estructura por features de dominio bajo `src/features/<dominio>/pages/`. Relación de datos del dominio principal: Cliente -> Sitios -> Unidades -> Ocupantes / Activos, con Activo -> Ocupante asignado.

Rutas (`src/App.tsx`) bajo `/panel-admin` están protegidas por `components/auth/ProtectedRoute.jsx`. El sistema es de un solo usuario admin, sin roles, así que no hay vistas admin-only ni `AdminOnlyRoute.jsx`. El shell autenticado (sidebar, header, logout) es `components/layout/AuthenticatedLayout.jsx`.

`src/features/ordenes` es un placeholder sin CRUD funcional todavía (pendiente de implementación). No hay `src/features/usuarios`: se eliminó junto con la ruta `/panel-admin/usuarios` al simplificar el sistema a un solo usuario admin.

`src/types/database.types.ts` son los tipos generados desde el schema de Supabase — regenerar con el comando de arriba después de cualquier cambio de esquema para no quedar desincronizado.

### Base de datos (`supabase/migrations/`)

- `20260724195455_schema.sql` — tablas (clientes, contactos_cliente, sitios, unidades, ocupantes, activos, ordenes_trabajo, orden_items, insumos, movimientos_stock, usuarios, leads, adjuntos), enums, índices y triggers de `updated_at`.
- `20260724195456_rls_policies.sql` — políticas RLS que la autorización de la API replica (ver arriba). Documento de referencia para saber qué regla de acceso aplica a cada recurso.
- `20260724203439_fix_uuid_extension_schema.sql` — corrección de la extensión `uuid-ossp` para compatibilidad remota.
- `20260827140000_narrow_service_scope.sql` — recorte de alcance: el negocio dejó reparación de equipos y venta de insumos sueltos. Redujo `tipo_servicio` a `instalacion`/`mantenimiento`/`otro`, `tipo_activo` a `camara`/`portero`/`cerradura_magnetica`/`otro`, renombró `esperando_repuesto` a `esperando_material`. La tabla `insumos` se mantiene pero redefinida como stock interno de materiales de instalación, no catálogo de venta.

## Convenciones

- No se comitean secretos (anon key, service_role key, connection strings, project-ref): van en `.env` (frontend, ignorado por git) o `dotnet user-secrets` (API). `Supabase:Jwt:Issuer` en `appsettings.json` no es secreto y sí va commiteado.
- Cambios de schema siempre vía una migración nueva en `supabase/migrations/`, validada en local (`supabase db reset`) antes de aplicar en remoto, seguidos de regenerar `frontend/src/types/database.types.ts`.
