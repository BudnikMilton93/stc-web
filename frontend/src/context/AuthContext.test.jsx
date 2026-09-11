import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../lib/apiClient'
import { supabase } from '../lib/supabase'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../lib/apiClient', () => ({
  apiClient: { get: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(status, body, message) {
      super(message)
      this.status = status
      this.body = body
    }
  },
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}))

const staffProfileMock = { id: 'staff-1', nombre: 'Admin', email: 'admin@stc.local' }
const sessionMock = { user: { id: 'user-1' }, access_token: 'token' }

function Probe() {
  const { isAuthorized, loading, loggedOutReason } = useAuth()

  return (
    <p>
      authorized:{String(isAuthorized)} loading:{String(loading)} reason:{String(loggedOutReason)}
    </p>
  )
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthProvider - cierre de sesion por inactividad', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    supabase.auth.getSession.mockResolvedValue({ data: { session: sessionMock }, error: null })
    supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    supabase.auth.signOut.mockResolvedValue({ error: null })
    apiClient.get.mockResolvedValue(staffProfileMock)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('cierra la sesion tras 30 minutos de inactividad y expone el motivo', async () => {
    renderAuthProvider()

    // Deja resolver la carga inicial de sesion (promesas de getSession/apiClient.get).
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText(/authorized:true/)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    })

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/authorized:false/)).toBeInTheDocument()
    expect(screen.getByText(/reason:inactivity/)).toBeInTheDocument()
  })

  it('muestra el modal de aviso 2 minutos antes del cierre', async () => {
    renderAuthProvider()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(28 * 60 * 1000)
    })

    expect(screen.getByRole('dialog', { name: 'Tu sesión está por cerrarse' })).toBeInTheDocument()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('un evento de teclado durante el aviso cancela el cierre de sesion', async () => {
    renderAuthProvider()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(28 * 60 * 1000)
    })

    expect(screen.getByRole('dialog', { name: 'Tu sesión está por cerrarse' })).toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown'))
    })

    expect(screen.queryByRole('dialog', { name: 'Tu sesión está por cerrarse' })).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000)
    })

    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('el boton "Continuar sesion" del modal cancela el cierre de sesion', async () => {
    renderAuthProvider()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(28 * 60 * 1000)
    })

    expect(screen.getByRole('dialog', { name: 'Tu sesión está por cerrarse' })).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Continuar sesión' }))
    })

    expect(screen.queryByRole('dialog', { name: 'Tu sesión está por cerrarse' })).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000)
    })

    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('no dispara el cierre por inactividad si no hay sesion autorizada', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    renderAuthProvider()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText(/authorized:false/)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    })

    expect(supabase.auth.signOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Tu sesión está por cerrarse' })).not.toBeInTheDocument()
  })

  it('no dispara el cierre por inactividad si el usuario no esta autorizado (staff inactivo)', async () => {
    apiClient.get.mockResolvedValue(null)

    renderAuthProvider()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText(/authorized:false/)).toBeInTheDocument()
    // signOut ya se llamo una vez durante applySession al detectar perfil
    // nulo: lo que este test verifica es que NO se vuelva a llamar por el
    // timer de inactividad, que nunca debio arrancar.
    const signOutCallsAfterMount = supabase.auth.signOut.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    })

    expect(supabase.auth.signOut.mock.calls.length).toBe(signOutCallsAfterMount)
    expect(screen.queryByRole('dialog', { name: 'Tu sesión está por cerrarse' })).not.toBeInTheDocument()
  })
})
