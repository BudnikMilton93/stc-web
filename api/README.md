# Stc.Api

API en C# (.NET 10, minimal APIs + EF Core) que reemplaza el acceso directo
del frontend a Supabase por un backend propio. La base de datos sigue siendo
el Postgres de Supabase — esta API solo reemplaza la capa de REST/autorizacion
que antes resolvia PostgREST + RLS.

## Estructura

- `src/Stc.Domain` — entidades y enums, sin dependencias externas.
- `src/Stc.Infrastructure` — `DbContext` (EF Core + Npgsql), mapeo de los
  enums nativos de Postgres, configuraciones Fluent API por tabla.
- `src/Stc.Api` — endpoints (minimal API), autenticacion/autorizacion.

## Configurar credenciales (no van al repo)

Solo hace falta la connection string (**Project Settings → Database**
en el dashboard de Supabase). Usar el host del **connection pooler**
(`aws-N-<region>.pooler.supabase.com`), no el host directo — el directo
resuelve a una IP IPv6 que muchas redes no rutean.

Importante: usar el pooler en **modo sesion** (puerto **5432**, el que
Supabase etiqueta como `DIRECT_URL` para migraciones), no en modo
transaccion (puerto 6543, `DATABASE_URL`) — el modo transaccion no
soporta bien la carga de los enums nativos de Postgres que usa este
proyecto (`MapEnum` en `Stc.Infrastructure/ServiceCollectionExtensions.cs`)
y las queries quedan colgadas hasta hacer timeout.

```bash
cd src/Stc.Api
dotnet user-secrets set "ConnectionStrings:StcDatabase" "Host=aws-N-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=...;SSL Mode=Require;Trust Server Certificate=true"
```

`Supabase:Jwt:Issuer` en `appsettings.json` no es secreto (queda commiteado).
No hace falta ningun JWT secret: Supabase migro a **JWT Signing Keys**
(claves publicas rotables) y la API valida los tokens descargando esas
claves del endpoint JWKS del proyecto (`Auth/JwksRetriever.cs` +
`ConfigurationManager<JsonWebKeySet>` en `Program.cs`, con cache y
renovacion automatica — no requiere tocar nada si Supabase rota las claves).

## Correr

```bash
dotnet run --project src/Stc.Api
```

## Autorizacion

El sistema es de un solo usuario admin, sin roles. Esto colapso el
esquema staff/admin que tenian las policies RLS originales de Supabase
en una unica condicion (ver `supabase/migrations/20260901000000_usuario_unico_sin_roles.sql`):

- Policy unica **Activo** (`RequireClaim("activo","true")`, cualquier
  usuario activo en la tabla `usuarios`): puede leer/crear/actualizar/
  borrar todos los recursos. No hay distincion de rol ni delete-only-admin.
- `PUT /ordenes/{id}` ya no tiene chequeo manual de ownership — el campo
  `TecnicoId` en `OrdenTrabajo` se mantiene como dato operativo/historico,
  sin efecto en la autorizacion.

El middleware `CurrentUserEnrichmentMiddleware` toma el JWT de Supabase
(que ya usa el frontend para el login), busca el usuario correspondiente
en la tabla `usuarios` y agrega los claims `activo`/`usuario_id`
que consume la policy `Activo` y los endpoints.

## Endpoints

Todos los recursos del schema estan cubiertos, siguiendo el patron de
`Endpoints/ClientesEndpoints.cs` (`RequireAuthorization("Activo")` a
nivel de grupo, sin distincion por metodo), con una excepcion puntual:

- `POST /leads` — publico (`AllowAnonymous`), sin sesion.

| Recurso | Archivo |
|---|---|
| `/clientes` | `Endpoints/ClientesEndpoints.cs` |
| `/sitios` | `Endpoints/SitiosEndpoints.cs` |
| `/unidades` | `Endpoints/UnidadesEndpoints.cs` |
| `/ocupantes` | `Endpoints/OcupantesEndpoints.cs` |
| `/activos` | `Endpoints/ActivosEndpoints.cs` |
| `/ordenes` | `Endpoints/OrdenesEndpoints.cs` |
| `/insumos` | `Endpoints/InsumosEndpoints.cs` |
| `/movimientos-stock` | `Endpoints/MovimientosStockEndpoints.cs` |
| `/leads` | `Endpoints/LeadsEndpoints.cs` |
| `/usuarios` | `Endpoints/UsuariosEndpoints.cs` |

`orden_items` y `adjuntos` (las dos tablas restantes del schema) todavia
no tienen endpoint propio — son candidatas a resolverse como sub-recursos
de `/ordenes/{id}/items` y `/adjuntos?entidad_tipo=...&entidad_id=...`
cuando el frontend los necesite.

## Proximos pasos

- Migracion del frontend completa: `frontend/` ya llama a esta API para
  todo dato de negocio (`src/lib/apiClient.js`); `@supabase/supabase-js`
  queda solo para Supabase Auth (login/sesion).
- Tests de la API ya existen: `src/Stc.Api.Tests` (xUnit +
  `WebApplicationFactory` + Testcontainers, Postgres real). El frontend
  tambien tiene tests: `frontend/src/**/*.test.{js,jsx}` (Vitest +
  React Testing Library). CI (`.github/workflows/ci.yml`) corre ambos
  en cada push/PR.
- `POST /leads` (unica superficie publica sin sesion) ya tiene rate
  limiting (5 req/min por IP, `AddRateLimiter`) y validacion de input
  (`ValidarCrearLead` en `Endpoints/LeadsEndpoints.cs`).
- Sin CORS definido para produccion (`Program.cs` solo habilita el
  origen de Vite en desarrollo) — decision diferida a proposito hasta
  que exista un dominio real de deploy, no un olvido (ver
  `docs/roadmap-fortalecimiento.md`).
- Endpoints para `orden_items` y `adjuntos` cuando se necesiten.
