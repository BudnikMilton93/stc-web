# Roadmap de fortalecimiento

Este documento registra la deuda conocida y el plan para resolverla, **no** funcionalidades nuevas del negocio. Es el lugar para ir tachando lo que se resuelve y anotar lo que se descubre en el camino. Para cómo está armado el sistema hoy, ver [docs/arquitectura/](arquitectura/00-Contexto-Proyecto.md).

Contexto: el frontend terminó de migrar de Supabase directo a la API en C# (agosto 2026). Con la migración cerrada, el objetivo de esta etapa no es escalar funcionalidad sino asegurar que la base aguante antes de operar con datos reales de clientes.

## Estado

| # | Item | Estado | Notas |
|---|---|---|---|
| 1 | Tests de la API (xUnit + `WebApplicationFactory`) | Hecho | `464e294` — 17 tests en `api/src/Stc.Api.Tests`, Postgres real vía Testcontainers |
| 2 | CI básico (build + lint en cada push/PR) | Hecho | `.github/workflows/ci.yml` — build+lint del frontend, build+tests de la API |
| 3 | Revisión de seguridad | Hecho, con 1 ítem diferido | Rate limiting + validación en `/leads`, `npm audit fix`, comentario RLS corregido. CORS de producción queda pendiente hasta que exista un dominio real de deploy |
| 4 | Tests de frontend (Vitest + Testing Library) | Pendiente | Después de la API |
| 5 | E2E de flujos críticos (Playwright) | Pendiente | Login → cliente → sitio → unidad → activo |
| 6 | Endpoints `orden_items` y `adjuntos` | Pendiente, sin urgencia | Sub-recursos; esperar a que el frontend los necesite (ordenes/usuarios siguen siendo placeholders) |

## Detalle

### 1. Tests de la API — Hecho (`464e294`)
`api/src/Stc.Api.Tests`: xUnit + `WebApplicationFactory`, con Postgres real vía Testcontainers (no InMemory/SQLite: la API mapea enums nativos de Postgres). 17 tests cubriendo la policy única `Activo`, el enriquecimiento de claims (`CurrentUserEnrichmentMiddlewareTests`), `OrdenesEndpoints`, `UsuariosEndpoints`, `LeadsEndpoints` (incluido el `POST` público), `MovimientosStockEndpoints` (cálculo de stock) y un CRUD de punta a punta sobre `ClientesEndpoints`. No corren contra `supabase/migrations/20260724195456_rls_policies.sql` ni `20260901000000_usuario_unico_sin_roles.sql` (dependen de `auth.uid()`/rol `authenticated`, inexistentes en un Postgres vanilla) — la autorización real de los tests es la policy de la API, RLS queda cubierto por el punto 3.

### 2. CI/CD — Hecho
`.github/workflows/ci.yml` (GitHub Actions), dos jobs independientes en paralelo:
- **frontend**: `npm ci` → `npm run lint` (oxlint) → `npm run build`.
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

### 4-5. Tests de frontend y E2E
Sin cobertura. Frontend después de la API (menor blast radius si falla). E2E acotado a los flujos críticos de instalación, no como reemplazo de cobertura unitaria.

### 6. Endpoints faltantes
`orden_items` y `adjuntos` son las únicas tablas del schema sin endpoint propio. No es urgente: `src/features/ordenes` del frontend sigue siendo un placeholder sin CRUD funcional, así que no hay consumidor todavía (`src/features/usuarios` se eliminó al simplificar el sistema a un solo usuario admin, sin roles).

## Cómo usar este documento

- Al arrancar un item, pasarlo a "En progreso" y anotar la fecha.
- Al cerrarlo, pasarlo a "Hecho", con el commit o PR que lo resolvió.
- Si aparece deuda nueva en el camino (no una feature — deuda), agregar una fila en la tabla y su detalle abajo.
