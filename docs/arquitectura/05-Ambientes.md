# 05 - Trabajar en local (Docker) vs. contra el remoto

Este documento explica las dos bases contra las que puede correr la API en desarrollo — el Postgres local en Docker (`supabase start`) y el proyecto Supabase remoto — cómo levantar cada una, cómo switchear la API entre ellas, y qué implica trabajar en una u otra. Para el flujo de migraciones (que aplica a ambas), ver [04-Migraciones.md](04-Migraciones.md). Para cómo la API se conecta a la base, ver [02-Backend-API.md](02-Backend-API.md).

**Ninguna credencial real va en este documento** — donde hace falta un valor sensible (password, connection string completa) se deja un placeholder y se indica de dónde sacarlo.

## Las dos bases

| | Local (Docker) | Remoto (Supabase) |
|---|---|---|
| Dónde vive | Contenedor Postgres en tu máquina, levantado por `supabase start` | El proyecto Supabase de la cuenta (hoy uno solo, ver [00-Contexto-Proyecto.md](00-Contexto-Proyecto.md)) |
| Datos | Solo lo que carga `supabase/seed.sql` + lo que vos generes a mano probando | Los datos reales que se hayan cargado ahí (o, mientras no se opere en producción, datos de prueba manuales) |
| Costo de romper algo | Nulo — `supabase db reset` la recrea desde cero en segundos | Alto — es la única base que existe, potencialmente con datos reales |
| Uso recomendado | Desarrollo día a día, probar migraciones nuevas, correr tests | Verificar una vez que algo funciona en local, o trabajar con datos reales cuando corresponda |

Son bases **completamente independientes** aunque compartan el mismo schema (las mismas migraciones de `supabase/migrations/`). Cargar algo en una no aparece en la otra.

## Levantar el Docker local

```bash
supabase start
```

La primera vez (o si Docker no tenía las imágenes) tarda más porque descarga los contenedores; después es rápido. Al terminar, muestra algo así (los valores reales los imprime el propio comando, no son secretos de producción — son credenciales de desarrollo fijas y compartidas por todo el ecosistema Supabase local):

```
API_URL:      http://127.0.0.1:54321
DB_URL:       postgresql://postgres:postgres@127.0.0.1:54322/postgres
STUDIO_URL:   http://127.0.0.1:54323
...
```

- `DB_URL` es la conexión directa a Postgres — la que usa la API.
- `STUDIO_URL` abre una interfaz tipo dashboard de Supabase, pero apuntando a esta base local — útil para inspeccionar tablas sin escribir SQL a mano.

Para pararlo: `supabase stop`. Para recrearlo desde cero (reaplica todas las migraciones + seed): `supabase db reset`.

Podés confirmar que está corriendo con `supabase status` (falla con un error de "no such container" si no está levantado — en ese caso, `supabase start`).

## Switchear entre local y remoto (automatizado)

`scripts/switch-env.sh` cambia de una sola vez los dos switches que importan — `frontend/.env` (login) y `dotnet user-secrets` (API) — para no tener que acordarse de sincronizarlos a mano cada vez (ver más abajo el problema que resuelve esto).

```bash
scripts/switch-env.sh local     # apunta login + API al Docker local (levanta supabase start si hace falta)
scripts/switch-env.sh remote    # apunta login + API al proyecto remoto
```

**`remote` necesita `scripts/remote.env`**, un archivo con las credenciales del proyecto remoto que **no se commitea** (está en `.gitignore`). La primera vez que se corre `scripts/switch-env.sh remote`, el script lo crea con placeholders vacíos y sale pidiendo completarlo:

```
SUPABASE_URL=          # Project Settings > API
SUPABASE_ANON_KEY=     # Project Settings > API
DB_HOST=               # Project Settings > Database > Connection string > Session pooler
DB_PROJECT_REF=        # el project-ref del proyecto (ver supabase projects list)
DB_PASSWORD=           # la password de la base
```

Se completa una vez (los valores salen del dashboard de Supabase del proyecto correspondiente) y se reutiliza en cada `switch-env.sh remote` siguiente. Si la cuenta tiene más de un proyecto Supabase, confirmar el `DB_PROJECT_REF` correcto con `supabase projects list` antes de completarlo — apuntar al proyecto equivocado conecta todo a una base que no corresponde.

En los dos modos, **el script no reinicia nada por vos** — al terminar hay que reiniciar `dotnet run` (API) y, si estaba corriendo, `npm run dev` (frontend), por el mismo motivo que se explica más abajo (Npgsql cachea el catálogo de tipos al arrancar).

### Qué hace por dentro / cómo switchear a mano

Lo siguiente es lo que hace el script automáticamente. Sirve para entender qué toca, para debuggear si algo no cuadra, o para switchear a mano si por algún motivo no se puede correr el script.

La API decide contra qué base conectarse por un único valor: `ConnectionStrings:StcDatabase`, configurado vía `dotnet user-secrets` (nunca en `appsettings.json` commiteado, ver CLAUDE.md). Cambiarlo y reiniciar la API es todo lo que hace falta de ese lado.

#### Ver la conexión actual

```bash
cd api/src/Stc.Api && dotnet user-secrets list
```

Mirá el `Host`:
- Si es `127.0.0.1` (con `Port=54322`) → apunta al Docker local.
- Si es `aws-...pooler.supabase.com` (o `db.<project-ref>.supabase.co`) → apunta al remoto.

#### Switchear a local

```bash
cd api/src/Stc.Api
dotnet user-secrets set "ConnectionStrings:StcDatabase" "Host=127.0.0.1;Port=54322;Database=postgres;Username=postgres;Password=postgres;SSL Mode=Disable"
```

(`Password=postgres` acá es literal — es la credencial fija de desarrollo local, la misma en cualquier instalación de Supabase CLI, no un secreto real.)

#### Switchear a remoto

```bash
cd api/src/Stc.Api
dotnet user-secrets set "ConnectionStrings:StcDatabase" "Host=<pooler-host-modo-sesion>;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<password-real>;SSL Mode=Require;Trust Server Certificate=true"
```

El host del pooler en modo sesión, el `<project-ref>` y el password reales se consiguen en el dashboard de Supabase del proyecto correspondiente (Project Settings → Database → Connection string, pestaña "Session pooler") — nunca pegarlos en un documento ni en un commit. Ver [02-Backend-API.md](02-Backend-API.md#conexión-a-la-base--gotchas-de-producción) para por qué tiene que ser específicamente el pooler en modo sesión (puerto 5432) y no el host directo ni el pooler en modo transacción (puerto 6543).

Si la cuenta de Supabase tiene más de un proyecto, confirmar el `project-ref` correcto con `supabase projects list` antes de copiar la connection string — usar la de un proyecto equivocado conecta la API a una base que no corresponde.

#### Después de cambiar: reiniciar la API

Frenar el `dotnet run` que esté corriendo y levantarlo de nuevo:

```bash
dotnet run --project .
```

**Esto es obligatorio, no opcional.** Npgsql arma el catálogo de tipos (incluidos los enums nativos de Postgres que usa este proyecto, ver [02-Backend-API.md](02-Backend-API.md)) una sola vez al arrancar el proceso, contra la base a la que se conecta en ese momento. Cambiar el connection string sin reiniciar dejaría el pool de conexiones existente apuntando a la base vieja hasta que el proceso se reinicie solo. El mismo mecanismo explica el error `InvalidCastException: ... DataTypeName '-.-'` que puede aparecer si una migración le agrega valores a un enum mientras la API sigue corriendo — ver [04-Migraciones.md](04-Migraciones.md#10-reiniciar-la-api--gotcha-de-npgsql-con-enums-nativos).

## Qué implica trabajar en cada una

**Local:**
- Los cambios de datos no afectan nada real — se puede romper, resetear (`supabase db reset`) y probar libremente.
- Es donde se valida toda migración nueva antes de tocar remoto (ver [04-Migraciones.md](04-Migraciones.md)).
- El frontend (`npm run dev`) y el E2E de Playwright (`npm run test:e2e`) están pensados para correr contra esta base local, no contra remoto.
- Riesgo: que el schema local se desalinee del remoto si no se corre `supabase db reset` después de traer migraciones nuevas de git, o si se aplicó algo en remoto que todavía no está commiteado como migración (no debería pasar si se sigue el flujo de 04-Migraciones.md).

**Remoto:**
- Cualquier alta/edición/borrado que se haga probando manualmente (por ejemplo, dar de alta un cliente de prueba para verificar un flujo) queda ahí de verdad — no se limpia solo. Si se prueba algo, conviene borrar los datos de prueba después, o dejar explícito que son de prueba (por ejemplo con un nombre reconocible) para no confundirlos más adelante con datos reales.
- `POST /leads` es público y sin autenticación (ver [02-Backend-API.md](02-Backend-API.md)) — si la API está conectada a remoto, un lead cargado desde la landing pública en producción llega a la base real, no a la local.
- No hay ambiente de staging separado (ver [../roadmaps/00-fortalecimiento.md](../roadmaps/00-fortalecimiento.md), ítem 9) — remoto **es** la única base real que existe hoy, así que conviene tratarlo con el mismo cuidado que a producción aunque todavía no esté "en vivo" cara al público.
- Antes de aplicar una migración nueva acá, seguir el flujo completo de [04-Migraciones.md](04-Migraciones.md) (validar en local primero, backup, revisar si es destructiva).

## El login (Supabase Auth) trae dos switches propios, no uno

Todo lo de arriba controla contra qué base corre la **API en C#**. El login es otra historia: `frontend/src/lib/supabase.ts` crea el cliente de `@supabase/supabase-js` con `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, leídos de `frontend/.env` — un archivo **completamente aparte** del `dotnet user-secrets` de la API. El login (y toda la sesión de Supabase Auth) valida siempre contra el proyecto que indique ese `.env`, sin importar a qué base esté apuntando la API en ese momento.

Pero eso solo cubre el login en sí — la API, por su lado, tiene que **confiar** en los JWT que emite ese mismo proyecto, y eso es una configuración aparte (`Supabase:Jwt:Issuer`). En total son **tres switches independientes**, no uno:

| | Dónde se configura | Qué controla |
|---|---|---|
| `frontend/.env` (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) | `.env` del frontend | Contra qué proyecto Supabase se hace login (Supabase Auth) |
| `dotnet user-secrets` (`ConnectionStrings:StcDatabase`) | user-secrets de la API | Contra qué Postgres corren las queries de negocio de la API (clientes, sitios, activos, etc., incluida la tabla `usuarios`) |
| `dotnet user-secrets` (`Supabase:Jwt:Issuer`) | user-secrets de la API | Qué proyecto Supabase Auth acepta la API como emisor válido de JWT — si no coincide con el proyecto donde se logueó el frontend, la API rechaza el token entero |

### Dónde se puede desalinear

Dos formas distintas de que el login "funcione pero no funcione":

**1. Connection string apuntando a otra base que el login.** Después del login, `AuthContext.jsx` hace un segundo paso: llama a `GET /usuarios/me` **contra la API**, para confirmar que ese usuario existe y está activo en la tabla `usuarios` (ver [02-Backend-API.md](02-Backend-API.md)). Si el `.env` del frontend y el `ConnectionStrings:StcDatabase` de la API no apuntan al mismo proyecto/base, ese segundo paso falla aunque el login en sí haya funcionado:

- Login contra Supabase Auth **remoto** → JWT válido, con un `sub` que existe en la tabla `usuarios` del proyecto **remoto**.
- Si la API está apuntando a **Docker local** en ese momento, `GET /usuarios/me` busca ese `sub` en la tabla `usuarios` de la base **local** (que tiene otro usuario, el del `seed.sql`, con otro id) → no lo encuentra → `AuthContext` interpreta que no es staff activo y **cierra la sesión sola**, aunque el login pareciera haber andado un instante antes de eso.

**2. Issuer del JWT sin actualizar.** `appsettings.json` trae `Supabase:Jwt:Issuer` **commiteado apuntando al proyecto remoto** (no es secreto, ver CLAUDE.md — es el valor por default si no se lo pisa con `dotnet user-secrets`). Si el frontend loguea contra Supabase Auth **local** pero nadie pisó ese default, la API sigue esperando tokens emitidos por el proyecto remoto:

- Login contra Supabase Auth **local** → JWT válido, con issuer `http://127.0.0.1:54321/auth/v1`.
- La API valida `ValidIssuer` contra `Supabase:Jwt:Issuer` (por default, el remoto) → no coincide → rechaza el token con **`401 Unauthorized`** en *cualquier* endpoint autenticado, incluido `GET /usuarios/me` — a diferencia del caso 1, acá ni siquiera llega a hacer la consulta a `usuarios`, el token se rechaza antes.

Para evitar esta confusión, chequear los tres switches juntos cuando algo de auth no cierra: `grep VITE_SUPABASE_URL frontend/.env` (sin exponer el valor completo si se comparte pantalla) y `dotnet user-secrets list` desde `api/src/Stc.Api` (mirando tanto `ConnectionStrings:StcDatabase` como `Supabase:Jwt:Issuer`) — los tres tienen que corresponder al mismo ambiente (los tres a local, o los tres al mismo proyecto remoto).

### Para loguear contra Docker local de punta a punta

`scripts/switch-env.sh local` ya resuelve los primeros dos puntos (connection string + issuer) de una sola vez. Sigue haciendo falta el tercero:

1. `frontend/.env` apuntando a Docker local — lo hace `scripts/switch-env.sh local`.
2. La API (`ConnectionStrings:StcDatabase` y `Supabase:Jwt:Issuer` en `dotnet user-secrets`) apuntando también a Docker local — lo hace `scripts/switch-env.sh local`.
3. Un usuario real en esa base local — en Supabase Auth local **y** su fila correspondiente en `usuarios`. El seed (`supabase/seed.sql`) puede traer uno de prueba; si no alcanza, `frontend/e2e/global-setup.ts` muestra cómo crear uno mediante la API admin de Supabase Auth local, ya que es exactamente lo que hace para poder correr el E2E de Playwright sin depender de un usuario cargado a mano.

En los dos casos hay que **reiniciar la API** después de correr el script, por el mismo motivo de siempre (la config se lee al arrancar el proceso).

## Errores comunes al confundir el ambiente

- **"No veo los datos que cargué"**: seguramente se cargaron en una base y se está mirando la otra (por ejemplo, se probó algo con la API apuntando a remoto, y después se volvió a local sin darse cuenta). Chequear `dotnet user-secrets list` para confirmar contra qué base está corriendo la API en ese momento.
- **`InvalidCastException` con enums después de aplicar una migración**: la API sigue corriendo con el catálogo de tipos viejo — reiniciarla (ver arriba).
- **Una migración nueva "no está" en remoto aunque ya se commiteó**: commitear la migración no la aplica sola en ningún lado — hay que correr `supabase db push` explícitamente contra el proyecto vinculado (ver [04-Migraciones.md](04-Migraciones.md)). Usar `supabase migration list` para confirmar el estado real en vez de asumir por la fecha del commit.
- **El login parece funcionar un instante y después la sesión se cierra sola**: el `.env` del frontend y el `ConnectionStrings:StcDatabase` de la API están apuntando a bases distintas (por ejemplo, login contra Supabase Auth remoto pero la API contra Docker local) — ver la sección de arriba.
- **`401 Unauthorized` en cualquier endpoint autenticado (por ejemplo `/usuarios/me`) justo después de loguear, sin que llegue a fallar por "usuario no encontrado"**: `Supabase:Jwt:Issuer` de la API no coincide con el proyecto Supabase Auth contra el que logueó el frontend — la API rechaza el JWT por el issuer antes de llegar a consultar la tabla `usuarios`. `scripts/switch-env.sh` ya sincroniza esto; si se switcheó a mano, revisar `dotnet user-secrets list` en busca de `Supabase:Jwt:Issuer`.
