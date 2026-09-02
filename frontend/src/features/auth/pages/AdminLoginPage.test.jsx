import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../../context/AuthContext'
import { AdminLoginPage } from './AdminLoginPage'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/panel-admin/login']}>
      <Routes>
        <Route path="/panel-admin/login" element={<AdminLoginPage />} />
        <Route path="/panel-admin/clientes" element={<p>Listado de clientes</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminLoginPage', () => {
  it('llama a signIn con los valores tipeados al completar el form y enviarlo', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockResolvedValue({ success: true, error: '' })
    useAuth.mockReturnValue({
      isAuthorized: false,
      isAuthenticated: false,
      loading: false,
      authError: '',
      signIn,
    })

    renderLoginPage()

    await user.type(screen.getByLabelText('Email corporativo'), 'admin@stc.local')
    await user.type(screen.getByLabelText('Contrasena'), 'secreto123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(signIn).toHaveBeenCalledWith('admin@stc.local', 'secreto123')
  })

  it('muestra el error devuelto por signIn cuando falla', async () => {
    const user = userEvent.setup()
    const signIn = vi.fn().mockResolvedValue({ success: false, error: 'Credenciales invalidas' })
    useAuth.mockReturnValue({
      isAuthorized: false,
      isAuthenticated: false,
      loading: false,
      authError: '',
      signIn,
    })

    renderLoginPage()

    await user.type(screen.getByLabelText('Email corporativo'), 'admin@stc.local')
    await user.type(screen.getByLabelText('Contrasena'), 'mal')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument()
  })

  it('redirige a /panel-admin/clientes si ya esta autorizado al montar', () => {
    useAuth.mockReturnValue({
      isAuthorized: true,
      isAuthenticated: true,
      loading: false,
      authError: '',
      signIn: vi.fn(),
    })

    renderLoginPage()

    expect(screen.getByText('Listado de clientes')).toBeInTheDocument()
  })

  it('deshabilita el boton de submit y muestra "Ingresando..." mientras loading es true', () => {
    useAuth.mockReturnValue({
      isAuthorized: false,
      isAuthenticated: false,
      loading: true,
      authError: '',
      signIn: vi.fn(),
    })

    renderLoginPage()

    const button = screen.getByRole('button', { name: 'Ingresando...' })
    expect(button).toBeDisabled()
  })
})
