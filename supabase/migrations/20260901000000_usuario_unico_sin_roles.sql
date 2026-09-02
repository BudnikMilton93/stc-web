-- ============================================================
-- USUARIO UNICO, SIN ROLES
-- El sistema es de uso estrictamente personal (un solo dueno
-- operandolo): se elimina la distincion admin/tecnico de punta
-- a punta. Queda una unica condicion: usuario activo.
-- ============================================================

-- ------------------------------------------------------------
-- Borrar TODAS las policies existentes que dependen de
-- is_staff()/is_admin() (staff y admin) antes de poder borrar
-- esas funciones y la columna 'rol'.
-- 'if exists' porque esta misma migracion tambien se aplica
-- contra un Postgres de test que nunca corrio la migracion de
-- RLS original (ver api/src/Stc.Api.Tests/Infrastructure/PostgresApiFixture.cs).
-- ------------------------------------------------------------
drop policy if exists "staff puede ver usuarios" on usuarios;
drop policy if exists "admin gestiona usuarios" on usuarios;

do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes', 'contactos_cliente', 'sitios',
    'unidades', 'ocupantes', 'activos',
    'orden_items', 'insumos', 'movimientos_stock', 'adjuntos'
  ]
  loop
    execute format('drop policy if exists %I on %I;', 'staff select ' || t, t);
    execute format('drop policy if exists %I on %I;', 'staff insert ' || t, t);
    execute format('drop policy if exists %I on %I;', 'staff update ' || t, t);
    execute format('drop policy if exists %I on %I;', 'admin delete ' || t, t);
  end loop;
end $$;

drop policy if exists "staff select ordenes" on ordenes_trabajo;
drop policy if exists "staff insert ordenes" on ordenes_trabajo;
drop policy if exists "tecnico asignado o admin actualiza orden" on ordenes_trabajo;
drop policy if exists "admin borra ordenes" on ordenes_trabajo;

drop policy if exists "staff lee leads" on leads;
drop policy if exists "staff actualiza leads" on leads;
drop policy if exists "admin borra leads" on leads;

drop function if exists is_admin();
drop function if exists is_staff();

-- Se redefine en vez de renombrar: esta migracion tambien se
-- aplica contra un Postgres de test que nunca corrio la
-- migracion de RLS original, donde is_staff() no existe.
create or replace function is_activo()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios
    where auth_id = auth.uid() and activo = true
  );
$$;

-- ------------------------------------------------------------
-- USUARIOS
-- Sin distincion de rol: cualquier usuario activo (en la
-- practica, el unico) gestiona la tabla. La autoridad real es
-- el backend con service_role; esto es defensa en profundidad.
-- ------------------------------------------------------------
create policy "activo gestiona usuarios" on usuarios
  for all to authenticated using (is_activo()) with check (is_activo());

-- ------------------------------------------------------------
-- CLIENTES / CONTACTOS_CLIENTE / SITIOS / UNIDADES / OCUPANTES /
-- ACTIVOS / ORDEN_ITEMS / INSUMOS / MOVIMIENTOS_STOCK / ADJUNTOS
-- Un solo usuario activo: ya no tiene sentido separar delete.
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes', 'contactos_cliente', 'sitios',
    'unidades', 'ocupantes', 'activos',
    'orden_items', 'insumos', 'movimientos_stock', 'adjuntos'
  ]
  loop
    execute format($p$
      create policy "activo gestiona %1$s" on %1$I
        for all to authenticated using (is_activo()) with check (is_activo());
    $p$, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- ORDENES_TRABAJO
-- Deja de existir la nocion de "tecnico asignado": tecnico_id
-- sigue existiendo como dato operativo/historico, sin efecto
-- en la autorizacion.
-- ------------------------------------------------------------
create policy "activo gestiona ordenes" on ordenes_trabajo
  for all to authenticated using (is_activo()) with check (is_activo());

-- ------------------------------------------------------------
-- LEADS
-- El formulario publico (anon) sigue igual. El resto colapsa
-- a una sola policy de usuario activo.
-- ------------------------------------------------------------
create policy "activo gestiona leads" on leads
  for all to authenticated using (is_activo()) with check (is_activo());

-- ------------------------------------------------------------
-- Ya no hay nada que dependa de 'rol' ni 'rol_usuario'.
-- ------------------------------------------------------------
alter table usuarios drop column if exists rol;
drop type if exists rol_usuario;

-- ------------------------------------------------------------
-- NOTA: el backend en C# no usa Edge Functions ni la service_role
-- key de la Data API — se conecta directo con una connection
-- string de Postgres (rol "postgres" del connection pooler en
-- modo sesion, ver api/src/Stc.Infrastructure/ServiceCollectionExtensions.cs),
-- que por default en Supabase tiene BYPASSRLS. Estas policies son
-- defensa en profundidad solo para el escenario legado de que el
-- frontend vuelva a consultar Supabase directo con la clave
-- anon/publica (hoy no lo hace, ver CLAUDE.md). No hay distincion
-- de roles: un solo usuario activo gestiona todo.
-- ------------------------------------------------------------
