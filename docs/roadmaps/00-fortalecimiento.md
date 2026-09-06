# Roadmap de fortalecimiento

Este documento registra la deuda conocida y el plan para resolverla, **no** funcionalidades nuevas del negocio. Es el lugar para ir tachando lo que se resuelve y anotar lo que se descubre en el camino. Para cómo está armado el sistema hoy, ver [docs/arquitectura/](../arquitectura/00-Contexto-Proyecto.md).

Contexto: el frontend terminó de migrar de Supabase directo a la API en C# (agosto 2026). Con la migración cerrada, el objetivo de esta etapa no es escalar funcionalidad sino asegurar que la base aguante antes de operar con datos reales de clientes.

## Estado

| # | Item | Estado | Notas |
|---|---|---|---|
| 1 | Tests de la API (xUnit + `WebApplicationFactory`) | Hecho | `464e294` — 17 tests en `api/src/Stc.Api.Tests`, Postgres real vía Testcontainers |
| 2 | CI básico (build + lint en cada push/PR) | Hecho | `.github/workflows/ci.yml` — build+lint del frontend, build+tests de la API |
| 3 | Revisión de seguridad | Hecho, con 1 ítem diferido | Rate limiting + validación en `/leads`, `npm audit fix`, comentario RLS corregido. CORS de producción queda pendiente hasta que exista un dominio real de deploy |
| 4 | Tests de frontend (Vitest + Testing Library) | Hecho | 25 tests en `frontend/src/**/*.test.{js,jsx}` |
| 5 | E2E de flujos críticos (Playwright) | Hecho | 2 specs en `frontend/e2e/`, corrida manual (`npm run test:e2e`), fuera del CI a propósito |
| 6 | Endpoints `orden_items` y `adjuntos` | Pendiente, sin urgencia | Sub-recursos; esperar a que el frontend los necesite (ordenes/usuarios siguen siendo placeholders) |
| 7 | Baja lógica de `sitios`/`unidades`/`ocupantes` vía flag de texto en `notas` | Pendiente, importante | No hay soft-delete real en el schema para estas 3 tablas; se simula escribiendo `[BAJA_LOGICA]` dentro de `notas`. Reemplazar por una columna real |
| 8 | Falta validar pertenencia jerárquica cliente→sitio→unidad→ocupante en los endpoints CRUD | Pendiente, baja prioridad | Detectado en la revisión de seguridad del feature "equipamiento de sitio". No es IDOR explotable hoy (sistema single-admin), es integridad de datos. Patrón parejo en `ActivosEndpoints`, `SitiosEndpoints`, `UnidadesEndpoints` |
| 9 | No hay ambiente de staging separado de producción | Pendiente, a evaluar | Un solo proyecto Supabase para todo; toda migración remota se aplica directo sobre la base que eventualmente sirve datos reales. Mitigado con el flujo documentado en [docs/arquitectura/04-Migraciones.md](../arquitectura/04-Migraciones.md) (validar en Docker local primero, backup antes de aplicar), pero no reemplaza tener un proyecto Supabase de staging real |
| 10 | `GET /unidades` y `GET /ocupantes` sin paginación | Pendiente, a evaluar | Devuelven la tabla completa (global, no scoped por cliente) en cada request; el frontend las carga enteras para resolver joins en memoria (`InventarioPage`). Aceptable al volumen actual, revisar si el negocio crece |
| 11 | No hay logging de errores técnicos en la API | Hecho (2026-09-05) | `IExceptionHandler` centralizado (`Stc.Api/ExceptionHandling/UnhandledExceptionHandler.cs`) + tabla `log_errores` |

## Detalle

### 1. Tests de la API — Hecho (`464e294`)
`api/src/Stc.Api.Tests`: xUnit + `WebApplicationFactory`, Postgres real vía Testcontainers. Detalle completo de cómo está armado y qué cubre cada archivo: [docs/arquitectura/06-Testing.md](../arquitectura/06-Testing.md#api--xunit--testcontainers).

### 2. CI/CD — Hecho
`.github/workflows/ci.yml` (GitHub Actions), dos jobs independientes en paralelo:
- **frontend**: `npm ci` → `npm run lint` (oxlint) → `npm run test` (Vitest) → `npm run build`.
- **api**: `dotnet restore` → `dotnet build --configuration Release` → `dotnet test --configuration Release` (corre los 17 tests de `Stc.Api.Tests` contra un Postgres real vía Testcontainers; `ubuntu-latest` ya trae Docker Engine corriendo, no requiere configuración extra).

Deliberadamente sin `scan-dependencies`/`scan-for-secrets` todavía: `npm audit` ya reporta 3 vulnerabilidades altas preexistentes (`nanoid`, `react-router`) que agregarían un gate roto desde el día uno. Eso queda para el punto 3 (revisión de seguridad), donde corresponde decidir si se resuelven las vulnerabilidades antes de bloquear el pipeline con ese gate.

### 3. Revisión de seguridad — Hecho, con 1 ítem diferido
Revisión completa (agente `security`): sin hallazgos críticos ni secretos expuestos, sin inyección SQL (todo el acceso pasa por LINQ de EF Core parametrizado), sin IDOR relevante (sistema de un solo usuario), JWT bien configurado (issuer/audience/JWKS con `RequireHttps`). Se resolvió lo siguiente:

- **Rate limiting en `POST /leads`**: única superficie pública sin sesión — se agregó `AddRateLimiter` con `FixedWindowLimiter` particionado por IP (5 req/min) en `Program.cs`, aplicado al endpoint con `.RequireRateLimiting("leads")`.
- **Validación de input en `CrearLeadRequest`**: nombre obligatorio (máx. 200 caracteres), email validado con `MailAddress.TryCreate`, límites de longitud en teléfono/servicio/mensaje. `ActualizarLeadRequest` no tiene campos de texto libre, no necesitaba validación.
- **`npm audit fix` en `frontend/`**: cerró las 3 vulnerabilidades altas (`nanoid`, `react-router`) sin cambios de versión mayor, solo `package-lock.json`.
- **Comentario desactualizado en `20260901000000_usuario_unico_sin_roles.sql`**: mencionaba Edge Functions/`service_role` que no existen en este proyecto — corregido para reflejar que el backend conecta directo con el rol `postgres` del pooler (que tiene `BYPASSRLS`), no con la Data API.

Diferido:
- **CORS de producción sin definir**: `api/src/Stc.Api/Program.cs` solo habilita el origen de Vite en desarrollo (`FrontendDevCorsPolicy`). No es una vulnerabilidad activa hoy (sin CORS explícito, ASP.NET Core deniega cross-origin por default) — el riesgo real sería agregar `AllowAnyOrigin()` apurados en el momento del deploy. Queda bloqueante recién cuando exista un dominio real de producción, no antes.

### 4. Tests de frontend — Hecho
Vitest + React Testing Library, agregado a `.github/workflows/ci.yml` (job `frontend`, step `npm run test`). Detalle completo de qué cubre cada archivo: [docs/arquitectura/06-Testing.md](../arquitectura/06-Testing.md#frontend--vitest--react-testing-library).

### 5. E2E de flujos críticos — Hecho
Playwright, `frontend/e2e/`. El flujo real es login → cliente → sitio → unidad → **ocupante** → activo (no se puede dar de alta un activo sin al menos un ocupante en la unidad, restricción de la UI). Deliberadamente fuera de `.github/workflows/ci.yml` (corrida manual, `npm run test:e2e`) — levantar Supabase + API + frontend + Chromium coordinados es mucho más lento y frágil que los jobs de CI actuales.

Efecto lateral encontrado al escribirlo, contra el sistema real (no simulable con mocks): `api/src/Stc.Api/Program.cs` exigía HTTPS para el JWKS siempre (`RequireHttps = true`), lo cual rompe contra el Supabase local (JWKS por HTTP). Se relajó solo en `Development`, sin afectar producción ni el entorno `Testing` de `Stc.Api.Tests`.

Al retomarlo después de un tiempo sin correrlo se encontraron y corrigieron varios problemas acumulados (un bug real en `global-setup.ts` con `psql -c`, y 6 selectores desactualizados en `flujo-critico.spec.ts` por refactors de UI que nunca le llegaron) — evidencia concreta de que "deliberadamente fuera del CI" tiene un costo real de mantenimiento. Detalle completo, formas de correr Playwright (headless/headed/debug/ui/trace) y los gotchas conocidos: [docs/arquitectura/06-Testing.md](../arquitectura/06-Testing.md#e2e--playwright).

### 6. Endpoints faltantes
`orden_items` y `adjuntos` son las únicas tablas del schema sin endpoint propio. No es urgente: `src/features/ordenes` del frontend sigue siendo un placeholder sin CRUD funcional, así que no hay consumidor todavía (`src/features/usuarios` se eliminó al simplificar el sistema a un solo usuario admin, sin roles).

### 7. Baja lógica de `sitios`/`unidades`/`ocupantes` vía flag de texto en `notas` — Pendiente, importante
Detectado al refactorizar el ABM de detalle de cliente (sitios → unidades → ocupantes/activos, ver `frontend/src/features/clientes/utils/archiveFlag.js`). El schema (`supabase/migrations/20260724195455_schema.sql`) no tiene una columna real de estado/borrado lógico para `sitios`, `unidades` ni `ocupantes` — solo tienen `notas text` libre. Para poder "dar de baja" y "rehabilitar" estos registros sin un DELETE real, el frontend embebe un marcador `[BAJA_LOGICA]` dentro del propio campo `notas` (`isArchivedRecord`/`addArchiveFlag`/`removeArchiveFlag`) y lo interpreta con matching de substring.

Por qué es un problema:
- Mezcla dos responsabilidades en un mismo campo: observaciones libres del técnico y estado del sistema.
- Frágil: si alguien escribe ese texto literal en una nota real, el registro queda "archivado" por accidente.
- No es queryable de forma eficiente (no hay índice ni tipo — es texto libre parseado en el backend/frontend).
- Contraste con `activos`, que sí resuelve esto bien: tiene una columna real `estado` (enum, con valor `deBaja`).

Solución propuesta: agregar una columna real (booleano `activo` o un enum de estado, siguiendo el patrón ya usado en `activos`) a `sitios`, `unidades` y `ocupantes` vía una migración nueva en `supabase/migrations/`, regenerar `frontend/src/types/database.types.ts`, actualizar las configuraciones Fluent API / entidades en `api/src/Stc.Infrastructure` y los endpoints correspondientes en `api/src/Stc.Api/Endpoints`, y simplificar los hooks del frontend (`useSitioForm`, `useUnidadForm`, `useOcupanteForm` y los hooks de listado) para leer/escribir ese campo en vez de manipular `notas`. Cruza las 3 capas (DB + API + frontend), no es un cambio menor.

### 8. Falta validar pertenencia jerárquica cliente→sitio→unidad→ocupante — Pendiente, baja prioridad
Detectado en la revisión de seguridad del feature "equipamiento de sitio" (`ActivosEndpoints.cs`). Los endpoints CRUD de la jerarquía Cliente → Sitio → Unidad → Ocupante/Activo validan reglas de *forma* (por ejemplo, en `POST`/`PUT /activos`, que si hay `unidadId` también haya `sitioId` y `ocupanteId`), pero no verifican que esos IDs realmente encajen entre sí: nada impide, a nivel de API, mandar un `sitioId` que pertenece a otro `clienteId`, o un `unidadId` que no es de ese `sitioId`, o un `ocupanteId` que no es de esa `unidadId`. El mismo patrón (ausencia de esta validación) ya existe en `SitiosEndpoints.cs` y `UnidadesEndpoints.cs` — no es una regresión de un cambio puntual, es una debilidad pareja en todo el CRUD jerárquico.

Por qué no es una prioridad alta: la autorización del sistema es de un solo usuario admin sin roles ni tenants (`RequireClaim("activo","true")`) — no hay separación de datos entre usuarios que esto permita saltar, así que no es un IDOR explotable entre partes no autorizadas. El riesgo real es de **integridad de datos**: un bug de UI, un script mal armado, o un error manual podría dejar un registro con relaciones cruzadas inconsistentes (por ejemplo un activo que aparenta pertenecer a un sitio pero cuyo cliente real es otro).

Solución propuesta: agregar una verificación explícita en cada endpoint de escritura (`POST`/`PUT`) que confirme, contra la base, que `sitioId.ClienteId == clienteId`, `unidadId.SitioId == sitioId`, `ocupanteId.UnidadId == unidadId` antes de persistir, devolviendo `400 BadRequest` si no coincide — siguiendo el mismo estilo que la validación de forma ya agregada en `ActivosEndpoints.cs`. Conviene resolverlo de forma pareja en `ActivosEndpoints`, `SitiosEndpoints`, `UnidadesEndpoints` y `OcupantesEndpoints` en la misma pasada, no solo en el endpoint que lo disparó.

### 9. No hay ambiente de staging separado de producción — Pendiente, a evaluar
Hoy existe un único proyecto Supabase para todo el sistema. No hay un ambiente intermedio entre "local en Docker" (`supabase start`) y el remoto real — toda migración que se aplica en remoto se aplica directo sobre la base que eventualmente sirve (o ya sirve) datos reales de clientes, sin red de seguridad institucional más allá de validar antes en local.

Se encontró en la práctica al llevar la migración `20260903120000_equipamiento_sitio.sql` a remoto: además de esa, había otras 2 migraciones (`20260827140000_narrow_service_scope.sql`, `20260901000000_usuario_unico_sin_roles.sql`) que estaban commiteadas hacía semanas pero nunca se habían aplicado en remoto — nadie se había dado cuenta hasta chequear con `supabase migration list`.

Mitigación aplicada mientras tanto: se documentó un flujo paso a paso en [docs/arquitectura/04-Migraciones.md](../arquitectura/04-Migraciones.md) — validar siempre primero contra Docker local (`supabase db reset` + `dotnet test` vía Testcontainers), revisar manualmente si la migración es destructiva antes de tocar remoto, backup antes de aplicar, y comparar con `supabase migration list` antes y después del `push`. Esto reduce el margen de error pero no reemplaza tener un proyecto Supabase de staging real con datos representativos. Evaluar si vale la pena crear uno cuando el sistema empiece a operar con datos reales de producción.

### 10. `GET /unidades` y `GET /ocupantes` sin paginación — Pendiente, a evaluar
Detectado al revisar un comentario en `frontend/src/features/inventario/pages/InventarioPage.jsx`: como la API no soporta embeds/joins tipo PostgREST, esa página trae `unidades` y `ocupantes` completos una sola vez y los resuelve por id del lado del cliente para no hacer un request por fila de `activos`. Ninguno de los dos endpoints (`UnidadesEndpoints.cs`, `OcupantesEndpoints.cs`) tiene `skip`/`take` ni `page`/`pageSize` — hacen `.ToListAsync()` sin límite. Ambas tablas son globales (no hay filtro por `clienteId`; sí existen `unidades?sitioId=` y `ocupantes?unidadId=`, pero ninguno sirve para acotar por cliente).

Por qué no es urgente: es el mismo patrón de "cargar la lista completa una vez" que ya usa `useClientesList.js` para `/clientes`, aceptado en el resto del código para el volumen actual (un solo negocio, no multi-tenant — realistamente decenas o cientos de clientes, no miles). El riesgo es de crecimiento, no de correctitud hoy.

Solución propuesta si el volumen crece: agregar `skip`/`take` (o `page`/`pageSize`) a `GET /unidades` y `GET /ocupantes`, aplicando `.Skip().Take()` en la query de EF Core antes de traer los datos, para que el corte ocurra en la base y no en memoria. Requeriría además que `InventarioPage` deje de resolver el join completo en el cliente y pase a pedir esos datos ya filtrados o paginados según lo que la vista necesite.

### 11. No hay logging de errores técnicos en la API — Hecho (2026-09-05)
Detectado al auditar el proyecto en busca de trazabilidad de fallas del sistema (agente `discovery`, dos pasadas). `api/src/Stc.Api/Program.cs` no tiene ningún `try/catch`, ningún `ILogger` inyectado en los endpoints, ni `UseExceptionHandler`/middleware de excepciones: hoy una excepción no controlada en cualquier endpoint simplemente se propaga sin quedar registrada en ningún lado persistente. Tampoco hay tabla de logs/auditoría en `supabase/migrations/`, ni logging de errores en el frontend (`apiClient.js` propaga `ApiError` tipado pero nada lo loguea).

Requerimientos ya confirmados por el desarrollador (discovery completo, no queda como "a evaluar"):
- **Alcance**: solo errores técnicos no controlados de la API en C#. Explícitamente fuera: auditoría de negocio (quién hizo qué cambio), logging en frontend, alertas activas en tiempo real.
- **Qué capturar por entrada**: timestamp, ruta, método HTTP, status code, `usuario_id` (nullable — vía el claim que ya agrega `Auth/CurrentUserEnrichmentMiddleware.cs`, nulo en requests anónimas como `POST /leads`), mensaje de excepción, stack trace y tipo de excepción. **No** se loguea el body del request, por los datos sensibles de clientes/contactos/ocupantes que maneja el sistema.
- **Mecanismo**: agregar un middleware/handler centralizado de excepciones en `Program.cs` que capture toda excepción no controlada, la registre y devuelva una respuesta JSON de error consistente con el resto de la API (sin romper el contrato que consume `apiClient.js`). Un error de negocio ya manejado explícitamente (`400`/`409` devueltos a propósito por un endpoint) no debe generar una entrada de log.
- **Almacenamiento**: tabla nueva en el mismo Postgres de Supabase (vía migración en `supabase/migrations/`), no archivo local ni servicio externo (Sentry, etc.) — independiente de dónde se hostee la API a futuro, porque escribe contra la base y no contra el disco del proceso.
- **Consumo**: revisión manual ocasional (SQL directo), sin alertas ni UI/endpoint de lectura dedicado.
- **Retención**: sin límite definido por ahora, dado el bajo volumen esperado; a revisar si el negocio crece.

Implementado: `Stc.Api/ExceptionHandling/UnhandledExceptionHandler.cs` (`IExceptionHandler`, registrado con `AddExceptionHandler`/`UseExceptionHandler` como primer middleware del pipeline, antes de `UseCors`/`UseHttpsRedirection`), entidad `Stc.Domain.Entities.LogError` + `LogErrorConfiguration`, migración `supabase/migrations/20260905000000_log_errores.sql` (tabla `log_errores`, sin RLS — solo la API la toca). El nombre de la tabla es deliberadamente genérico (no `log_errores_api`) para poder sumar en el futuro errores de otro origen (ej. frontend) sin otra migración de rename. Responde con `ProblemDetails` estándar (`AddProblemDetails`), compatible con `ApiError` de `apiClient.js`.

Corregido tras code review: los endpoints con constraint único (`POST`/`PUT /insumos` sobre `Insumo.Sku`, `POST`/`PUT /unidades` sobre `(SitioId, Identificador)`) usan `DbSaveExtensions.TrySaveChangesAsync` para convertir una violación de unicidad (`DbUpdateException` + `PostgresException` `23505`) en un `409 Conflict` explícito, en vez de dejarla llegar como excepción no controlada al handler central y quedar mal clasificada como error técnico.

Segunda pasada de code review encontró un hallazgo teórico ("el handler reutiliza el `DbContext` scoped del request fallido, riesgo de persistir cambios trackeados no guardados"). Al investigar para corregirlo se detectó que la causa real era otra y más seria: `AddExceptionHandler<T>()` registra `IExceptionHandler` como **Singleton** — `UnhandledExceptionHandler` inyectaba `StcDbContext` (scoped) por constructor, lo que lo convertía en una *captive dependency*: una única instancia de `DbContext` capturada para toda la vida de la aplicación y reusada entre requests concurrentes (confirmado empíricamente con logging temporal: mismo hash de instancia en 3 requests distintos, con `ChangeTracker` acumulando entradas entre ellos). Como `DbContext` no es thread-safe, esto podía romper bajo excepciones concurrentes. Corregido resolviendo `StcDbContext` por request desde `httpContext.RequestServices` dentro de `TryHandleAsync`, en vez de por constructor — recién con esa corrección el `ChangeTracker.Clear()` (agregado para el hallazgo original) pasa a ser realmente necesario y verificable.

Tercera pasada de code review, enfocada en simplicidad: encontró que `/test/throw-anonimo` (un tercer endpoint solo de test en `Program.cs`) era prescindible — lo único que probaba (que un `HttpContext.User` sin claims deja `UsuarioId` nulo) no depende del pipeline HTTP completo. Se eliminó de `Program.cs` y el caso se cubre con un test que invoca `UnhandledExceptionHandler.TryHandleAsync` directo, con un `HttpContext` fabricado, sin pasar por `WebApplicationFactory` ni por HTTP. Se mantuvieron `/test/throw` y `/test/throw-con-cambios-trackeados`, que sí necesitan el pipeline real (autorización, ciclo de vida de DI). También se recortó el comentario XML de `UnhandledExceptionHandler` a la explicación de la captive dependency (el "por qué" no obvio), sacando lo que ya es evidente del código.

Cubierto por `Stc.Api.Tests/UnhandledExceptionHandlerTests.cs` (6 tests): excepción no controlada autenticada (`/test/throw`, solo en el entorno `Testing`) queda logueada; una excepción manejada directamente sobre el handler con un `HttpContext` anónimo deja `UsuarioId` nulo; un 400 de validación ya manejado (`POST /leads`) y un 409 por SKU duplicado (`POST /insumos`) no generan ninguna entrada de log; una excepción no controlada no persiste cambios trackeados que el propio endpoint todavía no había guardado (`/test/throw-con-cambios-trackeados`, valida el `ChangeTracker.Clear()` contra el `DbContext` real del request, verificado a mano deshabilitando el fix para confirmar que el test falla sin él).

## Cómo usar este documento

- Al arrancar un item, pasarlo a "En progreso" y anotar la fecha.
- Al cerrarlo, pasarlo a "Hecho", con el commit o PR que lo resolvió.
- Si aparece deuda nueva en el camino (no una feature — deuda), agregar una fila en la tabla y su detalle abajo.
