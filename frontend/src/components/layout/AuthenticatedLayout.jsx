import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const menuItems = [
  { to: '/panel-admin/clientes', label: 'Clientes' },
  { to: '/panel-admin/ordenes', label: 'Ordenes de trabajo' },
  { to: '/panel-admin/inventario', label: 'Activos globales' },
]

export function AuthenticatedLayout() {
  const { staffProfile, logout } = useAuth()

  return (
    <div className="auth-shell">
      <aside className="sidebar" aria-label="Menu del panel">
        <p className="sidebar-title">Panel STC</p>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="auth-main">
        <header className="auth-header">
          <div>
            <p className="eyebrow">Acceso interno</p>
            <strong>{staffProfile?.nombre}</strong>
            <p className="auth-email">{staffProfile?.email}</p>
          </div>

          <button type="button" className="logout-btn" onClick={() => void logout()}>
            Cerrar sesion
          </button>
        </header>

        <main className="auth-content">
          <Outlet />
        </main>
      </section>
    </div>
  )
}