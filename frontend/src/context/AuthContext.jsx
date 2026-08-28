import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiClient, ApiError } from '../lib/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const isMountedRef = useRef(true)

  const [session, setSession] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

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

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      safeSet(setAuthError, error.message)
      return { success: false, error: error.message }
    }

    return { success: true, error: '' }
  }, [safeSet])

  const logout = useCallback(async () => {
    safeSet(setAuthError, '')
    await supabase.auth.signOut()
    safeSet(setSession, null)
    safeSet(setStaffProfile, null)
  }, [safeSet])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      staffProfile,
      role: staffProfile?.rol ?? null,
      loading,
      authError,
      isAuthenticated: Boolean(session),
      isAuthorized: Boolean(session && staffProfile),
      signIn,
      logout,
    }),
    [authError, loading, logout, session, signIn, staffProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}