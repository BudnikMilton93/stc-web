# 02 - Backend API (C#)

Este documento describe la API propia en C# que vive en [`api/`](../../api), pensada como reemplazo del acceso directo del frontend a Supabase (`supabase-js` + RLS). Para el contexto de negocio y el origen del schema, ver [00-Contexto-Proyecto.md](00-Contexto-Proyecto.md). Para cómo el frontend consume datos *hoy* (todavía vía Supabase directo), ver [01-Estructura.MD](01-Estructura.MD). Para un diagrama visual de todo esto, ver [03-Diagrama.html](03-Diagrama.html).

## Por qué existe

El sistema es de uso interno (2-3 usuarios). El dueño quería mantener práctica en C#/.NET, y la lógica de autorización que resolvía RLS es simple (dos roles, un caso de ownership) — bajo riesgo de reimplementar en una API propia. Ver decisión completa en el historial de la conversación que originó este backend (no hay ADR escrito todavía).

## Qué reemplaza y qué no

- **Reemplaza**: la capa de REST/autorización que hoy resuelve PostgREST + RLS de Supabase, para los recursos de negocio (clientes, sitios, unidades, ocupantes, activos, órdenes, insumos, leads, usuarios).
- **No reemplaza**: Supabase Auth (login) ni el Postgres en sí — la base de datos sigue siendo la misma, alojada en Supabase. La API se conecta a ese mismo Postgres vía el **connection pooler** (ver más abajo).
- **Estado actual**: la API está armada y probada contra la base real, pero el frontend **todavía no la consume** — sigue hablando directo a Supabase. Es el próximo paso pendiente.

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

Se evitó una cuarta capa tipo `Stc.Application` (casos de uso) a propósito: con 2-3 usuarios y lógica simple, la lógica de negocio vive directo en los endpoints. Se puede extraer a una capa de servicios si la complejidad crece.

## Autenticación y autorización

Replica el esquema que tenía la RLS original (`supabase/migrations/20260724195456_rls_policies.sql`):

- **Staff** (cualquier usuario activo en la tabla `usuarios`): puede leer/crear/actualizar la mayoría de los recursos.
- **Admin**: además puede borrar.
- Excepción puntual: en `/ordenes`, el update lo puede hacer el admin o el técnico asignado a esa orden (chequeo manual en el handler, no una policy genérica).
- Excepción puntual: `POST /leads` es público (`AllowAnonymous`) — es el formulario de contacto del sitio, sin sesión.

Mecanismo:

1. El frontend sigue logueando contra **Supabase Auth** (sin cambios) y obtiene un JWT.
2. La API valida ese JWT contra las **JWT Signing Keys** del proyecto (claves públicas rotables — Supabase migró de un secreto HS256 fijo a este esquema). Se descargan del endpoint JWKS del proyecto y se cachean con renovación automática (`Auth/JwksRetriever.cs` + `ConfigurationManager<JsonWebKeySet>` en `Program.cs`). No hay ningún secreto de JWT que gestionar.
3. `Auth/CurrentUserEnrichmentMiddleware.cs` toma el `sub` (auth id) del token, busca el registro correspondiente en `usuarios`, y agrega los claims `rol`/`activo`/`usuario_id` que consumen las policies (`Staff`, `Admin`) y los endpoints que necesitan el id del usuario actual (ej. el chequeo de técnico asignado en órdenes).

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

Todos los recursos del schema están cubiertos (`GET`/`POST`/`PUT`: Staff, `DELETE`: Admin, salvo las excepciones ya mencionadas): `/clientes`, `/sitios`, `/unidades`, `/ocupantes`, `/activos`, `/ordenes`, `/insumos`, `/movimientos-stock`, `/leads`, `/usuarios`.

`orden_items` y `adjuntos` (dos tablas del schema) todavía no tienen endpoint propio — quedan como sub-recursos a resolver cuando el frontend los necesite (ver `api/README.md`).

## Próximos pasos

1. Migrar el frontend para que consuma esta API en vez de `@supabase/supabase-js` para datos de negocio (Supabase Auth se mantiene para el login).
2. Una vez migrado, evaluar si vale la pena desactivar/endurecer más las policies RLS actuales (hoy protegen el escenario "frontend habla directo con la anon key"; si eso deja de pasar, esa capa pasa a ser defensa en profundidad, no la autorización primaria).
3. Endpoints para `orden_items` y `adjuntos`.
