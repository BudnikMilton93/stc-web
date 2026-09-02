import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../context/AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/panel-admin/clientes']}>
      <Routes>
        <Route
          path="/panel-admin/clientes"
          element={
            <ProtectedRoute>
              <p>Contenido protegido</p>
            </ProtectedRoute>
          }
        />
        <Route path="/panel-admin/login" element={<p>Pagina de login</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('muestra el mensaje de validacion y no renderiza children mientras loading es true', () => {
    useAuth.mockReturnValue({ loading: true, isAuthorized: false })

    renderProtectedRoute()

    expect(screen.getByText('Validando acceso...')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('redirige a /panel-admin/login cuando no esta autorizado', () => {
    useAuth.mockReturnValue({ loading: false, isAuthorized: false })

    renderProtectedRoute()

    expect(screen.getByText('Pagina de login')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('renderiza los children cuando esta autorizado', () => {
    useAuth.mockReturnValue({ loading: false, isAuthorized: true })

    renderProtectedRoute()

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })
})
