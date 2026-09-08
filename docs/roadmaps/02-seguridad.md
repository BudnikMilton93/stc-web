# Roadmap de seguridad

Este documento registra puntos débiles conocidos del flujo de autenticación/autorización y el plan para resolverlos, con foco educativo: cada ítem explica *por qué* es un punto débil, no solo qué cambiar. No es una auditoría exhaustiva ni un requisito para operar — es proporcional a un CRM interno de un solo usuario admin (ver `CLAUDE.md`). Para la deuda técnica general (no específica de seguridad), ver [00-fortalecimiento.md](00-fortalecimiento.md).

Contexto: originado en una revisión conversacional del flujo REST + Bearer JWT + JWKS (`api/src/Stc.Api/Program.cs`, `Auth/CurrentUserEnrichmentMiddleware.cs`, `frontend/src/lib/supabase.ts`, `frontend/src/context/AuthContext.jsx`) más una revisión puntual de `supabase/config.toml` (2026-09-08).

## Estado

| # | Item | Estado | Prioridad |
|---|---|---|---|
| 1 | Sesión (access + refresh token) en `localStorage`, expuesta a robo vía XSS | Pendiente, a evaluar | Alta |
| 2 | `enable_signup = true` en Supabase Auth — cualquiera puede autoregistrarse | Pendiente | Media |
| 3 | Password mínima de 6 caracteres, sin requisito de complejidad | Pendiente | Media |
| 4 | Sin CAPTCHA en login/signup | Pendiente, a evaluar | Baja |
| 5 | No hay confirmación de que la config de `auth` en `config.toml` esté replicada en el proyecto remoto | Pendiente | Media |
| 6 | Un solo claim (`activo`) autoriza CRUD completo, sin defensa en profundidad | Documentado, aceptado | — |
| 7 | `scan-dependencies`/`scan-for-secrets` no están automatizados en CI | Pendiente, a evaluar | Baja |

## Detalle

### 1. Sesión en `localStorage` — Pendiente, a evaluar
`frontend/src/lib/supabase.ts` crea el cliente de Supabase con la config por defecto (`persistSession: true`), que guarda `access_token` y `refresh_token` en `localStorage`. A diferencia de una cookie `httpOnly`, cualquier script que corra en la página — una dependencia de npm comprometida, un XSS futuro — puede leer `localStorage` con `document`/`window` normal y llevarse ambos tokens. El `refresh_token` es el más grave: con él, un atacante puede seguir generando `access_token` nuevos indefinidamente, no solo usar la sesión activa hasta que expire.

Por qué queda "a evaluar" y no como fix directo: la alternativa (cookies `httpOnly` + `SameSite`) requiere que la API en C# emita/lea la cookie en vez de que el frontend arme el header `Authorization` a mano, lo cual toca `apiClient.js`, `AuthContext.jsx` y la config de CORS/cookies en `Program.cs` — no es un cambio aislado. Antes de decidir, vale la pena preguntarse: ¿cuál es la superficie real de XSS en este proyecto? React ya escapa JSX por default, no hay `dangerouslySetInnerHTML` conocido, y las dependencias con vulnerabilidades ya se resolvieron (`00-fortalecimiento.md`, ítem 3). Si esa superficie sigue siendo chica, mitigar con auditorías de dependencias periódicas (ítem 7 de este documento) puede ser más proporcional que migrar el modelo de sesión entero.

**Aprendizaje clave**: esto es el trade-off clásico "Bearer + SPA" vs. "cookie httpOnly + SPA". El primero es más simple de armar (no hay que pensar en CSRF, funciona cross-origin sin fricción) pero el precio es que el token es legible por JavaScript. El segundo elimina el robo-vía-XSS pero abre la puerta a CSRF y complica un poco más el manejo cross-origin. No hay opción "gratis".

### 2. `enable_signup = true` — Pendiente
`supabase/config.toml:176` tiene `enable_signup = true`: cualquiera que conozca la URL pública de Supabase Auth de este proyecto puede crear una cuenta nueva vía `signInWithPassword`/`signUp`. No es un agujero de autorización — `CurrentUserEnrichmentMiddleware.cs` sigue rechazando a cualquiera que no esté en la tabla `usuarios` con `activo = true`, así que un self-signup no le da acceso a datos de negocio. Pero sí es superficie innecesaria para un sistema que es, por diseño, de un solo usuario admin sin alta pública: cada cuenta que Supabase permite crear es un dato personal (email) que termina viviendo en tu proyecto sin que lo hayas invitado vos, y un JWT válido y bien firmado — solo que sin el claim `activo` — sigue siendo un JWT válido que atraviesa toda la capa de autenticación (`ValidateIssuer`/`ValidateAudience`/`ValidateIssuerSigningKey`) antes de ser rechazado por la policy de autorización.

Solución propuesta: `enable_signup = false` en `config.toml`, y dar de alta el único usuario admin manualmente (dashboard de Supabase o `supabase auth admin`). Confirmar además si el proyecto remoto ya tiene esto deshabilitado independientemente de este archivo (ver ítem 5).

### 3. Password débil por defecto — Pendiente
`supabase/config.toml:182-185`: `minimum_password_length = 6` y `password_requirements = ""` (sin exigir mayúsculas/números/símbolos). Para un sistema con una sola cuenta que tiene acceso total a datos de clientes, una password de 6 caracteres sin complejidad es baja fricción para un atacante que ya tiene el email (que en un proyecto chico no es difícil de inferir o conseguir).

Solución propuesta: subir `minimum_password_length` a 12+ y `password_requirements = "lower_upper_letters_digits"` como mínimo. Es un cambio de una línea en `config.toml`, sin impacto en código — el único costo es tener que resetear la password actual del usuario admin si no cumple el nuevo mínimo.

### 4. Sin CAPTCHA — Pendiente, a evaluar
`[auth.captcha]` está comentado en `config.toml`. La única barrera contra fuerza bruta sobre el login es el rate limit nativo de Supabase (`sign_in_sign_ups = 30` intentos cada 5 minutos por IP, ver ítem 5 de este documento) — no hay nada que distinga un humano de un script más allá de ese conteo.

Por qué queda "a evaluar": agregar CAPTCHA (hCaptcha o Turnstile) requiere una key de un proveedor externo y tocar el formulario de login en el frontend — es fricción real para un sistema donde el único que hace login sos vos. Con `sign_in_sign_ups = 30/5min` y una password fuerte (ítem 3), la ventana de ataque práctica ya es chica. Vale la pena revisar si el rate limit remoto (ítem 5) efectivamente está activo antes de invertir en CAPTCHA.

### 5. Config local vs. remoto sin confirmar — Pendiente
Todo lo revisado en los ítems 2-4 sale de `supabase/config.toml`, que es la fuente de verdad para `supabase start` (Postgres local). No hay evidencia en este repo de que esos mismos valores (`enable_signup`, `password_requirements`, `auth.rate_limit`) estén efectivamente aplicados en el proyecto remoto de Supabase — eso depende de si se corrió `supabase config push` después de definir estos valores, o si se configuraron a mano en el dashboard. `docs/arquitectura/04-Migraciones.md` documenta el flujo de migraciones de schema (`supabase db push`) pero no menciona sincronización de configuración de Auth.

Solución propuesta: entrar al dashboard de Supabase del proyecto remoto (Authentication → Policies/Settings) y confirmar a mano que `enable_signup`, `minimum_password_length`/`password_requirements` y los límites de `auth.rate_limit` coinciden con lo que se decida en `config.toml`. Si no coinciden, correr `supabase config push` (revisando antes qué más sincroniza ese comando, para no pisar configuración remota que no está en este archivo) o alinear manualmente. Documentar el resultado acá una vez confirmado.

### 6. Un solo claim de autorización (`activo`) — Documentado, aceptado
`Auth/CurrentUserEnrichmentMiddleware.cs` + la policy `Activo` en `Program.cs` son la única barrera de autorización: cualquier usuario `activo=true` tiene CRUD completo sobre clientes, sitios, unidades, ocupantes y activos, sin distinción de rol (decisión de diseño documentada en `supabase/migrations/20260901000000_usuario_unico_sin_roles.sql`). No hay "defensa en profundidad" más allá de esa policy — si la única cuenta se compromete (por ejemplo vía el ítem 1), el atacante tiene acceso total sin ningún control intermedio.

No se marca como acción pendiente porque es una decisión consciente y proporcional al tamaño real del sistema (un solo admin, sin necesidad real de roles todavía). Queda documentado acá para que quede explícito el motivo por el cual los ítems 1-5 de este documento importan más de lo que importarían en un sistema con roles: acá, comprometer una sola cuenta es comprometer todo.

### 7. Scanning de dependencias y secretos fuera de CI — Pendiente, a evaluar
`00-fortalecimiento.md` (ítem 2) ya documenta que `scan-dependencies`/`scan-for-secrets` quedaron deliberadamente fuera de `.github/workflows/ci.yml` cuando se armó el pipeline, para no arrancar con un gate roto por vulnerabilidades preexistentes (ya resueltas con `npm audit fix`). Con esas vulnerabilidades resueltas, agregar ambos gates al CI ya no debería romper el pipeline de entrada, y es la forma de que la mitigación mencionada en el ítem 1 (auditar dependencias) pase de ser una revisión manual ocasional a algo que corre solo en cada PR.

Solución propuesta: agregar `scan-dependencies` y `scan-for-secrets` como steps del job `frontend` (y `scan-dependencies` también para NuGet en el job `api`) en `.github/workflows/ci.yml`, usando las skills ya existentes en el repo (`.claude/skills/scan-dependencies`, `.claude/skills/scan-for-secrets`) como referencia de qué herramienta/comando usan.
