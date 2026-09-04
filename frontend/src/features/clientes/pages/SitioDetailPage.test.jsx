import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { SitioDetailPage } from './SitioDetailPage'

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

const sitioMock = {
  id: 'sitio-1',
  clienteId: 'cliente-1',
  nombre: 'Edificio Central',
  tipo: 'edificio',
  direccion: 'Av. Siempreviva 123',
  ciudad: 'CABA',
  notas: null,
}

const clienteMock = {
  id: 'cliente-1',
  nombre: 'Cliente Uno',
  tipo: 'persona',
}

const unidadesMock = [
  {
    id: 'unidad-1',
    sitioId: 'sitio-1',
    identificador: '3B',
    piso: '3',
    notas: null,
  },
]

function mockGetRoutes({ unidades = unidadesMock, ocupantesByUnidad = {}, equipamiento = [] } = {}) {
  apiClient.get.mockImplementation((path) => {
    if (path === '/sitios/sitio-1') {
      return Promise.resolve(sitioMock)
    }
    if (path === '/clientes/cliente-1') {
      return Promise.resolve(clienteMock)
    }
    if (path === '/unidades?sitioId=sitio-1') {
      return Promise.resolve(unidades)
    }
    if (path === '/activos?sitioId=sitio-1&soloEquipamientoSitio=true') {
      return Promise.resolve(equipamiento)
    }
    const ocupantesMatch = path.match(/^\/ocupantes\?unidadId=(.+)$/)
    if (ocupantesMatch) {
      return Promise.resolve(ocupantesByUnidad[ocupantesMatch[1]] ?? [])
    }
    return Promise.reject(new Error(`GET no mockeado: ${path}`))
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/panel-admin/clientes/cliente-1/sitios/sitio-1']}>
      <Routes>
        <Route path="/panel-admin/clientes/:clienteId/sitios/:sitioId" element={<SitioDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SitioDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRoutes()
  })

  it('carga y muestra las unidades del sitio en la grilla', async () => {
    renderPage()

    expect(await screen.findByText('3B')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/sitios/sitio-1')
    expect(apiClient.get).toHaveBeenCalledWith('/unidades?sitioId=sitio-1')
  })

  it('muestra el nombre y datos del sitio en el encabezado', async () => {
    renderPage()

    await screen.findByText('3B')

    expect(screen.getByRole('heading', { name: 'Edificio Central' })).toBeInTheDocument()
  })

  it('da de alta una unidad nueva vía el modal, enviando el sitioId en el payload', async () => {
    const user = userEvent.setup()
    apiClient.post.mockResolvedValue({ id: 'unidad-2' })
    renderPage()

    await screen.findByText('3B')

    await user.click(screen.getByRole('button', { name: /Nueva unidad/i }))
    await user.type(screen.getByLabelText('Identificador'), '4C')
    await user.click(screen.getByRole('button', { name: /Guardar unidad/i }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())

    expect(apiClient.post).toHaveBeenCalledWith('/unidades', {
      identificador: '4C',
      piso: null,
      notas: null,
      sitioId: 'sitio-1',
    })
  })

  it('al editar una unidad existente, precarga el formulario y guarda vía PUT', async () => {
    const user = userEvent.setup()
    apiClient.put.mockResolvedValue({})
    renderPage()

    await screen.findByText('3B')

    await user.click(screen.getByRole('button', { name: /Editar unidad 3B/i }))

    expect(screen.getByLabelText('Identificador')).toHaveValue('3B')

    await user.clear(screen.getByLabelText('Piso'))
    await user.type(screen.getByLabelText('Piso'), '5')
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => expect(apiClient.put).toHaveBeenCalled())

    expect(apiClient.put).toHaveBeenCalledWith('/unidades/unidad-1', {
      identificador: '3B',
      piso: '5',
      notas: null,
    })
  })

  it('da de baja una unidad embebiendo el archive-flag en notas', async () => {
    const user = userEvent.setup()
    apiClient.put.mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByText('3B')

    await user.click(screen.getByRole('button', { name: /Dar de baja unidad 3B/i }))

    await waitFor(() => expect(apiClient.put).toHaveBeenCalled())

    expect(apiClient.put).toHaveBeenCalledWith('/unidades/unidad-1', {
      identificador: '3B',
      piso: '3',
      notas: '[BAJA_LOGICA]',
    })
  })

  it('muestra el error de guardado sin cerrar el modal si falla el PUT', async () => {
    const user = userEvent.setup()
    apiClient.put.mockRejectedValue(new ApiError(400, { title: 'Identificador invalido' }, 'Identificador invalido'))
    renderPage()

    await screen.findByText('3B')

    await user.click(screen.getByRole('button', { name: /Editar unidad 3B/i }))
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    expect(await screen.findByText('Identificador invalido')).toBeInTheDocument()
    expect(screen.getByLabelText('Identificador')).toBeInTheDocument()
  })

  it('carga el equipamiento de sitio y permite dar de alta un item nuevo', async () => {
    const user = userEvent.setup()
    apiClient.post.mockResolvedValue({ id: 'equipo-1' })
    mockGetRoutes({
      equipamiento: [
        {
          id: 'equipo-1',
          clienteId: 'cliente-1',
          sitioId: 'sitio-1',
          unidadId: null,
          ocupanteId: null,
          tipo: 'camara',
          marca: 'Hikvision',
          modelo: 'DS-2',
          numeroSerie: 'SN-1',
          fechaInstalacion: null,
          garantiaHasta: null,
          proximoMantenimiento: null,
          ultimaRevision: null,
          estado: 'activo',
          notas: null,
        },
      ],
    })
    renderPage()

    expect(await screen.findByText('Camara')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Nuevo equipamiento/i }))
    await user.click(screen.getByRole('button', { name: /Guardar equipamiento/i }))

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
      unidadId: null,
      ocupanteId: null,
    })
  })
})
