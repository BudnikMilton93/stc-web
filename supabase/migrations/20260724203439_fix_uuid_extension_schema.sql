-- Ensure uuid-ossp is installed in the expected schema used by Supabase.
create schema if not exists extensions;

do $$
begin
	if exists (
		select 1
		from pg_extension
		where extname = 'uuid-ossp'
	) then
		alter extension "uuid-ossp" set schema extensions;
	else
		create extension "uuid-ossp" with schema extensions;
	end if;
end
$$;
