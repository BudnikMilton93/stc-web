import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError } from '../../../lib/apiClient'
import { ClientesPage } from './ClientesPage'

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

const clientesMock = [
  { id: '1', tipo: 'persona', nombre: 'Juan Perez', telefono: '111', email: 'juan@mail.com' },
  { id: '2', tipo: 'empresa', nombre: 'Consorcio Colon', telefono: '222', email: null },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <ClientesPage />
    </MemoryRouter>,
  )
}

describe('ClientesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockResolvedValue(clientesMock)
  })

  it('carga y renderiza la lista de clientes desde GET /clientes al montar', async () => {
    renderPage()

    expect(await screen.findByText('Juan Perez')).toBeInTheDocument()
    expect(screen.getByText('Consorcio Colon')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/clientes')
  })

  it('filtra la lista en memoria por nombre', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Juan Perez')

    await user.type(screen.getByLabelText('Buscar por nombre'), 'colon')

    expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument()
    expect(screen.getByText('Consorcio Colon')).toBeInTheDocument()
  })

  it('crea un cliente nuevo enviando el payload esperado, con opcionales vacios como null', async () => {
    const user = userEvent.setup()
    apiClient.post.mockResolvedValue({ id: '3' })
    renderPage()

    await screen.findByText('Juan Perez')

    await user.click(screen.getByRole('button', { name: /Nuevo cliente/i }))
    await user.type(screen.getByLabelText('Nombre'), 'Cliente Nuevo')
    await user.click(screen.getByRole('button', { name: /Guardar cliente/i }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())

    expect(apiClient.post).toHaveBeenCalledWith('/clientes', {
      tipo: 'persona',
      nombre: 'Cliente Nuevo',
      dniCuit: null,
      email: null,
      telefono: null,
      direccion: null,
      notas: null,
    })
  })

  it('no llama a la API y muestra el error de validacion si el nombre queda vacio', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Juan Perez')

    await user.click(screen.getByRole('button', { name: /Nuevo cliente/i }))
    // El input es `required`, así que un espacio en blanco pasa la validación
    // nativa del navegador pero queda vacío tras el `.trim()` de `handleSave`.
    await user.type(screen.getByLabelText('Nombre'), ' ')
    await user.click(screen.getByRole('button', { name: /Guardar cliente/i }))

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('al editar un cliente, precarga el select de Tipo con el valor real del cliente (no siempre "persona")', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Consorcio Colon')

    await user.click(screen.getByRole('button', { name: /Editar cliente Consorcio Colon/i }))

    expect(screen.getByLabelText('Tipo')).toHaveValue('empresa')
  })

  it('muestra el mensaje de ApiError en el form sin cerrarlo si falla el guardado', async () => {
    const user = userEvent.setup()
    apiClient.post.mockRejectedValue(new ApiError(400, { title: 'Nombre duplicado' }, 'Nombre duplicado'))
    renderPage()

    await screen.findByText('Juan Perez')

    await user.click(screen.getByRole('button', { name: /Nuevo cliente/i }))
    await user.type(screen.getByLabelText('Nombre'), 'Cliente Repetido')
    await user.click(screen.getByRole('button', { name: /Guardar cliente/i }))

    expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })
})
