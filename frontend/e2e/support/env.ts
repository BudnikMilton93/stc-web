// Configuracion compartida del entorno E2E: Supabase local + API local.
// Todos los valores tienen un default que apunta al `supabase start` local
// (las claves demo del CLI, no son secretas: son las mismas para cualquier
// instancia local de Supabase) para no depender de que quien corra los
// tests exporte nada a mano.

export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321'

export const SUPABASE_ANON_KEY =
  process.env.E2E_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Connection string al Postgres local que levanta `supabase start`
// (puerto del `db`, no el pooler: en local no hace falta pooler de sesion).
export const SUPABASE_DB_URL =
  process.env.E2E_SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5004'

export const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5174'

export const FRONTEND_PORT = 5174
export const API_PORT = 5004
