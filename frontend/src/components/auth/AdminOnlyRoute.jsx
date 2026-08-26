import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AdminOnlyRoute({ children }) {
  const { loading, role } = useAuth()

  if (loading) {
    return (
      <main className="auth-loading">
        <p>Validando acceso...</p>
      </main>
    )
  }

  if (role !== 'admin') {
    return <Navigate to="/panel-admin/clientes" replace />
  }

  return children
}