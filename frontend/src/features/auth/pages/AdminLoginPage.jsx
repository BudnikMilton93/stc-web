import { useEffect, useLayoutEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import logo from '../../../assets/logo.png'
import { useAuth } from '../../../context/AuthContext'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { isAuthorized, isAuthenticated, loading, authError, loggedOutReason, signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  // Mensaje de seguridad (no de error) cuando llegamos aca porque
  // useInactivityTimeout cerro la sesion, no por una credencial invalida.
  const loggedOutByInactivity = loggedOutReason === 'inactivity'

  useEffect(() => {
    if (isAuthorized) {
      navigate('/panel-admin/clientes', { replace: true })
    }
  }, [isAuthorized, navigate])

  useLayoutEffect(() => {
    // El login es claro por defecto (no tiene switch propio): reutiliza las
    // mismas variables de tema claro que index.css ya define para el panel
    // admin bajo `body[data-theme='light']` (ver ThemeContext).
    document.body.dataset.theme = 'light'

    return () => {
      delete document.body.dataset.theme
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const result = await signIn(email, password)

    if (!result.success) {
      setFormError(result.error)
    }
  }

  if (isAuthenticated && !isAuthorized && loading) {
    return (
      <main className="auth-loading">
        <p>Validando acceso...</p>
      </main>
    )
  }

  if (isAuthorized) {
    return <Navigate to="/panel-admin/clientes" replace />
  }

  return (
    <main className="page page-login">
      <section className="login-card" aria-label="Acceso administrador">
        <img src={logo} alt="STC" className="brand-logo small" />
        <h1>Administrador</h1>
        <p>Acceso interno para staff activo. Inicia sesión con tu cuenta corporativa.</p>

        {loggedOutByInactivity && (
          <p className="form-notice">
            Tu sesión se cerró automáticamente por inactividad. Ingresá de nuevo para continuar.
          </p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email corporativo</label>
          <input
            id="email"
            type="email"
            placeholder="admin@stc.local"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {(formError || authError) && <p className="form-error">{formError || authError}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}