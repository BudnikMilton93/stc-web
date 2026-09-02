// Credenciales del usuario admin de prueba usado por los specs E2E.
// Se crea (o se reutiliza si ya existe) en globalSetup contra el Supabase
// local -- ver e2e/global-setup.ts. No es un secreto real: solo existe en
// la instancia local de Supabase que levanta `supabase start`.

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@stc.local'

export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'E2E-admin-password-1'

export const E2E_ADMIN_NOMBRE = 'E2E Admin'
