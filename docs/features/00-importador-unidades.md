# Feature: importador masivo de unidades desde Excel

Este documento trackea el desarrollo de una feature nueva — a diferencia de `docs/roadmaps/`, que registra deuda técnica y trabajo transversal (ver [00-fortalecimiento.md](../roadmaps/00-fortalecimiento.md) y [02-seguridad.md](../roadmaps/02-seguridad.md)). Se originó de un discovery hecho el 2026-09-17/18 sobre la necesidad de cargar al CRM las planillas Excel que el dueño del negocio recibe por edificio/consorcio (unidades, ocupantes y magnetos mezclados en columnas), sin depender de un script nuevo escrito a mano por cada edificio.

Contexto completo del requerimiento (usuario, problema, flujo esperado, reglas de negocio) resuelto en el discovery — no se repite acá, este documento trackea únicamente la ejecución. Documentación de arquitectura relacionada: [02-Backend-API.md](../arquitectura/02-Backend-API.md), [04-Migraciones.md](../arquitectura/04-Migraciones.md).

## Alcance de esta v1 (resumen)

- Formato de entrada fijo (siempre la misma estructura de columnas) — sin mapeo configurable.
- Alta incremental pura: nunca actualiza ni pisa datos ya cargados, solo agrega lo nuevo.
- Vista previa completa y editable antes de confirmar la inserción — único mecanismo de resolución de ambigüedades.
- El pago se registra por magneto entregado (STC le cobra directo al ocupante, no a la administración), como dato simple en `activos` — sin gestión de cobros.
- Filas administrativas de la planilla (ADM, LIMPIEZA, contacto de administración) quedan fuera: se siguen cargando a mano, el usuario las borra de la planilla antes de subirla.
- Inserta solo vía los endpoints REST ya existentes — nunca escribe directo a la base.

## Estado

| # | Item | Estado | Notas |
|---|---|---|---|
| 1 | Migración: `unidades` — separar `identificador` y `piso` | Pendiente | Hoy conviven en un string libre tipo "1RO A" |
| 2 | Migración: `ocupantes` — enum `rol_ocupante` reemplazando `es_titular` | Pendiente | Habilita cargar propietario e inquilino como dos filas de una misma unidad |
| 3 | Migración: `activos` — agregar `monto` + `modalidad` | Pendiente | Pago por magneto entregado, dato simple sin lógica de negocio |
| 4 | Migración: `activos` — constraint `unique(numero_serie)` | Pendiente | Requerido por la regla de deduplicación del importador (ítem 8), no es una mejora aparte |
| 5 | Actualizar `Configurations/` (Fluent API) y endpoints de `unidades`/`ocupantes`/`activos` en la API | Pendiente | Reflejar los campos nuevos de los ítems 1-3 |
| 6 | Regenerar `frontend/src/types/database.types.ts` | Pendiente | Después de aplicar la migración en local |
| 7 | Diseño técnico del importador (parseo, dedupe, vista previa) | Pendiente | No decidido todavía si CLI, script o pantalla en el panel admin |
| 8 | Implementación del importador | Pendiente | Depende de 1-7 |
| 9 | Cargar el primer edificio real (el de este discovery) como caso de prueba | Pendiente | Validación end-to-end de la feature completa |

## Detalle

### 1-4. Migraciones de schema — Pendiente
Una migración nueva en `supabase/migrations/` (`<timestamp>_importador_unidades.sql`), validada en local con `supabase db reset` antes de aplicar en remoto, siguiendo el flujo de [04-Migraciones.md](../arquitectura/04-Migraciones.md). Incluye:
- `unidades`: agregar manejo explícito de `identificador`/`piso` como dos campos independientes (ya existen ambas columnas en el schema actual — lo que falta es que el importador los llene por separado, no un cambio de columnas en sí).
- `ocupantes`: `create type rol_ocupante as enum (...)`, migrar `es_titular` a `rol` (default `'propietario'` para preservar compatibilidad con datos ya cargados), eliminar `es_titular`.
- `activos`: `monto numeric`, `modalidad text` (nullable, dato informativo).
- `activos`: `alter table activos add constraint activos_numero_serie_key unique (numero_serie)` — confirmar antes que no haya duplicados existentes en datos reales, o la migración falla.

### 5. Configurations + endpoints — Pendiente
Actualizar las configuraciones Fluent API en `api/src/Stc.Infrastructure/Configurations/` para los campos nuevos, y los endpoints en `api/src/Stc.Api/Endpoints/UnidadesEndpoints.cs`/`OcupantesEndpoints.cs`/`ActivosEndpoints.cs` (nombres a confirmar contra el código real) para aceptarlos y devolverlos, siguiendo el patrón de `ClientesEndpoints.cs`.

### 6. Regenerar tipos del frontend — Pendiente
`supabase gen types typescript --local > frontend/src/types/database.types.ts`, después de aplicar la migración en local.

### 7. Diseño técnico del importador — Pendiente
A definir en la fase de implementación: dónde vive (CLI/script que corre el developer por ahora, con la mira puesta en integrarlo al panel admin más adelante para que lo use el dueño del negocio sin intervención técnica), cómo se presenta la vista previa editable, y el detalle de parseo (separación de piso/identificador, explosión de la celda `IDs` en filas de `activos`, separación de teléfono por "/", normalización de "FALTAN DATOS" a `NULL`).

### 8. Implementación — Pendiente
Depende de que 1-7 estén resueltos.

### 9. Carga del primer edificio real — Pendiente
Usar la planilla ya compartida en el discovery como caso de prueba de punta a punta, con las 3 filas administrativas (ADM, LIMPIEZA, CAROLINA) removidas a mano antes de subirla.

## Fuera de alcance de esta v1 (no trackeado acá como pendiente)

- Exclusión automática de filas administrativas — se sigue haciendo a mano.
- Gestión de cobros real (periodicidad, estados de pago, historial) — si el negocio lo termina necesitando, es un dominio nuevo con su propio discovery, no una extensión de este importador.
- Upsert/actualización de datos ya cargados — el importador es alta pura.

## Cómo usar este documento

- Al arrancar un item, pasarlo a "En progreso" y anotar la fecha.
- Al cerrarlo, pasarlo a "Hecho", con el commit que lo resolvió.
- Si aparece un bloqueante nuevo en el camino, agregar una fila en la tabla y su detalle abajo.
