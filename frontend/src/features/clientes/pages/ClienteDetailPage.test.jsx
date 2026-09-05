import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { ClienteDetailPage } from './ClienteDetailPage'

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

const clienteMock = { id: 'cliente-1', tipo: 'empresa', nombre: 'Consorcio Colon', email: 'colon@mail.com' }

const sitiosMock = [
  {
    id: 'sitio-1',
    clienteId: 'cliente-1',
    nombre: 'Edificio Central',
    tipo: 'edificio',
    direccion: 'Av. Siempreviva 123',
    ciudad: 'CABA',
    notas: null,
  },
]

function mockGetRoutes({ sitios = sitiosMock, unidadesBySitio = {}, equipamiento = [] } = {}) {
  apiClient.get.mockImplementation((path) => {
    if (path === '/clientes/cliente-1') {
      return Promise.resolve(clienteMock)
    }
    if (path === '/sitios?clienteId=cliente-1') {
      return Promise.resolve(sitios)
    }
    if (path === '/activos?clienteId=cliente-1&soloEquipamientoSitio=true') {
      return Promise.resolve(equipamiento)
    }
    const unidadesMatch = path.match(/^\/unidades\?sitioId=(.+)$/)
    if (unidadesMatch) {
      return Promise.resolve(unidadesBySitio[unidadesMatch[1]] ?? [])
    }
    return Promise.reject(new Error(`GET no mockeado: ${path}`))
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/panel-admin/clientes/cliente-1']}>
      <Routes>
        <Route path="/panel-admin/clientes/:clienteId" element={<ClienteDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClienteDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRoutes()
  })

  it('carga y muestra los sitios asociados al cliente en la grilla', async () => {
    renderPage()

    expect(await screen.findByText('Edificio Central')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/clientes/cliente-1')
    expect(apiClient.get).toHaveBeenCalledWith('/sitios?clienteId=cliente-1')
    expect(apiClient.get).toHaveBeenCalledWith('/activos?clienteId=cliente-1&soloEquipamientoSitio=true')
  })

  it('muestra el nombre y tipo del cliente en el encabezado', async () => {
    renderPage()

    await screen.findByText('Edificio Central')

    expect(screen.getByRole('heading', { name: 'Consorcio Colon' })).toBeInTheDocument()
    expect(screen.getByText('Empresa')).toBeInTheDocument()
  })

  it('da de alta un sitio nuevo vía el modal, enviando el clienteId en el payload', async () => {
    const user = userEvent.setup()
    apiClient.post.mockResolvedValue({ id: 'sitio-2' })
    renderPage()

    await screen.findByText('Edificio Central')

    await user.click(screen.getByRole('button', { name: /Nuevo sitio/i }))
    await user.type(screen.getByLabelText('Nombre'), 'Depósito Norte')
    await user.type(screen.getByLabelText('Dirección'), 'Ruta 8 km 45')
    await user.click(screen.getByRole('button', { name: /Guardar sitio/i }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())

    expect(apiClient.post).toHaveBeenCalledWith('/sitios', {
      nombre: 'Depósito Norte',
      tipo: 'edificio',
      direccion: 'Ruta 8 km 45',
      ciudad: null,
      notas: null,
      clienteId: 'cliente-1',
    })
  })

  it('al editar un sitio existente, precarga el formulario con sus datos y guarda vía PUT', async () => {
    const user = userEvent.setup()
    apiClient.put.mockResolvedValue({})
    renderPage()

    await screen.findByText('Edificio Central')

    await user.click(screen.getByRole('button', { name: /Editar/i }))

    expect(screen.getByLabelText('Nombre')).toHaveValue('Edificio Central')
    expect(screen.getByLabelText('Dirección')).toHaveValue('Av. Siempreviva 123')

    await user.clear(screen.getByLabelText('Ciudad'))
    await user.type(screen.getByLabelText('Ciudad'), 'Rosario')
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => expect(apiClient.put).toHaveBeenCalled())

    expect(apiClient.put).toHaveBeenCalledWith('/sitios/sitio-1', {
      nombre: 'Edificio Central',
      tipo: 'edificio',
      direccion: 'Av. Siempreviva 123',
      ciudad: 'Rosario',
      notas: null,
    })
  })

  it('muestra el error de guardado sin cerrar el modal si falla el PUT', async () => {
    const user = userEvent.setup()
    apiClient.put.mockRejectedValue(new ApiError(400, { title: 'Direccion invalida' }, 'Direccion invalida'))
    renderPage()

    await screen.findByText('Edificio Central')

    await user.click(screen.getByRole('button', { name: /Editar/i }))
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    expect(await screen.findByText('Direccion invalida')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })
})
