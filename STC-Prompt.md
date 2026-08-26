# Prompt para agente (VS Code / Claude Code)

Copiá y pegá todo el bloque de abajo como instrucción inicial para el agente.

---

## Contexto del proyecto

Estoy construyendo un sistema de gestión interna (CRM técnico) para un negocio que
ofrece instalación de cámaras de seguridad, porteros eléctricos, cerraduras
magnéticas, y reparación de equipos informáticos (PC, impresoras, formateos),
además de venta de insumos. El proyecto es React en el frontend, con Supabase
como base de datos/backend (Postgres) y Edge Functions como capa de API.

El sistema es de **uso interno**: solo lo usan el dueño y sus técnicos, no hay
clientes externos con acceso al panel por ahora.

## Objetivo de esta tarea

Configurar la estructura de base de datos en Supabase usando **migraciones
versionadas con el Supabase CLI**, no pegando SQL directo en el dashboard.
Quiero que todo el esquema quede en el repo, versionado, y reproducible.

## Archivos que te adjunto

Te paso dos archivos SQL ya diseñados que tenés que usar tal cual (no los
reescribas ni cambies el modelo de datos salvo que encuentres un error real
de sintaxis):

1. `schema.sql` — define todas las tablas: clientes, contactos_cliente,
   sitios, unidades, ocupantes, activos, ordenes_trabajo, orden_items,
   insumos, movimientos_stock, usuarios, leads, adjuntos. Incluye enums,
   índices y triggers de `updated_at`.
2. `rls_policies.sql` — políticas de Row Level Security para todas las
   tablas (uso interno: staff autenticado con CRUD completo salvo delete,
   que es solo para admin; excepción especial en `leads` que permite
   insert público sin sesión).

## Pasos que necesito que hagas

1. Verificá si el proyecto ya tiene Supabase CLI inicializado (carpeta
   `supabase/` en la raíz). Si no existe, corré `supabase init`.

2. Dentro de `supabase/migrations/`, creá dos migraciones en orden,
   respetando el formato de nombre `<timestamp>_<descripcion>.sql` que
   requiere el CLI:
   - Primera migración: contenido de `schema.sql`
   - Segunda migración: contenido de `rls_policies.sql`
   (deben quedar en archivos separados y en ese orden, porque RLS depende
   de que las tablas ya existan)

3. Preguntame si ya tengo un proyecto de Supabase creado en la nube o si
   hay que crear uno nuevo. Si ya existe, ayudame a correr
   `supabase link --project-ref <ref>` (yo te paso el project-ref cuando
   me lo pidas, no lo inventes).

4. Antes de aplicar nada en remoto, corré las migraciones en local con
   `supabase start` + `supabase db reset` para validar que el SQL corre
   sin errores contra un Postgres local.

5. Una vez validado en local, aplicá las migraciones al proyecto remoto
   con `supabase db push`. Mostrame el resultado antes de continuar.

6. Generá los tipos de TypeScript para el frontend con
   `supabase gen types typescript --linked > src/types/database.types.ts`
   (ajustá la ruta si mi estructura de carpetas es distinta — revisá el
   proyecto antes de asumir la ruta).

7. Al final, hacé un resumen de:
   - Qué tablas quedaron creadas
   - Qué políticas de RLS quedaron activas por tabla
   - Cualquier warning o error que haya tirado el CLI en el proceso

## Restricciones importantes

- No modifiques el modelo de datos (nombres de tablas, columnas, relaciones)
  sin preguntarme primero — está diseñado y acordado, esta tarea es solo
  de implementación/infraestructura.
- No uses el SQL Editor del dashboard de Supabase para nada de esto, todo
  vía CLI y migraciones.
- Si algo en el SQL no corre por versión de Postgres/Supabase, decime
  específicamente qué línea falla y por qué antes de cambiarla.
- No commitees ni expongas ninguna key (anon key, service_role key,
  project-ref) en el código o en archivos versionados — deben ir en
  variables de entorno (`.env`, ya en `.gitignore`).
