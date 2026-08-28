# 01 - Estructura del proyecto

Este documento resume cómo está organizado el frontend de STC React Web hasta esta etapa y qué responsabilidad cumple cada módulo principal.

## Panorama general

El proyecto está dividido en una capa de entrada, una capa de layout y un conjunto de features por dominio. La aplicación corre con React + Vite, usa React Router para navegación, consume la API propia en C# ([02-Backend-API.md](02-Backend-API.md)) para datos de negocio, y usa Supabase Auth directo solo para login/sesión.

La estructura actual prioriza:

- Autenticación interna para staff
- Pantallas CRUD encadenadas para clientes y sus entidades relacionadas
- Una vista global de activos con filtros
- Estilos centralizados en un único archivo base

## Estructura principal

### `src/main.jsx`
Punto de entrada de React. Monta:

- `BrowserRouter`
- `AuthProvider`
- `App`

### `src/App.tsx`
Define las rutas de la aplicación.

Rutas principales:

- `/` -> home pública
- `/panel-admin/login` -> acceso interno
- `/panel-admin/clientes` -> listado de clientes
- `/panel-admin/clientes/:clienteId` -> detalle de cliente
- `/panel-admin/clientes/:clienteId/sitios/:sitioId` -> detalle de sitio
- `/panel-admin/clientes/:clienteId/sitios/:sitioId/unidades/:unidadId` -> detalle de unidad
- `/panel-admin/inventario` -> listado global de activos
- `/panel-admin/ordenes` -> módulo de órdenes
- `/panel-admin/usuarios` -> módulo de usuarios

La zona `/panel-admin` vive protegida por `ProtectedRoute` y, para usuarios admin, `AdminOnlyRoute`.

### `src/context/AuthContext.jsx`
Administra la sesión de Supabase Auth y el perfil interno de staff.

Responsabilidades:

- Cargar sesión actual (Supabase Auth, sin cambios)
- Validar si el usuario autenticado pertenece al staff activo, vía `GET /usuarios/me` en la API (no consulta la tabla `usuarios` directo)
- Exponer `signIn` y `logout`
- Resolver rol (`admin` o `tecnico`)
- Controlar estados de carga y error de autenticación

### `src/lib/supabase.ts`
Cliente tipado de Supabase. Se usa **únicamente para Supabase Auth** (login, sesión) — no para datos de negocio. Toma las variables de entorno:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### `src/lib/apiClient.js`
Cliente HTTP hacia la API en C# ([02-Backend-API.md](02-Backend-API.md)). Toma la URL base de `VITE_API_URL` (`.env`), adjunta automáticamente el JWT de la sesión activa de Supabase (`supabase.auth.getSession()`) como header `Authorization: Bearer`, y expone `get/post/put/patch/delete`. Los errores se exponen como `ApiError { status, body, message }`, con manejo genérico por ahora en cada pantalla.

### `src/types/database.types.ts`
Tipos generados o mantenidos a mano para el cliente Supabase.

Actualmente incluyen tablas y enums usados por la fase 2:

- `clientes`
- `sitios`
- `unidades`
- `ocupantes`
- `activos`
- `usuarios`
- enums como `tipo_cliente`, `tipo_sitio`, `tipo_activo`, `estado_activo`, `rol_usuario`

## Módulos funcionales

### `src/features/auth`
Pantalla de login interno.

- `pages/AdminLoginPage.jsx`

Se encarga de iniciar sesión para staff y redirigir al panel.

### `src/features/clientes`
Es el dominio más importante de la fase actual.

Archivos principales:

- `pages/ClientesPage.jsx`
- `pages/ClienteDetailPage.jsx`
- `pages/SitioDetailPage.jsx`
- `pages/UnidadDetailPage.jsx`
- `constants.js`

Qué hace cada uno:

- `ClientesPage.jsx`: listado, búsqueda por nombre, alta y edición de clientes
- `ClienteDetailPage.jsx`: detalle del cliente y gestión de sitios asociados
- `SitioDetailPage.jsx`: detalle del sitio y gestión de unidades
- `UnidadDetailPage.jsx`: detalle de unidad, ocupantes y activos
- `constants.js`: opciones de tipo de cliente

Relación de datos:

- Cliente -> Sitios
- Sitio -> Unidades
- Unidad -> Ocupantes
- Unidad -> Activos
- Activo -> Ocupante asignado

### `src/features/inventario`
Vista global de activos.

- `pages/InventarioPage.jsx`

Permite filtrar por:

- tipo de activo
- cliente
- sitio
- número de serie

### `src/features/ordenes`
Módulo reservado para órdenes de trabajo.

- `pages/OrdenesPage.jsx`

Por ahora está como placeholder y no forma parte del flujo CRUD de esta fase.

### `src/features/usuarios`
Módulo reservado para gestión de usuarios internos.

- `pages/UsuariosPage.jsx`

También está como placeholder en esta etapa.

## Componentes compartidos

### `src/components/layout/AuthenticatedLayout.jsx`
Shell principal del panel.

Incluye:

- sidebar de navegación
- encabezado con usuario logueado
- botón de logout
- `Outlet` para renderizar las pantallas internas

### `src/components/auth/ProtectedRoute.jsx`
Bloquea el acceso si no hay sesión válida de staff.

### `src/components/auth/AdminOnlyRoute.jsx`
Restringe pantallas que solo puede ver un admin.

## Estilos

### `src/index.css`
Contiene el sistema visual base de toda la app.

Incluye estilos para:

- home pública
- login
- layout autenticado
- tarjetas CRUD
- formularios
- listas y tablas
- autocomplete de ocupantes
- estados de baja lógica

## Backend asociado

> Esta sección describe el schema/RLS de Supabase, origen de la base de datos. El frontend ya no consulta estas tablas directo (salvo Auth) — consume la API en C# que reemplaza esa capa, ver [02-Backend-API.md](02-Backend-API.md). Mapa visual: [03-Diagrama.html](03-Diagrama.html).

### `supabase/migrations/20260724195455_schema.sql`
Define el esquema principal:

- clientes
- sitios
- unidades
- ocupantes
- activos
- ordenes de trabajo
- inventario
- leads
- adjuntos

### `supabase/migrations/20260724195456_rls_policies.sql`
Define RLS para lectura y escritura del staff y reglas especiales para leads.

### `supabase/migrations/20260724203439_fix_uuid_extension_schema.sql`
Corrige el esquema de la extensión `uuid-ossp` para compatibilidad remota.

### `supabase/seed.sql`
Archivo de datos de ejemplo para pruebas locales.

## Flujo funcional actual

El flujo principal que ya está armado es:

1. Iniciar sesión como staff
2. Entrar al panel admin
3. Crear o buscar un cliente
4. Entrar al cliente y crear un sitio
5. Entrar al sitio y crear una unidad
6. Entrar a la unidad y crear ocupantes
7. Asignar activos a un ocupante existente de esa unidad
8. Consultar el inventario global filtrando por tipo, cliente, sitio o serie

## Observación de estado actual

- El CRUD de clientes, sitios, unidades, ocupantes y activos ya está operativo y **consume la API en C#** (ver [02-Backend-API.md](02-Backend-API.md)), no Supabase directo.
- La baja lógica está resuelta en la UI actual (flag de texto en `notas`, salvo activos que usan un campo `estado` real).
- Las pantallas de órdenes y usuarios todavía están pendientes de implementación funcional (quedan para una próxima fase).
- Pendiente antes de operar con datos reales: tests automatizados (unit/integration de API y frontend, e2e con Playwright) y una revisión de seguridad — ver "Próximos pasos" en [02-Backend-API.md](02-Backend-API.md).
