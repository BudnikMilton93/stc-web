# Roadmap de fortalecimiento

Este documento registra la deuda conocida y el plan para resolverla, **no** funcionalidades nuevas del negocio. Es el lugar para ir tachando lo que se resuelve y anotar lo que se descubre en el camino. Para cómo está armado el sistema hoy, ver [docs/arquitectura/](arquitectura/00-Contexto-Proyecto.md).

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

## Detalle

### 1. Tests de la API — Hecho (`464e294`)
`api/src/Stc.Api.Tests`: xUnit + `WebApplicationFactory`, con Postgres real vía Testcontainers (no InMemory/SQLite: la API mapea enums nativos de Postgres). 17 tests cubriendo la policy única `Activo`, el enriquecimiento de claims (`CurrentUserEnrichmentMiddlewareTests`), `OrdenesEndpoints`, `UsuariosEndpoints`, `LeadsEndpoints` (incluido el `POST` público), `MovimientosStockEndpoints` (cálculo de stock) y un CRUD de punta a punta sobre `ClientesEndpoints`. No corren contra `supabase/migrations/20260724195456_rls_policies.sql` ni `20260901000000_usuario_unico_sin_roles.sql` (dependen de `auth.uid()`/rol `authenticated`, inexistentes en un Postgres vanilla) — la autorización real de los tests es la policy de la API, RLS queda cubierto por el punto 3.

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
Vitest + React Testing Library, agregado a `.github/workflows/ci.yml` (job `frontend`, step `npm run test`). 25 tests:
- `src/lib/apiClient.test.js` — lógica pura mockeando `fetch`/`supabase.auth.getSession`: header `Authorization` presente/ausente, parseo de body (JSON/texto/vacío), `ApiError` con status/body/message correctos, serialización de body en `post/put/patch`.
- `src/components/auth/ProtectedRoute.test.jsx` y `src/features/auth/pages/AdminLoginPage.test.jsx` — ruta crítica de auth, mockeando `useAuth`: loading, redirección si no autorizado/ya autorizado, envío del form, error de `signIn` en pantalla.
- `src/features/clientes/pages/ClientesPage.test.jsx` — un CRUD representativo (carga, filtro en memoria, alta con payload correcto, validación de nombre obligatorio, error de la API en el form), sin repetir el mismo patrón en `SitioDetailPage`/`UnidadDetailPage`/`InventarioPage`/`ClienteDetailPage` (mismo criterio que se usó del lado de la API: cobertura representativa, no exhaustiva).

`AuthContext.jsx` no se testeó de forma aislada — se verifica indirectamente vía `ProtectedRoute`/`AdminLoginPage` mockeando `useAuth`, igual que `CurrentUserEnrichmentMiddleware` se verificó vía la policy real en el punto 1.

### 5. E2E de flujos críticos — Hecho
Playwright, `frontend/e2e/`. El flujo real es login → cliente → sitio → unidad → **ocupante** → activo (no se puede dar de alta un activo sin al menos un ocupante en la unidad, restricción de la UI) — la redacción corta del roadmap omitía ese paso intermedio, pero el spec lo cubre.

- `flujo-critico.spec.ts` — crea toda la jerarquía de punta a punta contra el sistema real (Supabase local + API real + frontend real, sin mocks) y verifica que el activo queda visible con el ocupante asignado.
- `login.spec.ts` — credenciales inválidas muestran el error real de Supabase Auth sin navegar al panel.
- `e2e/global-setup.ts` crea un usuario admin real (Supabase Auth + fila en `usuarios`) antes de que `playwright.config.ts` levante la API y el frontend reales vía `webServer`.
- Corrida manual: `npm run test:e2e` desde `frontend/` (requiere `supabase start` corriendo). **Deliberadamente fuera de `.github/workflows/ci.yml`**: levantar Supabase + API + frontend + Chromium es mucho más lento y frágil (3 procesos coordinados, timing de arranque) que los jobs actuales de segundos — se documenta como corrida manual antes de cambios grandes o de un deploy, no como gate de cada PR.
- Efecto lateral encontrado al correr contra el sistema real (no simulable con mocks): `api/src/Stc.Api/Program.cs` exigía HTTPS para el JWKS siempre (`RequireHttps = true`), lo cual rompe contra el Supabase local (JWKS por HTTP). Se relajó solo en `Development`, sin afectar producción ni el entorno `Testing` de `Stc.Api.Tests` (confirmado: sus 20 tests siguen en verde).

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

## Cómo usar este documento

- Al arrancar un item, pasarlo a "En progreso" y anotar la fecha.
- Al cerrarlo, pasarlo a "Hecho", con el commit o PR que lo resolvió.
- Si aparece deuda nueva en el camino (no una feature — deuda), agregar una fila en la tabla y su detalle abajo.
