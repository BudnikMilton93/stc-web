import { expect, test } from '@playwright/test'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './support/testAdmin'

test.describe('Flujo critico: login -> cliente -> sitio -> unidad -> ocupante -> activo', () => {
  test('crea toda la jerarquia y el activo queda visible al final', async ({ page }) => {
    const runId = Date.now()
    const clienteNombre = `Cliente E2E ${runId}`
    const sitioNombre = `Sitio E2E ${runId}`
    const unidadIdentificador = `U-${runId}`
    const ocupanteNombre = `Ocupante E2E ${runId}`

    // --- Login ---
    await page.goto('/panel-admin/login')
    await page.getByLabel('Email corporativo').fill(E2E_ADMIN_EMAIL)
    await page.getByLabel('Contrasena').fill(E2E_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /ingresar/i }).click()

    await expect(page).toHaveURL(/\/panel-admin\/clientes$/)
    await expect(page.getByRole('heading', { name: 'Listado de clientes' })).toBeVisible()

    // --- Cliente ---
    await page.getByRole('button', { name: 'Nuevo cliente' }).click()
    // getByLabel('Nombre') sin "exact" tambien matchea el campo de busqueda
    // "Buscar por nombre" del listado (misma pagina): se acota al form.
    await page.getByLabel('Nombre', { exact: true }).fill(clienteNombre)
    await page.getByRole('button', { name: /guardar cliente/i }).click()

    const clienteCard = page.locator('.list-item', { hasText: clienteNombre })
    await expect(clienteCard).toBeVisible()
    await clienteCard.getByRole('link', { name: /ver detalle/i }).click()

    await expect(page.getByRole('heading', { name: clienteNombre })).toBeVisible()

    // --- Sitio ---
    await page.getByRole('button', { name: 'Nuevo sitio' }).click()
    await page.getByLabel('Nombre').fill(sitioNombre)
    await page.getByLabel('Direccion').fill('Calle Falsa 123')
    await page.getByRole('button', { name: /guardar sitio/i }).click()

    const sitioCard = page.locator('.list-item', { hasText: sitioNombre })
    await expect(sitioCard).toBeVisible()
    await sitioCard.getByRole('link', { name: /ver detalle/i }).click()

    await expect(page.getByRole('heading', { name: sitioNombre })).toBeVisible()

    // --- Unidad ---
    await page.getByRole('button', { name: 'Nueva unidad' }).click()
    await page.getByLabel('Identificador').fill(unidadIdentificador)
    await page.getByRole('button', { name: /guardar unidad/i }).click()

    const unidadRow = page.locator('.data-grid-row', { hasText: unidadIdentificador })
    await expect(unidadRow).toBeVisible()
    await unidadRow.getByRole('link', { name: /abrir ficha/i }).click()

    await expect(page.getByText(unidadIdentificador)).toBeVisible()

    // --- Ocupante (paso obligatorio antes de poder crear un activo) ---
    await page.getByRole('button', { name: 'Gestionar ocupantes' }).click()
    await page.getByRole('button', { name: 'Nuevo ocupante' }).click()
    await page.getByLabel('Nombre').fill(ocupanteNombre)
    await page.getByRole('button', { name: /guardar ocupante/i }).click()

    await expect(page.getByText('Ya puedes pasar al Paso 2 y dar de alta activos.')).toBeVisible()

    // --- Activo, asignado al ocupante recien creado ---
    await page.getByRole('button', { name: 'Cambiar gestion' }).click()
    await page.getByRole('button', { name: 'Gestionar activos' }).click()

    await expect(page.getByText('Alta de activo bloqueada')).toHaveCount(0)

    await page.getByPlaceholder('Buscar ocupante existente').fill(ocupanteNombre)
    await page.getByRole('button', { name: new RegExp(ocupanteNombre) }).click()
    await expect(page.getByText(`Seleccionado: ${ocupanteNombre}`)).toBeVisible()

    await page.getByRole('button', { name: /guardar activo/i }).click()

    const activoRow = page.locator('.data-grid-row', { hasText: 'camara' })
    await expect(activoRow).toBeVisible()
    await expect(activoRow.getByText(ocupanteNombre)).toBeVisible()
  })
})
