import { execFileSync } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_DB_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './support/env'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_NOMBRE, E2E_ADMIN_PASSWORD } from './support/testAdmin'

/**
 * Crea (o reutiliza) el usuario admin de prueba contra el Supabase LOCAL
 * antes de correr los specs E2E:
 *  1. Usuario real de Supabase Auth (via Admin API, bypassea confirmacion
 *     de mail) -- esto es lo que permite un login real en AdminLoginPage.
 *  2. Fila correspondiente en la tabla `usuarios` (activo = true), sin la
 *     cual `GET /usuarios/me` devuelve 404 y AuthContext cierra la sesion
 *     por "no autorizado" (ver frontend/src/context/AuthContext.jsx).
 *
 * Solo depende de que `supabase start` ya este corriendo -- no depende de
 * los webServer (API/frontend) que arranca Playwright.
 */
async function globalSetup() {
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const authId = await ensureAuthUser(supabaseAdmin)
  ensureUsuarioRow(authId)
}

async function ensureAuthUser(supabaseAdmin: SupabaseClient): Promise<string> {
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
    email_confirm: true,
  })

  if (!createError && created.user) {
    return created.user.id
  }

  // Corridas repetidas contra el mismo Supabase local ya tienen el usuario
  // creado: buscarlo en vez de fallar.
  const alreadyExists =
    createError?.message?.toLowerCase().includes('already been registered') ||
    createError?.message?.toLowerCase().includes('already registered') ||
    createError?.status === 422

  if (!alreadyExists) {
    throw new Error(`No se pudo crear el usuario admin de prueba en Supabase Auth: ${createError?.message}`)
  }

  const existing = await findAuthUserByEmail(supabaseAdmin)
  if (!existing) {
    throw new Error(
      `El usuario admin de prueba (${E2E_ADMIN_EMAIL}) ya existiria segun Supabase Auth pero no se lo pudo encontrar via listUsers.`,
    )
  }

  return existing.id
}

async function findAuthUserByEmail(supabaseAdmin: SupabaseClient) {
  const perPage = 200
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`No se pudo listar usuarios de Supabase Auth: ${error.message}`)
    }

    const match = data.users.find((user) => user.email === E2E_ADMIN_EMAIL)
    if (match) {
      return match
    }

    if (data.users.length < perPage) {
      return null
    }
  }

  return null
}

function ensureUsuarioRow(authId: string) {
  // Insercion idempotente directo contra Postgres (mismo mecanismo que usa
  // la API: acceso directo, sin pasar por PostgREST/RLS). `usuarios.email`
  // es unico, asi que ON CONFLICT cubre tanto la primera corrida como las
  // siguientes contra el mismo Supabase local.
  const sql = `
    insert into usuarios (auth_id, nombre, email, activo)
    values (:'authId', :'nombre', :'email', true)
    on conflict (email) do update set auth_id = excluded.auth_id, activo = true;
  `

  execFileSync(
    'psql',
    [
      SUPABASE_DB_URL,
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      `authId=${authId}`,
      '-v',
      `nombre=${E2E_ADMIN_NOMBRE}`,
      '-v',
      `email=${E2E_ADMIN_EMAIL}`,
      '-c',
      sql,
    ],
    {
      stdio: 'inherit',
    },
  )
}

export default globalSetup
