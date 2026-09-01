import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout'
import { AdminLoginPage } from './features/auth/pages/AdminLoginPage'
import { ClienteDetailPage } from './features/clientes/pages/ClienteDetailPage'
import { ClientesPage } from './features/clientes/pages/ClientesPage'
import { InventarioPage } from './features/inventario/pages/InventarioPage'
import { OrdenesPage } from './features/ordenes/pages/OrdenesPage'
import { SitioDetailPage } from './features/clientes/pages/SitioDetailPage'
import { UnidadDetailPage } from './features/clientes/pages/UnidadDetailPage'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/panel-admin/login" element={<AdminLoginPage />} />

      <Route
        path="/panel-admin"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="clientes" replace />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="clientes/:clienteId" element={<ClienteDetailPage />} />
        <Route path="clientes/:clienteId/sitios/:sitioId" element={<SitioDetailPage />} />
        <Route
          path="clientes/:clienteId/sitios/:sitioId/unidades/:unidadId"
          element={<UnidadDetailPage />}
        />
        <Route path="ordenes" element={<OrdenesPage />} />
        <Route path="inventario" element={<InventarioPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App