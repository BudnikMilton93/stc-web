# 04 - Migraciones de base de datos

Este documento describe el flujo seguro para llevar un cambio de schema desde una migración nueva en `supabase/migrations/` hasta aplicarlo en el proyecto Supabase remoto (hoy la única base que existe, y la que eventualmente sirve datos reales de producción). Para el origen del schema y las migraciones existentes, ver [00-Contexto-Proyecto.md](00-Contexto-Proyecto.md). Para cómo la API en C# se conecta a esa base, ver [02-Backend-API.md](02-Backend-API.md). Para el paso a paso de cómo switchear la API entre el Docker local y el remoto (y qué implica trabajar en cada uno), ver [05-Ambientes.md](05-Ambientes.md).

## Contexto: no hay ambiente de staging

Hoy existe **un solo proyecto Supabase** para este sistema. No hay un ambiente intermedio (staging) entre "local en Docker" y "el remoto real". Esto significa que **toda migración que se aplica en remoto se aplica directo sobre la base que eventualmente tiene (o ya tiene) datos reales de clientes** — no hay red de seguridad institucional más allá de la disciplina de este flujo. Ver [../roadmaps/00-fortalecimiento.md](../roadmaps/00-fortalecimiento.md) para el ítem de deuda relacionado.

## Flujo estándar

### 1. Escribir la migración

Migración nueva en `supabase/migrations/<timestamp>_<descripcion>.sql`. Nunca editar una migración ya aplicada (ni en local ni en remoto) — si hace falta corregir algo, es una migración nueva.

### 2. Validar en local (Docker)

```bash
supabase start          # si no está corriendo ya
supabase db reset       # recrea la base local desde cero y aplica TODAS las migraciones + seed
```

Esto corre contra el Postgres del contenedor de Docker que levanta `supabase start` — nunca toca el proyecto remoto. Si `db reset` falla, la migración tiene un error de sintaxis o de datos (por ejemplo, un `CHECK` que el propio `seed.sql` no cumple) — se arregla ahí, antes de seguir.

`dotnet test` (desde `api/`) usa una base **todavía más aislada**: Testcontainers levanta un Postgres efímero por corrida, le aplica las migraciones, corre los tests, y lo destruye — tampoco toca ni el Docker de `supabase start` ni el remoto. Correrlo después de `db reset` da una segunda confirmación de que la migración es válida.

### 3. Regenerar tipos de TypeScript (contra local)

```bash
supabase gen types typescript --local > frontend/src/types/database.types.ts
```

### 4. Antes de tocar el remoto: revisar si la migración es destructiva

Antes de aplicar nada en remoto, revisar el SQL de la migración buscando específicamente:

- `drop table`, `drop column`, `drop type` — pérdida de datos si esa tabla/columna/tipo tenía filas.
- `alter type ... using ...` que castea a un enum con **menos valores** que el original (patrón usado en `20260827140000_narrow_service_scope.sql` para "eliminar" valores de un enum, algo que Postgres no soporta directamente) — si hay filas reales usando el valor que se quita, el cast falla y la migración no aplica (falla en una transacción, no corrompe nada, pero hay que arreglarlo antes).
- `alter column ... set not null` sin un `default` — falla si ya hay filas con `null` en esa columna.
- Cualquier `add constraint ... check (...)` — confirmar que los datos existentes en remoto cumplen la regla antes de aplicarla.

Si la migración toca alguno de estos casos, chequear los datos reales en remoto primero (SQL Editor del dashboard de Supabase, con una query de solo lectura tipo `select count(*) from tabla where columna = 'valor_a_eliminar'`) antes de aplicar. Si hay datos que no cumplen, hay que decidir cómo migrarlos (o ajustar la migración) antes de tocar remoto.

### 5. (Recomendado) Backup antes de aplicar en remoto

Dashboard de Supabase → Database → Backups → backup manual, o:

```bash
supabase db dump --linked -f backup_pre_migracion.sql
```

### 6. Vincular el proyecto remoto correcto

```bash
supabase link --project-ref <project-ref>
```

Con una cuenta de Supabase que tenga más de un proyecto (por ejemplo, si se gestionan varios clientes desde la misma cuenta), confirmar el `project-ref` correcto con `supabase projects list` antes de vincular — vincular el proyecto equivocado y hacer push ahí sería aplicar cambios de schema a una base que no corresponde.

### 7. Comparar qué está aplicado en remoto antes de aplicar nada

```bash
supabase migration list
```

Es de solo lectura: compara, por timestamp, qué migraciones existen en `supabase/migrations/` contra cuáles ya corrieron en el proyecto remoto vinculado. Sirve para confirmar exactamente qué falta aplicar, sin asumir nada de memoria.

### 8. Aplicar

```bash
supabase db push
```

Muestra la lista de migraciones pendientes y pide confirmación antes de aplicarlas. Revisar esa lista contra lo que se espera antes de confirmar.

### 9. Verificar y regenerar tipos contra remoto

```bash
supabase migration list                                              # confirmar que local y remote coinciden en las 6+ filas
supabase gen types typescript --linked > frontend/src/types/database.types.ts
```

### 10. Reiniciar la API — gotcha de Npgsql con enums nativos

**Si la API (`dotnet run`) ya estaba corriendo mientras se aplicó la migración en remoto, hay que reiniciarla.** Npgsql arma el catálogo de tipos de los enums nativos de Postgres (`MapEnum`, ver [02-Backend-API.md](02-Backend-API.md)) una sola vez, al construir el `NpgsqlDataSource` en el arranque del proceso. Si la migración agrega valores a un enum (`ALTER TYPE ... ADD VALUE`) después de que el proceso ya arrancó, las conexiones existentes en el pool siguen con el catálogo viejo, y cualquier lectura de una fila con ese enum tira:

```
System.InvalidCastException: Reading as 'Stc.Domain.Enums.TipoActivo' is not supported for fields having DataTypeName '-.-'
```

La solución es simplemente reiniciar el proceso de la API (`Ctrl+C` y `dotnet run` de nuevo) — al reconectarse desde cero, relee el catálogo de tipos actualizado. Este error se vio en la práctica al aplicar `20260903120000_equipamiento_sitio.sql` (agrega los valores `llavero`/`control_acceso` a `tipo_activo`) en remoto con la API ya corriendo.

### 11. Smoke test

Probar en la app real (contra remoto) el flujo que ejercita lo que cambió la migración, no solo confiar en que "no tiró error al aplicar". Si el cambio afecta un flujo cubierto por el E2E de Playwright (`frontend/e2e/`), correrlo apunta a confirmar la ruta crítica completa.

## Checklist resumido

- [ ] Migración nueva, nunca editar una ya aplicada.
- [ ] `supabase db reset` local — OK.
- [ ] `dotnet test` (Testcontainers) — OK.
- [ ] `supabase gen types typescript --local` — regenerado.
- [ ] Revisión manual: ¿la migración tiene algo destructivo (drop, narrow de enum, `not null` nuevo, `check` nuevo)? Si sí, chequear datos reales en remoto antes de seguir.
- [ ] Backup de remoto (recomendado, obligatorio si hay algo destructivo).
- [ ] `supabase link --project-ref <el correcto>` — confirmado con `supabase projects list` si hay dudas.
- [ ] `supabase migration list` — confirmar qué falta antes de aplicar.
- [ ] `supabase db push` — revisar la lista antes de confirmar.
- [ ] `supabase migration list` de nuevo — local y remote coinciden.
- [ ] `supabase gen types typescript --linked` — regenerado contra remoto.
- [ ] Reiniciar la API si ya estaba corriendo.
- [ ] Smoke test del flujo afectado contra remoto.
