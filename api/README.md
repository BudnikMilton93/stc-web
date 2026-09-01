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

Replica el mismo esquema que tenian las policies RLS de Supabase
(ver `supabase/migrations/20260724195456_rls_policies.sql`):

- **Staff** (cualquier usuario activo en la tabla `usuarios`): puede
  leer/crear/actualizar la mayoria de los recursos.
- **Admin**: ademas puede borrar.
- Excepcion: en `ordenes_trabajo`, el update lo puede hacer el admin
  o el tecnico asignado a esa orden.

El middleware `CurrentUserEnrichmentMiddleware` toma el JWT de Supabase
(que ya usa el frontend para el login), busca el usuario correspondiente
en la tabla `usuarios` y agrega los claims `rol`/`activo`/`usuario_id`
que consumen las policies y los endpoints.

## Endpoints

Todos los recursos del schema estan cubiertos, siguiendo el patron de
`Endpoints/ClientesEndpoints.cs` (GET/POST/PUT: Staff, DELETE: Admin),
con dos excepciones puntuales:

- `PUT /ordenes/{id}` — el admin o el tecnico asignado a esa orden
  (chequeo manual en el handler, no una policy generica).
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
- Sin tests todavia en ninguna capa (API ni frontend) — candidato:
  xUnit + `WebApplicationFactory` para la API.
- Sin CORS definido para produccion (`Program.cs` solo habilita el
  origen de Vite en desarrollo).
- Endpoints para `orden_items` y `adjuntos` cuando se necesiten.
