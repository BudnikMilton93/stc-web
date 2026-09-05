import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { UnidadDetailPage } from './UnidadDetailPage'

vi.mock('../../../lib/apiClient', async () => {
  const actual = await vi.importActual('../../../lib/apiClient')
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  }
})

const clienteMock = { id: 'cliente-1', tipo: 'empresa', nombre: 'Consorcio Colon' }
const sitioMock = { id: 'sitio-1', clienteId: 'cliente-1', nombre: 'Edificio Central', tipo: 'edificio', direccion: 'Av. Siempreviva 123' }
const unidadMock = { id: 'unidad-1', sitioId: 'sitio-1', identificador: '3B', piso: '3' }

const ocupanteMock = {
  id: 'ocupante-1',
  unidadId: 'unidad-1',
  nombre: 'Juan Perez',
  telefono: '111',
  email: 'juan@mail.com',
  esTitular: true,
  notas: null,
}

function mockGetRoutes({ ocupantes = [], activos = [] } = {}) {
  apiClient.get.mockImplementation((path) => {
    if (path === '/unidades/unidad-1') return Promise.resolve(unidadMock)
    if (path === '/sitios/sitio-1') return Promise.resolve(sitioMock)
    if (path === '/clientes/cliente-1') return Promise.resolve(clienteMock)
    if (path === '/ocupantes?unidadId=unidad-1') return Promise.resolve(ocupantes)
    if (path === '/activos?unidadId=unidad-1') return Promise.resolve(activos)
    return Promise.reject(new Error(`GET no mockeado: ${path}`))
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/panel-admin/clientes/cliente-1/sitios/sitio-1/unidades/unidad-1']}>
      <Routes>
        <Route
          path="/panel-admin/clientes/:clienteId/sitios/:sitioId/unidades/:unidadId"
          element={<UnidadDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UnidadDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el selector de gestion y permite elegir entre ocupantes y activos', async () => {
    mockGetRoutes()
    renderPage()

    expect(await screen.findByText('¿Qué quieres administrar?')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Gestionar ocupantes/i }))

    expect(screen.getByText('Gestión de ocupantes')).toBeInTheDocument()
  })

  it('bloquea el alta de activos si no hay ocupantes activos en la unidad', async () => {
    mockGetRoutes({ ocupantes: [] })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('¿Qué quieres administrar?')
    await user.click(screen.getByRole('button', { name: /Gestionar activos/i }))

    expect(screen.getByText(/Alta de activo bloqueada/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nuevo activo/i })).toBeDisabled()
  })

  it('habilita el alta de activos cuando hay al menos un ocupante activo, y permite elegirlo con el autocomplete', async () => {
    mockGetRoutes({ ocupantes: [ocupanteMock] })
    apiClient.post.mockResolvedValue({ id: 'activo-1' })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('¿Qué quieres administrar?')
    await user.click(screen.getByRole('button', { name: /Gestionar activos/i }))

    expect(screen.queryByText(/Alta de activo bloqueada/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Nuevo activo/i }))
    await user.type(screen.getByLabelText(/Ocupante responsable/i), 'Juan')
    await user.click(screen.getByRole('button', { name: /Juan Perez \(titular\)/i }))
    await user.click(screen.getByRole('button', { name: /Guardar activo/i }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())

    expect(apiClient.post).toHaveBeenCalledWith('/activos', {
      tipo: 'camara',
      marca: null,
      modelo: null,
      numeroSerie: null,
      fechaInstalacion: null,
      garantiaHasta: null,
      proximoMantenimiento: null,
      ultimaRevision: null,
      notas: null,
      clienteId: 'cliente-1',
      sitioId: 'sitio-1',
      unidadId: 'unidad-1',
      ocupanteId: 'ocupante-1',
    })
  })

  it('da de alta un ocupante nuevo vía el modal, enviando el unidadId en el payload', async () => {
    mockGetRoutes({ ocupantes: [] })
    apiClient.post.mockResolvedValue({ id: 'ocupante-2', nombre: 'Maria Lopez' })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('¿Qué quieres administrar?')
    await user.click(screen.getByRole('button', { name: /Gestionar ocupantes/i }))
    await user.click(screen.getByRole('button', { name: /Nuevo ocupante/i }))
    await user.type(screen.getByLabelText('Nombre'), 'Maria Lopez')
    await user.click(screen.getByRole('button', { name: /Guardar ocupante/i }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())

    expect(apiClient.post).toHaveBeenCalledWith('/ocupantes', {
      nombre: 'Maria Lopez',
      telefono: null,
      email: null,
      esTitular: true,
      notas: null,
      unidadId: 'unidad-1',
    })
  })

  it('muestra el error de la API sin cerrar el modal si falla el guardado del ocupante', async () => {
    mockGetRoutes({ ocupantes: [] })
    apiClient.post.mockRejectedValue(new ApiError(400, { title: 'Nombre invalido' }, 'Nombre invalido'))
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('¿Qué quieres administrar?')
    await user.click(screen.getByRole('button', { name: /Gestionar ocupantes/i }))
    await user.click(screen.getByRole('button', { name: /Nuevo ocupante/i }))
    await user.type(screen.getByLabelText('Nombre'), 'Alguien')
    await user.click(screen.getByRole('button', { name: /Guardar ocupante/i }))

    expect(await screen.findByText('Nombre invalido')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })
})
