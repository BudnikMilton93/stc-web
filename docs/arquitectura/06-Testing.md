# 06 - Testing

Este documento es la referencia de las tres capas de testing del proyecto: API (xUnit + Testcontainers), frontend (Vitest + Testing Library) y E2E (Playwright). Para el estado de cobertura como *deuda* (qué falta, qué se hizo y cuándo) ver [../roadmaps/00-fortalecimiento.md](../roadmaps/00-fortalecimiento.md) — este documento es la guía de "cómo funciona y cómo se corre", no el tracking de deuda.

## Resumen

| Capa | Framework | Contra qué corre | Cómo se corre | En CI |
|---|---|---|---|---|
| API | xUnit + `WebApplicationFactory` | Postgres real (Testcontainers, contenedor efímero) | `dotnet test` desde `api/` | Sí, en cada push/PR |
| Frontend (unit/componente) | Vitest + React Testing Library | jsdom (sin backend real, todo mockeado) | `npm run test` desde `frontend/` | Sí, en cada push/PR |
| E2E | Playwright | Sistema real: Supabase local (Docker) + API real + frontend real, sin mocks | `npm run test:e2e` desde `frontend/` | No, deliberadamente manual |

## API — xUnit + Testcontainers

`api/src/Stc.Api.Tests/`. Corren contra un **Postgres real**, no InMemory/SQLite — la API mapea los enums nativos de Postgres (`MapEnum`, ver [02-Backend-API.md](02-Backend-API.md)), algo que un motor en memoria no puede reproducir fielmente.

```bash
cd api && dotnet test
```

### Cómo está armado (`Infrastructure/`)

- **`PostgresApiFixture.cs`** — usa `Testcontainers.PostgreSql` para levantar un contenedor Postgres descartable por corrida de tests, le aplica **todas** las migraciones de `supabase/migrations/` en orden (lista `MigrationFilesInApplyOrder`, hay que sumar ahí cada migración nueva o los tests fallan con columnas/tipos inexistentes) y lo destruye al terminar. Es un fixture de xUnit (`ICollectionFixture`), así que el contenedor se comparte entre los tests de una misma clase/colección, no se recrea por cada test individual.
- **`StcApiFactory.cs`** — un `WebApplicationFactory<Program>` apuntado a ese Postgres descartable. Corre la app real bajo `ASPNETCORE_ENVIRONMENT=Testing`, y reemplaza la autenticación JWT real por `TestAuthHandler`.
- **`TestAuthHandler.cs`** — en vez de validar un JWT real contra el JWKS de Supabase (que no existe en este contexto de test), lee un header `Authorization: Bearer <auth-id-guid>` y lo traduce directo a un claim `sub`, tal como lo haría un JWT ya validado. Sin header `Authorization` → no autenticado (mismo comportamiento anónimo real). Esto permite simular cualquier usuario (o ninguno) sin necesidad de emitir tokens firmados de verdad.
- **`TestDataFactory.cs`** — helpers `SeedXxxAsync`/`FindXxxAsync` para insertar filas de prueba directo contra el Postgres del fixture (clientes, sitios, unidades, ocupantes, activos, órdenes, leads, usuarios), evitando repetir SQL/EF a mano en cada test.
- **`ApiJson.cs`** — helpers de (de)serialización JSON consistentes con cómo la API real serializa (camelCase, enums como string).

### Qué cubre cada archivo de test

- `AuthorizationPoliciesTests.cs` — la policy única `Activo` (`RequireClaim("activo","true")`, ver [02-Backend-API.md](02-Backend-API.md)): acceso permitido/denegado según el usuario esté activo o no.
- `CurrentUserEnrichmentMiddlewareTests.cs` — que el middleware agregue correctamente los claims `activo`/`usuario_id` a partir del `sub` del token.
- `ClientesEndpointsTests.cs` — CRUD de punta a punta sobre `/clientes`, como caso representativo del patrón que siguen el resto de los recursos jerárquicos (no se duplica el mismo test para sitios/unidades/ocupantes, mismo criterio que en el frontend).
- `ActivosEndpointsTests.cs` — las reglas de negocio de "equipamiento de sitio" (combinaciones válidas/inválidas de `sitioId`/`unidadId`/`ocupanteId` en `POST`/`PUT /activos`) y el filtro `soloEquipamientoSitio` en `GET /activos`.
- `OrdenesEndpointsTests.cs`, `MovimientosStockEndpointsTests.cs` (incluye el cálculo de stock), `LeadsEndpointsTests.cs` (incluido el `POST` público sin sesión), `UsuariosEndpointsTests.cs` (`GET /usuarios/me`).

No corren contra las políticas RLS de Postgres (`supabase/migrations/20260724195456_rls_policies.sql`, `20260901000000_usuario_unico_sin_roles.sql`) porque dependen de `auth.uid()`/rol `authenticated`, inexistentes en un Postgres vanilla de Testcontainers — la autorización que se testea acá es la de la API (policy `Activo`), RLS queda como defensa en profundidad sin cobertura de test propia (ver revisión de seguridad en [../roadmaps/00-fortalecimiento.md](../roadmaps/00-fortalecimiento.md)).

## Frontend — Vitest + React Testing Library

`frontend/src/**/*.test.{js,jsx}`. Ambiente `jsdom` (navegador simulado en Node, sin un browser real) — para eso está Playwright, ver más abajo.

```bash
npm run test         # una corrida, la que usa CI
npm run test:watch   # modo watch, para ir iterando mientras se escribe/edita un componente
```

Configuración en `vite.config.js` (bloque `test`): `environment: 'jsdom'`, `globals: true` (no hace falta importar `describe`/`it`/`expect` en cada archivo), `setupFiles: ['./src/test/setup.js']` (solo importa `@testing-library/jest-dom` para los matchers `toBeInTheDocument()` etc.), y variables `VITE_*` de prueba fijas (`VITE_API_URL=http://localhost:5004`, un `VITE_SUPABASE_URL`/`ANON_KEY` de proyecto ficticio) — **estas no tocan ninguna base real**, porque estos tests mockean `apiClient`/`supabase.auth` en vez de hacer requests reales. El `exclude` del bloque `test` saca la carpeta `e2e/` explícitamente: sin eso, Vitest también intentaría correr los specs de Playwright y fallaría al importar `@playwright/test`.

### Qué cubre cada archivo

- `lib/apiClient.test.js` — lógica pura mockeando `fetch`/`supabase.auth.getSession`: header `Authorization`, parseo de body, `ApiError` con status/body/message, serialización en `post/put/patch`.
- `components/auth/ProtectedRoute.test.jsx`, `features/auth/pages/AdminLoginPage.test.jsx` — ruta crítica de auth, mockeando `useAuth`: loading, redirecciones, envío del form, error de `signIn`.
- `components/ui/Modal.test.jsx` — comportamiento genérico del componente `Modal` reusado en todos los ABM.
- `features/clientes/pages/{ClientesPage,ClienteDetailPage,SitioDetailPage,UnidadDetailPage}.test.jsx` — cobertura representativa de los CRUD de la jerarquía Cliente → Sitio → Unidad → Ocupante/Activo (carga, alta, validación, error de API), no exhaustiva en cada página (mismo criterio de representatividad que en la API).

`AuthContext.jsx` no se testea de forma aislada — se verifica indirectamente vía `ProtectedRoute`/`AdminLoginPage` mockeando `useAuth`.

## E2E — Playwright

`frontend/e2e/`. A diferencia de las otras dos capas, **no mockea nada**: corre contra el sistema real completo (Supabase local en Docker + API real en C# + frontend real), verificando que las piezas realmente encastran entre sí.

### Requisito previo

`supabase start` corriendo (Postgres local en Docker, ver [05-Ambientes.md](05-Ambientes.md)). Playwright levanta la API y el frontend solo — **no** hace falta correr `dotnet run`/`npm run dev` a mano, y **no** importa a qué esté apuntando tu `dotnet user-secrets` en ese momento: `playwright.config.ts` fuerza su propia connection string al Postgres local (`Host=127.0.0.1;Port=54322;...`, hardcodeada como default, overrideable con `E2E_API_DB_CONNECTION_STRING`) al levantar la instancia de la API específica para los tests, independiente de tu configuración de desarrollo.

```bash
npm run test:e2e
```

### Qué specs hay

- `global-setup.ts` — corre una sola vez, antes de todos los specs (`config.globalSetup` en `playwright.config.ts`, Playwright lo invoca automáticamente; ejecutarlo manualmente con `npx tsx e2e/global-setup.ts` **no hace nada**, porque el archivo solo define y exporta la función, no la auto-invoca). Crea (o reutiliza) un usuario admin de prueba: un usuario real en Supabase Auth local vía la Admin API (`supabaseAdmin.auth.admin.createUser`, bypasea confirmación de mail) y su fila correspondiente en `usuarios` con `activo = true` (sin la cual `GET /usuarios/me` devuelve 404 y `AuthContext` cierra la sesión). Credenciales fijas en `e2e/support/testAdmin.ts` (`e2e-admin@stc.local` / `E2E-admin-password-1`, overrideables por env var) — no son un secreto real, solo existen en la instancia local.
- `login.spec.ts` — credenciales inválidas muestran el error real de Supabase Auth sin navegar al panel.
- `flujo-critico.spec.ts` — el flujo real de punta a punta: login → cliente → sitio → unidad → **ocupante** → activo (no se puede dar de alta un activo sin al menos un ocupante en la unidad, restricción de la UI) — crea toda la jerarquía y verifica que el activo queda visible con el ocupante asignado.

### Por qué está fuera del CI, a propósito

Levantar Supabase + API + frontend + Chromium coordinados es mucho más lento y frágil que los jobs actuales de segundos (`.github/workflows/ci.yml` solo corre API y frontend). Se documenta como corrida manual antes de cambios grandes o de un deploy, **no** como gate de cada PR/push.

**El costo real de esto**: al no correr seguido, se desactualiza en silencio cuando cambia la UI que los specs ejercitan, y nadie lo nota hasta la próxima corrida manual — varios meses después de escrito, `flujo-critico.spec.ts` tenía 6 selectores/pasos rotos de cambios de UI que ya se habían commiteado sin actualizarlo (detalle completo en el historial de `git log -- frontend/e2e/`, o ver la entrada correspondiente ya resuelta en [../roadmaps/00-fortalecimiento.md](../roadmaps/00-fortalecimiento.md)). La recomendación práctica: si vas a tocar una pantalla que el E2E cubre, correlo como parte del cambio, no solo antes del próximo deploy grande.

### Formas de correr Playwright

Todas parten de `frontend/`, con `supabase start` corriendo:

| Comando | Qué hace | Cuándo usarlo |
|---|---|---|
| `npm run test:e2e` | Corre todos los specs **headless** (sin ventana de navegador visible) | Verificación rápida, la corrida "normal" antes de un cambio grande o un deploy |
| `npx playwright test --headed` | Igual que el anterior, pero abre una ventana real de Chromium y se ve la ejecución en vivo | Confirmar visualmente que un flujo se ve bien, no solo que los asserts pasan |
| `npx playwright test --headed --slow-mo=500` | Como `--headed`, pero con una pausa (acá 500ms) entre cada acción | Cuando `--headed` solo va demasiado rápido para seguirlo a simple vista |
| `npx playwright test --debug` | Abre el navegador **pausado**, con el Playwright Inspector: se avanza paso a paso manualmente, con la posibilidad de editar el selector de cada paso ahí mismo | Diagnosticar por qué un paso puntual falla, sin adivinar leyendo el error a ciegas |
| `npx playwright test --ui` | Abre un panel interactivo (timeline, screenshot de cada paso, se puede "viajar" por la ejecución, re-correr un test suelto) | Iterar rápido arreglando varios specs rotos seguidos — es el más cómodo para eso, mejor que repetir `--headed` una y otra vez |
| `npx playwright show-trace test-results/<carpeta>/trace.zip` | Abre la traza guardada de una corrida ya terminada (`trace: 'retain-on-failure'` en `playwright.config.ts` la guarda solo si el test falló) | Ver qué pasó en una corrida ya terminada (por ejemplo la manual de otra persona), sin tener que reproducirla en vivo |

Todos aceptan filtrar a un archivo/test puntual en vez de correr toda la suite, por ejemplo: `npx playwright test e2e/flujo-critico.spec.ts --headed`.

### Gotchas conocidos

- **`psql -c` no interpola variables `:'var'` en todas las versiones del cliente** — confirmado roto con psql 18.4 de Homebrew (tira `syntax error at or near ":"`), funciona sin problema si el mismo SQL se pasa por stdin. `global-setup.ts` (`ensureUsuarioRow`) usa `input`/`stdio: ['pipe', 'inherit', 'inherit']` en vez de `-c` por este motivo — si se vuelve a tocar ese insert, mantener ese patrón.
- **Selectores frágiles ante refactors de UI**: los specs referencian clases CSS (`.data-grid-row`), labels de formulario, y texto visible exacto. Un refactor de una pantalla cubierta por el E2E (cambiar de lista a `DataGrid`, corregir una tilde, renombrar un botón) rompe el spec correspondiente sin que ningún otro test lo detecte — ver la sección de arriba sobre por qué correrlo seguido importa.
- **`getByLabel`/`getByText` sin `exact: true` puede matchear de más**: cuando la misma palabra aparece en dos controles de la misma pantalla (un campo de formulario y un buscador con label parecido, o un identificador que también aparece como substring de un título más largo), Playwright tira "strict mode violation" en vez de adivinar cuál. Se resuelve con `{ exact: true }` en el `getByLabel`/`getByText` correspondiente, acotando a la coincidencia exacta.

## Paquetes y versiones (para referencia rápida)

- **API**: `xunit` 2.9.3, `Microsoft.AspNetCore.Mvc.Testing` (para `WebApplicationFactory`), `Testcontainers.PostgreSql` 4.14.0, `coverlet.collector` (cobertura, no explotado activamente hoy).
- **Frontend**: `vitest` 4.1.11, `@testing-library/react` 16.3.3, `@testing-library/jest-dom` 7.0.1, `@testing-library/user-event` 14.6.7, `jsdom` 30.0.1.
- **E2E**: `@playwright/test` 1.62.1 (solo proyecto `chromium` configurado hoy, no Firefox/WebKit).

Ver `package.json`/`*.csproj` correspondientes para la versión exacta vigente — esta lista es de referencia, no la fuente de verdad (que son los propios manifiestos).
