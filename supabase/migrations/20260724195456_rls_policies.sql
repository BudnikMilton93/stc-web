-- ============================================================
-- ROW LEVEL SECURITY — uso interno (staff) + formulario público (leads)
-- ============================================================

-- ------------------------------------------------------------
-- FUNCIONES HELPER
-- security definer: pueden leer 'usuarios' aunque esa tabla
-- tambien tenga RLS activado (si no, se pisarian entre si)
-- ------------------------------------------------------------
create or replace function is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios
    where auth_id = auth.uid() and activo = true
  );
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios
    where auth_id = auth.uid() and rol = 'admin' and activo = true
  );
$$;

-- ------------------------------------------------------------
-- USUARIOS
-- El staff puede ver la lista (para asignar tecnicos a ordenes).
-- Solo admin puede crear/editar/borrar usuarios.
-- ------------------------------------------------------------
alter table usuarios enable row level security;

create policy "staff puede ver usuarios" on usuarios
  for select to authenticated using (is_staff());

create policy "admin gestiona usuarios" on usuarios
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- CLIENTES / CONTACTOS_CLIENTE / SITIOS / UNIDADES / OCUPANTES / ACTIVOS
-- Patron identico: staff activo tiene CRUD completo excepto delete,
-- que queda reservado a admin (evita que un tecnico borre por error
-- un cliente con historial asociado).
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
    execute format('alter table %I enable row level security;', t);

    execute format($p$
      create policy "staff select %1$s" on %1$I
        for select to authenticated using (is_staff());
    $p$, t);

    execute format($p$
      create policy "staff insert %1$s" on %1$I
        for insert to authenticated with check (is_staff());
    $p$, t);

    execute format($p$
      create policy "staff update %1$s" on %1$I
        for update to authenticated using (is_staff()) with check (is_staff());
    $p$, t);

    execute format($p$
      create policy "admin delete %1$s" on %1$I
        for delete to authenticated using (is_admin());
    $p$, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- ORDENES_TRABAJO
-- Todo el staff ve y crea. Actualizar: el tecnico asignado o un
-- admin. Borrar: solo admin (en general, mejor cancelar que borrar).
-- ------------------------------------------------------------
alter table ordenes_trabajo enable row level security;

create policy "staff select ordenes" on ordenes_trabajo
  for select to authenticated using (is_staff());

create policy "staff insert ordenes" on ordenes_trabajo
  for insert to authenticated with check (is_staff());

create policy "tecnico asignado o admin actualiza orden" on ordenes_trabajo
  for update to authenticated
  using (
    is_admin()
    or tecnico_id = (select id from usuarios where auth_id = auth.uid())
  )
  with check (
    is_admin()
    or tecnico_id = (select id from usuarios where auth_id = auth.uid())
  );

create policy "admin borra ordenes" on ordenes_trabajo
  for delete to authenticated using (is_admin());

-- ------------------------------------------------------------
-- LEADS
-- Cualquiera (sin sesion) puede crear un lead. Nadie sin sesion
-- puede leerlos. El staff puede leer/actualizar (para convertir
-- el lead en cliente); borrar queda para admin.
-- ------------------------------------------------------------
alter table leads enable row level security;

create policy "publico crea leads" on leads
  for insert to anon with check (true);

create policy "staff lee leads" on leads
  for select to authenticated using (is_staff());

create policy "staff actualiza leads" on leads
  for update to authenticated using (is_staff()) with check (is_staff());

create policy "admin borra leads" on leads
  for delete to authenticated using (is_admin());

-- ------------------------------------------------------------
-- NOTA: las Edge Functions que usan la service_role key
-- bypassean RLS por completo (es el comportamiento esperado
-- para tu backend de confianza). Estas politicas protegen el
-- escenario donde el frontend consulta Supabase directo con
-- la clave anon/publica.
-- ------------------------------------------------------------
