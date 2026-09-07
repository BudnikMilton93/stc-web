# Roadmap de salida a producción (Vercel + Azure)

Este documento registra los pasos necesarios para llevar el sistema a producción real — frontend en Vercel, API en Azure — a diferencia de [00-fortalecimiento.md](00-fortalecimiento.md), que es deuda técnica general. Se originó de un análisis de estado hecho el 2026-09-06 sobre la rama `main` (`bc4876c`).

Contexto: hoy el sistema corre solo en local (Docker + `dotnet run` + `npm run dev`) y contra el único proyecto Supabase remoto. No hay CORS de producción, ni pipeline de deploy, ni definición de dónde/cómo se hostea la API en Azure.

## Estado

| # | Item | Estado | Notas |
|---|---|---|---|
| 1 | CORS de producción en la API | Hecho (2026-09-06) | Policy `FrontendProduction` con origen desde `Cors:ProductionOrigin` (`https://stc-web-six.vercel.app`), separado del policy de dev |
| 2 | `ForwardedHeadersMiddleware` para HTTPS detrás del proxy de Azure | Hecho (2026-09-06) | `UseForwardedHeaders` con `KnownIPNetworks`/`KnownProxies` limpios, antes de `UseHttpsRedirection()` |
| 3 | Definir mecanismo de secrets en Azure | Pendiente, bloqueante | `ConnectionStrings:StcDatabase` y `Supabase:Jwt:Issuer` solo existen hoy en `dotnet user-secrets` (local) |
| 4 | Confirmar runtime .NET 10 en el plan de Azure elegido | Pendiente, bloqueante | Definir App Service (stack nativo) vs. contenedor (no hay `Dockerfile` en el repo todavía) |
| 5 | Pipeline de deploy a Azure | Pendiente, bloqueante | CI actual (`.github/workflows/ci.yml`) solo testea/buildea, no publica nada |
| 6 | Deploy del frontend en Vercel + variables de entorno | Pendiente, bloqueante | Conectar el repo, configurar `VITE_API_URL`/`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en el proyecto de Vercel |
| 7 | `vercel.json` con rewrite SPA | Pendiente, a confirmar | Sin esto, refrescar una ruta de `react-router-dom` (ej. `/panel-admin/clientes/123`) puede dar 404 |
| 8 | Health check endpoint en la API | Pendiente, recomendado | Útil para el health probe de Azure App Service |
| 9 | Observabilidad en Azure (Application Insights o logging nativo) | Pendiente, recomendado | Hoy solo hay `log_errores` en Postgres, nada del lado de Azure |
| 10 | Elegir región de Azure cercana a la de Supabase | Pendiente, recomendado | Mitiga la latencia de red documentada en [00-fortalecimiento.md #12](00-fortalecimiento.md) |
| 11 | Evaluar ambiente de staging antes de operar con datos reales | Pendiente, a evaluar | Ya trackeado en [00-fortalecimiento.md #9](00-fortalecimiento.md) — sube de prioridad al salir a producción |
| 12 | Verificación end-to-end post-deploy | Pendiente | Login, `POST /leads` público, flujo cliente→sitio→unidad→ocupante→activo, contra los dominios reales |

## Detalle

### 1. CORS de producción en la API — Hecho (2026-09-06)
Agregado el policy `FrontendProduction` en [Program.cs](../../api/src/Stc.Api/Program.cs), separado del policy de dev (`FrontendDev`). El origen sale de `Cors:ProductionOrigin` en [appsettings.json](../../api/src/Stc.Api/appsettings.json) (no es secreto, mismo criterio que `Supabase:Jwt:Issuer` — commiteado, pisable por env var `Cors__ProductionOrigin` en Azure si el dominio cambia). Valor actual: `https://stc-web-six.vercel.app`. Se aplica el policy de dev solo en `Development` y el de producción en cualquier otro ambiente — sin tocar el comportamiento existente.

Pendiente cuando se confirme el dominio final de Vercel (el actual devuelve 404 porque todavía no hay deploy, ver ítem 6): actualizar `Cors:ProductionOrigin` si cambia, o agregar un segundo origen si se quiere permitir también los preview deployments de Vercel.

### 2. `ForwardedHeadersMiddleware` — Hecho (2026-09-06)
Agregado `app.UseForwardedHeaders(...)` en [Program.cs](../../api/src/Stc.Api/Program.cs), antes de `UseHttpsRedirection()`. Usa `ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto` con `KnownIPNetworks`/`KnownProxies` vacíos (`.Clear()`) — el proxy de Azure App Service no es una IP fija conocida de antemano, así que se acepta el header reenviado sin restringir por red de origen (razonable porque la app ya está detrás del edge de Azure, no expuesta directo a internet). Nota: en .NET 10 la propiedad se llama `KnownIPNetworks` (`KnownNetworks` quedó obsoleta, warning `ASPDEPR005`).

Verificado: `dotnet build` sin warnings y los 47 tests de `Stc.Api.Tests` (incluye `WebApplicationFactory` contra Postgres real vía Testcontainers) siguen pasando sin cambios.

### 3. Secrets en Azure — Pendiente, bloqueante
Decidir entre Application Settings del App Service (más simple, suficiente para este volumen) o Key Vault (más robusto, más setup). Cualquiera sea la opción, cargar ahí `ConnectionStrings:StcDatabase` (pooler de Supabase en modo sesión, ver [02-Backend-API.md](../arquitectura/02-Backend-API.md)) y `Supabase:Jwt:Issuer`. No debería hacer falta un `appsettings.Production.json` commiteado si todo llega por variables de entorno/Application Settings.

### 4. Runtime .NET 10 en Azure — Pendiente, bloqueante
Confirmar en el portal de Azure (o `az webapp list-runtimes`) que el plan elegido soporta `.NET 10` como stack nativo. Si no, evaluar armar un `Dockerfile` para deploy como contenedor (no existe ninguno en el repo hoy).

### 5. Pipeline de deploy a Azure — Pendiente, bloqueante
Agregar un job nuevo (o un workflow separado) que publique el build de `Stc.Api` a Azure — vía `azure/webapps-deploy` action con un publish profile, o configurando el Deployment Center nativo del App Service apuntando a la rama `main`. Definir si corre en cada push a `main` o requiere aprobación manual.

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
