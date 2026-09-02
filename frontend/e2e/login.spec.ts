import { expect, test } from '@playwright/test'

test.describe('Login', () => {
  test('credenciales invalidas muestran un error y no navegan al panel', async ({ page }) => {
    await page.goto('/panel-admin/login')

    await page.getByLabel('Email corporativo').fill('no-existe@stc.local')
    await page.getByLabel('Contrasena').fill('password-incorrecta')
    await page.getByRole('button', { name: /ingresar/i }).click()

    await expect(page.locator('.form-error')).toBeVisible()
    await expect(page).toHaveURL(/\/panel-admin\/login/)
    await expect(page.getByRole('heading', { name: 'Listado de clientes' })).toHaveCount(0)
  })
})
