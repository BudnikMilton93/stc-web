import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { loading, isAuthorized } = useAuth()

  if (loading) {
    return (
      <main className="auth-loading">
        <p>Validando acceso...</p>
      </main>
    )
  }

  if (!isAuthorized) {
    return <Navigate to="/panel-admin/login" replace />
  }

  return children
}