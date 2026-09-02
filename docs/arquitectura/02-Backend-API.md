# 02 - Backend API (C#)

Este documento describe la API propia en C# que vive en [`api/`](../../api), que reemplazó el acceso directo del frontend a Supabase (`supabase-js` + RLS) para datos de negocio. Para el contexto de negocio y el origen del schema, ver [00-Contexto-Proyecto.md](00-Contexto-Proyecto.md). Para cómo el frontend consume esta API hoy, ver [01-Estructura.MD](01-Estructura.MD). Para un diagrama visual de todo esto, ver [03-Diagrama.html](03-Diagrama.html).

## Por qué existe

El sistema es de uso interno, hoy operado por un único usuario admin. El dueño quería mantener práctica en C#/.NET, y la lógica de autorización que resolvía RLS es simple — bajo riesgo de reimplementar en una API propia. Ver decisión completa en el historial de la conversación que originó este backend (no hay ADR escrito todavía).

## Qué reemplaza y qué no

- **Reemplaza**: la capa de REST/autorización que hoy resuelve PostgREST + RLS de Supabase, para los recursos de negocio (clientes, sitios, unidades, ocupantes, activos, órdenes, insumos, leads, usuarios).
- **No reemplaza**: Supabase Auth (login) ni el Postgres en sí — la base de datos sigue siendo la misma, alojada en Supabase. La API se conecta a ese mismo Postgres vía el **connection pooler** (ver más abajo).
- **Estado actual**: migración completa. El frontend consume esta API (vía `src/lib/apiClient.js`) para clientes, sitios, unidades, ocupantes, activos e inventario. Solo Supabase Auth (login/sesión) sigue yendo directo desde el frontend.

## Stack

- .NET 10, minimal APIs (sin MVC/controllers — no hace falta esa ceremonia con este volumen de endpoints).
- EF Core + Npgsql para el acceso a datos.
- Autenticación: JWT Bearer, validando los mismos tokens que emite Supabase Auth (el frontend no necesita cambiar su login).

## Estructura de proyectos

```
api/
├── Stc.Api.sln
└── src/
    ├── Stc.Api/             # ejecutable: endpoints, auth, Program.cs
    ├── Stc.Domain/          # entidades + enums, sin dependencias externas
    └── Stc.Infrastructure/  # DbContext (EF Core), configuraciones Fluent API, mapeo de enums nativos de Postgres
```

Se evitó una cuarta capa tipo `Stc.Application` (casos de uso) a propósito: con un solo usuario y lógica simple, la lógica de negocio vive directo en los endpoints. Se puede extraer a una capa de servicios si la complejidad crece.

## Autenticación y autorización

El sistema es de un solo usuario admin, sin roles. Esto colapsó el esquema staff/admin que tenía la RLS original (`supabase/migrations/20260724195456_rls_policies.sql`) en una única condición, ver la migración de ajuste `supabase/migrations/20260901000000_usuario_unico_sin_roles.sql`:

- Policy única **Activo** (`RequireClaim("activo","true")`, cualquier usuario activo en la tabla `usuarios`): puede leer/crear/actualizar/borrar todos los recursos. No hay distinción de rol ni de delete-only-admin.
- `PUT /ordenes` ya no tiene chequeo manual de ownership — el campo `TecnicoId` en `OrdenTrabajo` se mantiene como dato operativo/histórico, sin efecto en la autorización.
- Excepción puntual: `POST /leads` es público (`AllowAnonymous`) — es el formulario de contacto del sitio, sin sesión. Al ser la única superficie pública sin sesión, tiene rate limiting (`AddRateLimiter`/`FixedWindowLimiter` particionado por IP, 5 req/min, `.RequireRateLimiting("leads")`) y validación de input (`ValidarCrearLead` en `Endpoints/LeadsEndpoints.cs`: nombre obligatorio, email validado, límites de longitud) que no aplican al resto de los endpoints.

Mecanismo:

1. El frontend sigue logueando contra **Supabase Auth** (sin cambios) y obtiene un JWT.
2. La API valida ese JWT contra las **JWT Signing Keys** del proyecto (claves públicas rotables — Supabase migró de un secreto HS256 fijo a este esquema). Se descargan del endpoint JWKS del proyecto y se cachean con renovación automática (`Auth/JwksRetriever.cs` + `ConfigurationManager<JsonWebKeySet>` en `Program.cs`). No hay ningún secreto de JWT que gestionar.
3. `Auth/CurrentUserEnrichmentMiddleware.cs` toma el `sub` (auth id) del token, busca el registro correspondiente en `usuarios`, y agrega los claims `activo`/`usuario_id` que consume la policy `Activo` y los endpoints que necesitan el id del usuario actual.

## Acceso a datos

- `Stc.Infrastructure/StcDbContext.cs` — un `DbContext` con una configuración Fluent API por tabla (`Configurations/*.cs`), replicando 1:1 las relaciones y `DeleteBehavior` (cascade/restrict/set null) del schema SQL original.
- Los enums nativos de Postgres (`tipo_cliente`, `estado_orden`, etc., definidos con `create type ... as enum`) se mapean a enums de C# vía `NpgsqlDataSourceBuilder.MapEnum` (`ServiceCollectionExtensions.cs`), no como texto plano.
- Dos columnas que en el schema son texto + `CHECK` (no enum nativo) — `movimientos_stock.tipo` y `adjuntos.entidad_tipo` — se mapean con una conversión manual a string, no con `MapEnum`.

### Conexión a la base — gotchas de producción

La connection string **debe** usar el **connection pooler** de Supabase (Supavisor), no el host directo:

- El host directo (`db.<project-ref>.supabase.co`) resuelve a una IP **IPv6**; muchas redes (incluida la usada para armar y probar esta API) no tienen ruta a esa IP y la conexión falla con `SocketException: No route to host`.
- El pooler en **modo transacción** (puerto 6543, el que Supabase etiqueta `DATABASE_URL`) no soporta bien la carga de los enums nativos que usa este proyecto — las queries se cuelgan hasta hacer timeout (`TimeoutException: Timeout during reading attempt`).
- Lo que funciona: el pooler en **modo sesión** (puerto 5432, el que Supabase etiqueta `DIRECT_URL` — pensado originalmente para migraciones, pero sirve igual acá) — mismo host que el pooler, sin las limitaciones del modo transacción.

Ver [`api/README.md`](../../api/README.md) para el comando exacto de `dotnet user-secrets` con el formato correcto.

## Endpoints

Todos los recursos del schema están cubiertos (policy **Activo** en todos los métodos, salvo la excepción de `/leads` ya mencionada): `/clientes`, `/sitios`, `/unidades`, `/ocupantes`, `/activos`, `/ordenes`, `/insumos`, `/movimientos-stock`, `/leads`.

`GET /usuarios/me` es el único endpoint que queda de `UsuariosEndpoints.cs` (se eliminó el resto: listado, alta, edición, borrado, sin sentido con un solo usuario). Devuelve el usuario correspondiente al JWT actual (usa el claim `usuario_id` que ya agrega `CurrentUserEnrichmentMiddleware`, sin repetir la consulta por `auth_id`) como `UsuarioResponse(Id, Nombre, Email, Activo)`, sin campo de rol. Lo consume `AuthContext.jsx` en el frontend para resolver el perfil después del login, en lugar de consultar la tabla `usuarios` directo contra Supabase.

`GET /activos` acepta filtros opcionales combinables `clienteId`, `sitioId`, `unidadId` (no hay filtro server-side por `tipo` ni `numeroSerie` — el frontend los resuelve en memoria). `GET /sitios` y `GET /unidades` aceptan `clienteId`/`sitioId` respectivamente. `GET /ocupantes` acepta `unidadId`.

`orden_items` y `adjuntos` (dos tablas del schema) todavía no tienen endpoint propio — quedan como sub-recursos a resolver cuando el frontend los necesite (ver `api/README.md`).

## Ajustes hechos durante la migración del frontend

Al conectar el frontend real contra la API se encontraron y corrigieron varios problemas que no eran evidentes sin probar la integración end-to-end:

- **CORS**: no estaba configurado; se agregó una policy solo para `Development` habilitando los orígenes de Vite (`localhost:5173`/`5174`).
- **`MapInboundClaims`**: ASP.NET Core remapea por default el claim `sub` del JWT a un claim type interno, por lo que `CurrentUserEnrichmentMiddleware` nunca lo encontraba y ninguna policy `Staff`/`Admin` funcionaba. Se deshabilitó ese remapeo en `Program.cs`.
- **Serialización de enums**: sin un converter explícito, `TipoCliente`/`TipoActivo`/`EstadoActivo`/`RolUsuario` se serializaban como números en vez de los strings en camelCase (`"persona"`, `"cerraduraMagnetica"`) que espera el frontend. Se agregó un `JsonStringEnumConverter(JsonNamingPolicy.CamelCase)` global.
- **DTOs incompletos**: varios `Response`/`Request` no exponían campos que ya existían en las entidades de dominio y que el frontend necesitaba — `notas` en Cliente/Sitio/Unidad/Ocupante/Activo, `fechaInstalacion` en Activo, y `OcupanteId` en `ActualizarActivoRequest` (sin este último, reasignar el ocupante de un activo al editarlo, o dar de baja/rehabilitar un activo, borraba silenciosamente su asignación).

## Próximos pasos

1. Evaluar si vale la pena endurecer más las policies RLS actuales (hoy protegen el escenario "frontend habla directo con la anon key"; con la migración completa, esa capa pasa a ser defensa en profundidad, no la autorización primaria).
2. Endpoints para `orden_items` y `adjuntos`, cuando se implemente la pantalla de Órdenes (hoy es un placeholder). No hay pantalla de Usuarios pendiente: `frontend/src/features/usuarios` se eliminó al simplificar el sistema a un solo usuario admin.
3. Tests automatizados de la API (`api/src/Stc.Api.Tests`, xUnit + `WebApplicationFactory` + Testcontainers) y una revisión de seguridad ya están hechos (ver [../roadmap-fortalecimiento.md](../roadmap-fortalecimiento.md) para el detalle), igual que CI básico (`.github/workflows/ci.yml`, build+lint del frontend y build+tests de la API en cada push/PR). Queda pendiente la cobertura de tests del lado del frontend (Vitest + Testing Library) y e2e de flujos críticos (Playwright), antes de operar con datos reales de producción.
4. Definir dónde y cómo se hospeda la API en un ambiente de producción — hoy solo corre en local (`localhost:5004`). CORS de producción queda deliberadamente diferido hasta que exista ese dominio real (ver roadmap).
