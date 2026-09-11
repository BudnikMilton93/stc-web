import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { InactivityWarningModal } from '../components/auth/InactivityWarningModal'
import { useInactivityTimeout } from '../hooks/useInactivityTimeout'
import { supabase } from '../lib/supabase'
import { apiClient, ApiError } from '../lib/apiClient'

const AuthContext = createContext(null)

// 30 minutos de inactividad real (mouse/teclado) cierran la sesion, con 2
// minutos de aviso previo cancelable. Requerimiento de negocio confirmado en
// discovery, no configurable por ahora (YAGNI: no hay pedido de que varie
// por usuario o entorno).
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
const INACTIVITY_WARNING_MS = 2 * 60 * 1000

export function AuthProvider({ children }) {
  const isMountedRef = useRef(true)

  const [session, setSession] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  // Motivo del ultimo cierre de sesion, para que AdminLoginPage pueda
  // mostrar un aviso ("se cerro por inactividad") en vez de tratarlo como
  // un error de credenciales. Vive aca (no en location.state via navigate)
  // para no competir con el redirect propio de ProtectedRoute cuando
  // isAuthorized pasa a false.
  const [loggedOutReason, setLoggedOutReason] = useState(null)

  const safeSet = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value)
    }
  }, [])

  const fetchStaffProfile = useCallback(async () => {
    try {
      return await apiClient.get('/usuarios/me')
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 401 || error.status === 403)) {
        return null
      }

      throw error
    }
  }, [])

  const applySession = useCallback(
    async (nextSession) => {
      if (!nextSession) {
        safeSet(setSession, null)
        safeSet(setStaffProfile, null)
        return { authorized: false }
      }

      const profile = await fetchStaffProfile()

      if (!profile) {
        await supabase.auth.signOut()
        safeSet(setSession, null)
        safeSet(setStaffProfile, null)
        safeSet(setAuthError, 'Usuario no autorizado')
        return { authorized: false }
      }

      safeSet(setSession, nextSession)
      safeSet(setStaffProfile, profile)
      safeSet(setAuthError, '')
      safeSet(setLoggedOutReason, null)

      return { authorized: true }
    },
    [fetchStaffProfile, safeSet],
  )

  useEffect(() => {
    isMountedRef.current = true

    const initialize = async () => {
      safeSet(setLoading, true)

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        safeSet(setAuthError, error.message)
        safeSet(setSession, null)
        safeSet(setStaffProfile, null)
      } else {
        try {
          await applySession(data.session)
        } catch (sessionError) {
          safeSet(
            setAuthError,
            sessionError instanceof Error ? sessionError.message : 'No se pudo validar el usuario',
          )
          safeSet(setSession, null)
          safeSet(setStaffProfile, null)
        }
      }

      safeSet(setLoading, false)
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        safeSet(setLoading, true)

        try {
          await applySession(nextSession)
        } catch (sessionError) {
          safeSet(
            setAuthError,
            sessionError instanceof Error ? sessionError.message : 'No se pudo validar el usuario',
          )
          safeSet(setSession, null)
          safeSet(setStaffProfile, null)
        }

        safeSet(setLoading, false)
      })()
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [applySession, safeSet])

  const signIn = useCallback(async (email, password) => {
    safeSet(setAuthError, '')
    safeSet(setLoggedOutReason, null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      safeSet(setAuthError, error.message)
      return { success: false, error: error.message }
    }

    return { success: true, error: '' }
  }, [safeSet])

  const logout = useCallback(
    async (reason = null) => {
      safeSet(setAuthError, '')

      try {
        await supabase.auth.signOut()
      } catch (signOutError) {
        // Fail-safe hacia el cierre: si signOut() falla (ej. error de red),
        // igual limpiamos el estado local en vez de dejar la sesion "viva"
        // sin proteccion ni proximo aviso de inactividad. Ver hallazgo de
        // code review: antes, un signOut() rechazado dejaba isAuthorized en
        // true de forma indefinida.
        console.error('No se pudo cerrar la sesion en Supabase Auth:', signOutError)
      }

      safeSet(setSession, null)
      safeSet(setStaffProfile, null)
      safeSet(setLoggedOutReason, reason)
    },
    [safeSet],
  )

  const isAuthorized = Boolean(session && staffProfile)

  const handleInactivityTimeout = useCallback(() => logout('inactivity'), [logout])

  const { warningActive, secondsRemaining, stayActive } = useInactivityTimeout({
    timeoutMs: INACTIVITY_TIMEOUT_MS,
    warningMs: INACTIVITY_WARNING_MS,
    onTimeout: handleInactivityTimeout,
    // Solo corre mientras hay una sesion autorizada activa: evita timers
    // corriendo en la landing publica o en /panel-admin/login, y los apaga
    // apenas el usuario cierra sesion por cualquier otra via.
    enabled: isAuthorized,
  })

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      staffProfile,
      loading,
      authError,
      loggedOutReason,
      isAuthenticated: Boolean(session),
      isAuthorized,
      signIn,
      logout,
    }),
    [authError, isAuthorized, loading, logout, loggedOutReason, session, signIn, staffProfile],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <InactivityWarningModal
        open={isAuthorized && warningActive}
        secondsRemaining={secondsRemaining}
        onStayActive={stayActive}
      />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}