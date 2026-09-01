# Roadmap de fortalecimiento

Este documento registra la deuda conocida y el plan para resolverla, **no** funcionalidades nuevas del negocio. Es el lugar para ir tachando lo que se resuelve y anotar lo que se descubre en el camino. Para cómo está armado el sistema hoy, ver [docs/arquitectura/](arquitectura/00-Contexto-Proyecto.md).

Contexto: el frontend terminó de migrar de Supabase directo a la API en C# (agosto 2026). Con la migración cerrada, el objetivo de esta etapa no es escalar funcionalidad sino asegurar que la base aguante antes de operar con datos reales de clientes.

## Estado

| # | Item | Estado | Notas |
|---|---|---|---|
| 1 | Tests de la API (xUnit + `WebApplicationFactory`) | Pendiente | Prioridad más alta — ahí vive la autorización que reemplazó RLS |
| 2 | CI básico (build + lint en cada push/PR) | Pendiente | Requisito para que los tests del punto 1 se sostengan |
| 3 | Revisión de seguridad | Pendiente | Incluye CORS de producción sin definir y repaso de policies RLS como defensa en profundidad |
| 4 | Tests de frontend (Vitest + Testing Library) | Pendiente | Después de la API |
| 5 | E2E de flujos críticos (Playwright) | Pendiente | Login → cliente → sitio → unidad → activo |
| 6 | Endpoints `orden_items` y `adjuntos` | Pendiente, sin urgencia | Sub-recursos; esperar a que el frontend los necesite (ordenes/usuarios siguen siendo placeholders) |

## Detalle

### 1. Tests de la API
Sin cobertura hoy. En cuanto el sistema opere con datos reales de clientes, un cambio sin querer en la policy de autorización (`Activo`, la única que queda tras colapsar el esquema staff/admin en `20260901000000_usuario_unico_sin_roles.sql`) no lo detecta nadie hasta que alguien ve datos que no debería. Empezar por los endpoints que consumían esa autorización más de cerca (`OrdenesEndpoints.cs`, `UsuariosEndpoints.cs`).

### 2. CI/CD
No existe `.github/workflows` todavía. Sin esto, tests que nadie corre en cada PR se pudren rápido — es lo que hace que el punto 1 valga la pena a mediano plazo. Alcance inicial: build de `api/` y `frontend/`, lint del frontend (`npm run lint`), y correr los tests de la API en cuanto existan.

### 3. Revisión de seguridad
Ya anotada como pendiente en `docs/arquitectura/02-Backend-API.md`. Dos puntos concretos detectados:
- **CORS de producción sin definir**: `api/src/Stc.Api/Program.cs` solo habilita el origen de Vite en desarrollo (`FrontendDevCorsPolicy`, líneas ~68-79); no hay policy para producción.
- **RLS como defensa en profundidad**: repasar si las policies de `supabase/migrations/20260724195456_rls_policies.sql` siguen siendo una segunda línea razonable ahora que la autorización primaria vive en la API.

### 4-5. Tests de frontend y E2E
Sin cobertura. Frontend después de la API (menor blast radius si falla). E2E acotado a los flujos críticos de instalación, no como reemplazo de cobertura unitaria.

### 6. Endpoints faltantes
`orden_items` y `adjuntos` son las únicas tablas del schema sin endpoint propio. No es urgente: `src/features/ordenes` del frontend sigue siendo un placeholder sin CRUD funcional, así que no hay consumidor todavía (`src/features/usuarios` se eliminó al simplificar el sistema a un solo usuario admin, sin roles).

## Cómo usar este documento

- Al arrancar un item, pasarlo a "En progreso" y anotar la fecha.
- Al cerrarlo, pasarlo a "Hecho", con el commit o PR que lo resolvió.
- Si aparece deuda nueva en el camino (no una feature — deuda), agregar una fila en la tabla y su detalle abajo.
