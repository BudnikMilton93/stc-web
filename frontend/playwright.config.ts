import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { API_URL, FRONTEND_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from './e2e/support/env'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Ruta al proyecto de la API en C# (Stc.Api), fuera de frontend/.
const apiProjectDir = path.resolve(__dirname, '../api/src/Stc.Api')

// Connection string Npgsql al Postgres LOCAL que levanta `supabase start`
// (puerto 54322 del `db`, no el pooler remoto de produccion/dev). Pisa lo
// que haya cargado via `dotnet user-secrets` en esta maquina (que apunta a
// Supabase remoto), igual mecanismo que usa Stc.Api.Tests/Infrastructure/StcApiFactory.cs.
const localDbConnectionString =
  process.env.E2E_API_DB_CONNECTION_STRING ??
  'Host=127.0.0.1;Port=54322;Database=postgres;Username=postgres;Password=postgres;SSL Mode=Disable;Trust Server Certificate=true'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'dotnet run --no-launch-profile',
      cwd: apiProjectDir,
      url: `${API_URL}/clientes`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: API_URL,
        ConnectionStrings__StcDatabase: localDbConnectionString,
        Supabase__Jwt__Issuer: `${SUPABASE_URL}/auth/v1`,
      },
    },
    {
      command: `npm run dev -- --port ${new URL(FRONTEND_URL).port} --strictPort`,
      cwd: __dirname,
      url: FRONTEND_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_URL: API_URL,
        VITE_SUPABASE_URL: SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
      },
    },
  ],
})
