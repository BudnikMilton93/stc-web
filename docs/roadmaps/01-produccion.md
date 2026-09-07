# Roadmap de salida a producción (Vercel + Azure)

Este documento registra los pasos necesarios para llevar el sistema a producción real — frontend en Vercel, API en Azure — a diferencia de [00-fortalecimiento.md](00-fortalecimiento.md), que es deuda técnica general. Se originó de un análisis de estado hecho el 2026-09-06 sobre la rama `main` (`bc4876c`).

Contexto: hoy el sistema corre solo en local (Docker + `dotnet run` + `npm run dev`) y contra el único proyecto Supabase remoto. No hay CORS de producción, ni pipeline de deploy, ni definición de dónde/cómo se hostea la API en Azure.

## Estado

| # | Item | Estado | Notas |
|---|---|---|---|
| 1 | CORS de producción en la API | Hecho (2026-09-06) | Policy `FrontendProduction` con origen desde `Cors:ProductionOrigin` (`https://stc-web-six.vercel.app`), separado del policy de dev |
| 2 | `ForwardedHeadersMiddleware` para HTTPS detrás del proxy de Azure | Hecho (2026-09-06) | `UseForwardedHeaders` con `KnownIPNetworks`/`KnownProxies` limpios, antes de `UseHttpsRedirection()` |
| 3 | Secrets en Azure: decisión + carga real | Hecho (2026-09-07) | Application Settings cargadas en el App Service `stc-api` (`westus2`) y verificadas funcionando contra Supabase de producción |
| 4 | Runtime: contenedor Docker en vez de stack nativo de Azure | Hecho (2026-09-06), con fix de arquitectura el 2026-09-07 | Decisión tomada + `api/Dockerfile` creado, probado localmente y en Azure real |
| 5 | Pipeline de deploy a Azure | Hecho (2026-09-07) | `deploy-api` en `.github/workflows/ci.yml`, autenticado contra Azure vía OIDC, validado de punta a punta con un push real |
| 6 | Deploy del frontend en Vercel + variables de entorno | Pendiente, bloqueante | Conectar el repo, configurar `VITE_API_URL`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en el proyecto de Vercel |
| 7 | `vercel.json` con rewrite SPA | Pendiente, a confirmar | Sin esto, refrescar una ruta de `react-router-dom` (ej. `/panel-admin/clientes/123`) puede dar 404 |
| 8 | Health check endpoint en la API | Pendiente, recomendado | Útil para el health probe de Azure App Service |
| 9 | Observabilidad en Azure (Application Insights o logging nativo) | Pendiente, recomendado | Hoy solo hay `log_errores` en Postgres, nada del lado de Azure |
| 10 | Elegir región de Azure cercana a la de Supabase | Pendiente, recomendado | Mitiga la latencia de red documentada en [00-fortalecimiento.md #12](00-fortalecimiento.md) |
| 11 | Evaluar ambiente de staging antes de operar con datos reales | Pendiente, a evaluar | Ya trackeado en [00-fortalecimiento.md #9](00-fortalecimiento.md) — sube de prioridad al salir a producción |
| 12 | Verificación end-to-end post-deploy | En progreso | API verificada en producción real (`POST /leads` → 201, `GET /clientes` sin token → 401); falta el frontend en Vercel para probar el flujo completo |

## Detalle

### 1. CORS de producción en la API — Hecho (2026-09-06)
Agregado el policy `FrontendProduction` en [Program.cs](../../api/src/Stc.Api/Program.cs), separado del policy de dev (`FrontendDev`). El origen sale de `Cors:ProductionOrigin` en [appsettings.json](../../api/src/Stc.Api/appsettings.json) (no es secreto, mismo criterio que `Supabase:Jwt:Issuer` — commiteado, pisable por env var `Cors__ProductionOrigin` en Azure si el dominio cambia). Valor actual: `https://stc-web-six.vercel.app`. Se aplica el policy de dev solo en `Development` y el de producción en cualquier otro ambiente — sin tocar el comportamiento existente.

Pendiente cuando se confirme el dominio final de Vercel (el actual devuelve 404 porque todavía no hay deploy, ver ítem 6): actualizar `Cors:ProductionOrigin` si cambia, o agregar un segundo origen si se quiere permitir también los preview deployments de Vercel.

### 2. `ForwardedHeadersMiddleware` — Hecho (2026-09-06)
Agregado `app.UseForwardedHeaders(...)` en [Program.cs](../../api/src/Stc.Api/Program.cs), antes de `UseHttpsRedirection()`. Usa `ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto` con `KnownIPNetworks`/`KnownProxies` vacíos (`.Clear()`) — el proxy de Azure App Service no es una IP fija conocida de antemano, así que se acepta el header reenviado sin restringir por red de origen (razonable porque la app ya está detrás del edge de Azure, no expuesta directo a internet). Nota: en .NET 10 la propiedad se llama `KnownIPNetworks` (`KnownNetworks` quedó obsoleta, warning `ASPDEPR005`).

Verificado: `dotnet build` sin warnings y los 47 tests de `Stc.Api.Tests` (incluye `WebApplicationFactory` contra Postgres real vía Testcontainers) siguen pasando sin cambios.

### 3. Secrets en Azure — Hecho (2026-09-07)
Decisión: **Application Settings del App Service**, no Key Vault — para un sistema single-admin de este volumen, Key Vault agrega complejidad (managed identity, permisos, un recurso más) sin beneficio claro hoy. Si el negocio crece o una auditoría lo exige, se puede migrar después sin tocar código (la app ya lee todo vía `IConfiguration`, que no le importa el origen). No hace falta ningún `appsettings.Production.json` commiteado — `WebApplication.CreateBuilder` ya agrega el proveedor de variables de entorno, que pisa `appsettings.json`.

Application Settings a cargar en el App Service (nombres con `__` para anidar secciones, convención estándar de .NET):

| Application Setting | Valor | Notas |
|---|---|---|
| `ConnectionStrings__StcDatabase` | connection string del pooler de Supabase en modo sesión, puerto 5432 (ver [02-Backend-API.md](../arquitectura/02-Backend-API.md)) | Cargado. Como el proyecto tiene una sola base, se usó el pooler real (`aws-1-us-west-2.pooler.supabase.com`) — mismo proyecto que ya usa dev/local, no uno separado de producción (ver ítem 11, staging) |
| `Supabase__Jwt__Issuer` | — | No se cargó: el proyecto Supabase es uno solo, coincide con el valor ya commiteado en `appsettings.json` |
| `Cors__ProductionOrigin` | `https://stc-web-six.vercel.app` | Ya tenía default en `appsettings.json`; no hizo falta cargarlo aparte |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Cargado |
| `WEBSITES_PORT` | `8080` | Cargado — necesario para que Azure sepa a qué puerto interno del contenedor mandar el tráfico (el Dockerfile expone `8080`, no privilegiado) |

No hace falta `JwksUri` — se deriva solo del `Issuer` ([JwtOptions.cs](../../api/src/Stc.Api/Auth/JwtOptions.cs)).

Verificado en producción real: `POST /leads` responde `201` (crea el lead contra el Supabase real) y `GET /clientes` sin token responde `401`.

### 4. Runtime: contenedor Docker en vez de stack nativo — Hecho (2026-09-06)
El stack nativo `.NET 10 (LTS)` en Azure App Service todavía figura como "Preview" (Azure no terminó de rolear la validación en todas las regiones, aunque .NET 10 en sí es GA desde noviembre 2025) — ver [🧑🏻‍💻 .NET 10 Preview Now Available on Azure App Service!](https://azure.github.io/AppService/2025/08/26/dotnet-10-preview-on-App-Service.html). Para no depender de ese timing, se decidió containerizar: la API corre como imagen Docker sobre "Web App for Containers" (mismo tipo de App Service Plan, no cambia el costo de compute), controlando la versión exacta de runtime en vez de la que decida exponer la plataforma en cada región.

Comparación de costo hecha antes de decidir: el compute (App Service Plan) cuesta igual con o sin contenedor. La única diferencia es dónde vive la imagen — Azure Container Registry (~USD 5/mes tier Basic) vs. GitHub Container Registry (gratis para este repo, dado que el CI ya corre en GitHub Actions). Se eligió **GHCR**, por lo que el delta de costo real de esta decisión es prácticamente cero.

Implementado: [`api/Dockerfile`](../../api/Dockerfile) (multi-stage: SDK para build/publish, `aspnet:10.0` para runtime, usuario no-root, puerto `8080` no privilegiado) y [`api/.dockerignore`](../../api/.dockerignore). Verificado a mano: `docker build` genera una imagen de 381MB; corriendo el contenedor contra el Postgres local (`supabase start`) con `ConnectionStrings__StcDatabase` apuntando a `host.docker.internal:54322`, la app levanta, `POST /leads` responde `201` (crea el registro real) y `GET /clientes` sin token responde `401` como corresponde.

**Dos problemas reales encontrados al desplegar contra Azure de verdad (2026-09-07), no anticipados en el análisis inicial:**

1. **`docker build` sin `--platform` en Mac Apple Silicon produce una imagen `linux/arm64`.** El App Service Linux (Basic B1) corre sobre infraestructura `amd64` — esa incompatibilidad de arquitectura hacía que Azure reportara el pull como `UnexpectedContainerExit` / "Pull image failed with unexpected exception" (un error genérico, no menciona arquitectura). Intentar cross-compilar directo con `docker buildx build --platform linux/amd64` desde Mac ARM tampoco funcionó: la emulación QEMU crashea corriendo el SDK de .NET (`qemu: uncaught target signal 6 (Aborted)` durante `dotnet restore`). Solución: en [`api/Dockerfile`](../../api/Dockerfile), la etapa de build usa `FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0` — fuerza esa etapa a correr en la arquitectura nativa de quien buildea (sin emulación, rápido), mientras que la etapa final de runtime sí queda en `linux/amd64` (el target pasado a `buildx build --platform`). Funciona porque el output de `dotnet publish` es IL portable, no código nativo — no hace falta cross-compilar de verdad, solo que la imagen final tenga el runtime correcto.
2. **GHCR público + Azure App Service no siempre resuelve el pull anónimo.** Aunque el package se marcó público, Azure seguía fallando el pull con el mismo error genérico — problema conocido de la integración de Azure con el flujo de autenticación anónima OCI de `ghcr.io` (a diferencia de Docker Hub, donde sí es nativo). Solución aplicada: en el Deployment Center, `Tipo de imagen` = `Privado`, con `Registry username` = usuario de GitHub y `Registry password` = un Personal Access Token con scope `read:packages` (con expiración, 90 días) — aunque el package sea público, cargar credenciales explícitas resolvió el pull.

Comando real usado para el build+push (reemplaza al `docker build`/`docker push` simple documentado antes, por el punto 1):
```bash
cd api && docker buildx build --platform linux/amd64 -t ghcr.io/budnikmilton93/stc-api:latest --push .
```

El App Service necesita el Application Setting `WEBSITES_PORT=8080` (ver ítem 3, ya cargado) para saber a qué puerto interno del contenedor mandar el tráfico.

Recurso creado: App Service `stc-api` (Linux, Basic B1, región `westus2`), en el resource group correspondiente, apuntando a `ghcr.io/budnikmilton93/stc-api:latest`. Verificado funcionando contra Supabase de producción real (ver ítem 3).

### 5. Pipeline de deploy a Azure — Hecho (2026-09-07)
Agregado el job `deploy-api` en [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), con `needs: api` (corre después de que pasen lint/tests/build) y `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` (nunca en PRs). Hace: build de la imagen (`linux/amd64`, nativo en el runner — no hace falta el truco `--platform=$BUILDPLATFORM` del Dockerfile acá, aunque no molesta dejarlo por si se buildea a mano desde una Mac ARM de nuevo) → push a GHCR con dos tags (`latest` y `${{ github.sha }}`, usando el `GITHUB_TOKEN` efímero del propio job, sin secret adicional) → `azure/webapps-deploy` apuntando al App Service con la imagen etiquetada por SHA (para que cada deploy sea inequívocamente una imagen nueva, no dependa de que Azure "note" que `:latest` cambió).

**Autenticación contra Azure: OIDC con Service Principal, no publish profile.** El intento original de usar el publish profile (`AZURE_WEBAPP_PUBLISH_PROFILE`) falló porque el App Service tenía **Basic Auth deshabilitado por default** (comportamiento estándar en recursos nuevos, Azure lo desalienta). Se optó por el mecanismo recomendado hoy — sin secrets de larga duración — en vez de simplemente reactivar Basic Auth:

1. App Registration en Microsoft Entra ID (`gh-actions-stc-web`), con un **federated credential** de tipo "GitHub Actions deploying Azure resources" apuntando a `BudnikMilton93/stc-web`, rama `main` (usando Organization ID/Repository ID numéricos de GitHub en vez de nombres — no cambian si se renombra el usuario o el repo).
2. Rol **Website Contributor** (`Colaborador de sitio web`) asignado a ese App Registration, con scope acotado al recurso `stc-api` (el sitio, no el App Service Plan — son tipos de recurso distintos en Azure, el rol tiene que estar en `Microsoft.Web/sites/stc-api`, no en `Microsoft.Web/serverFarms/...`).
3. En el workflow: `azure/login@v2` con `client-id`/`tenant-id`/`subscription-id` (secrets `AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID` en GitHub — IDs, no credenciales por sí solos) y permiso `id-token: write` en el job (requerido para el intercambio OIDC). `azure/webapps-deploy` corre después sin `publish-profile`, reusando la sesión que dejó `azure/login`.

Errores de configuración que aparecieron en el camino y valen la pena documentar porque son fáciles de repetir:

1. **Rol asignado al usuario en vez de al App Registration**, y después **con scope en el App Service Plan en vez del sitio** — el miembro de la asignación tiene que ser la entidad de servicio (`gh-actions-stc-web`), y el scope tiene que quedar en `Microsoft.Web/sites/stc-api` (verificable entrando al recurso `stc-api` → Control de acceso (IAM) → Asignaciones de roles — tiene que listarse ahí, no alcanza con haberlo "asignado" en otra pantalla).
2. **`permission_denied: write_package` al pushear a GHCR desde el workflow.** Dos causas combinadas, hubo que resolver las dos: (a) `Settings → Actions → General → Workflow permissions` del repo estaba en modo restrictivo por default ("Read repository contents permission") — el `permissions: packages: write` del job queda topeado por este ajuste global si no se cambia a "Read and write permissions"; (b) el package `stc-api` se había creado originalmente con un push manual desde la Mac (con un PAT personal), así que GHCR no le daba automáticamente permiso de escritura al `GITHUB_TOKEN` del workflow — hizo falta agregarlo explícito en el package (perfil → Packages → `stc-api` → Package settings → **Manage Actions access** → Add Repository → `stc-web` → rol **Write**).
3. **`Resource stc-api of type Microsoft.Web/Sites doesn't exist`** en `azure/webapps-deploy`, con el rol ya bien asignado. Azure devuelve este mensaje genérico tanto para "no existe" como para "no tenés permiso para verlo" (por diseño, no filtra cuál de las dos). Causa real: la action, sin `resource-group-name`, intenta *listar/buscar* el App Service por nombre en toda la subscription — algo que el rol `Website Contributor` scopeado solo al recurso `stc-api` no permite (solo permite operar sobre ese recurso una vez identificado directamente). Solución: agregar `resource-group-name: stc-web-rg` al step de `azure/webapps-deploy`, para que apunte directo al recurso sin necesitar ese permiso más amplio de listado.

Validado de punta a punta el 2026-09-07: push a `main` → `frontend`/`api` (tests) → `deploy-api` (build linux/amd64 → push a GHCR con tag `latest` + SHA del commit → `azure/webapps-deploy`) → App Service actualizado automáticamente. Verificado post-deploy: `GET /clientes` sin token sigue respondiendo `401` contra el App Service real.

Deuda conocida que queda del período manual: el PAT cargado en el Deployment Center del App Service (para que Azure puede hacer `docker pull` desde GHCR, ver ítem 4) tiene expiración a 90 días y no lo gestiona este pipeline — hay que recordar renovarlo a mano cuando venza, o el pull en producción empieza a fallar.

### 6. Deploy del frontend en Vercel — Pendiente, bloqueante
Conectar el repo en Vercel (auto-detecta Vite). Configurar como variables de entorno del proyecto: `VITE_API_URL` (URL final de la API en Azure), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Confirmar que el root del proyecto en Vercel apunte a `frontend/` (monorepo).

### 7. `vercel.json` con rewrite SPA — Pendiente, a confirmar
Vercel suele resolver esto solo para proyectos Vite detectados como SPA, pero conviene confirmarlo explícitamente con un rewrite `"/(.*)" → "/index.html"` para evitar 404 al refrescar rutas de `react-router-dom`.

### 8. Health check endpoint — Pendiente, recomendado
Agregar un `MapGet("/health", ...)` simple (o `AddHealthChecks()` con chequeo de conexión a la base) para que el health probe de Azure App Service pueda detectar si la API está caída.

### 9. Observabilidad en Azure — Pendiente, recomendado
Evaluar habilitar Application Insights (integración nativa de App Service) o al menos logging a stdout capturado por Azure — para no depender solo de `log_errores` en Postgres para detectar caídas o errores masivos.

### 10. Región de Azure — Pendiente, recomendado
Elegir la región del App Service lo más cercana posible a la región del proyecto Supabase, para minimizar la latencia de round-trip documentada en el roadmap de fortalecimiento.

### 11. Ambiente de staging — Pendiente, a evaluar
Ya trackeado como deuda general en 00-fortalecimiento.md #9. Al salir a producción con datos reales de clientes, evaluar si vale la pena crear un segundo proyecto Supabase de staging antes de que las migraciones remotas empiecen a tocar datos reales.

### 12. Verificación end-to-end post-deploy — Pendiente
Una vez desplegados ambos lados, correr a mano el flujo crítico completo (login → cliente → sitio → unidad → ocupante → activo) y probar `POST /leads` desde la landing pública, ya contra los dominios reales de Vercel y Azure — no alcanza con que build y CI hayan pasado.

## Cómo usar este documento

- Al arrancar un item, pasarlo a "En progreso" y anotar la fecha.
- Al cerrarlo, pasarlo a "Hecho", con el commit o el paso manual (ej. configuración hecha en el portal de Azure/Vercel) que lo resolvió.
- Si aparece un bloqueante nuevo en el camino, agregar una fila en la tabla y su detalle abajo.
