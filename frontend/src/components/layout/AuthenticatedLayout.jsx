import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FiBox, FiClipboard, FiLogOut, FiMenu, FiMoon, FiSun, FiUsers, FiX } from 'react-icons/fi'
import logo from '../../assets/logo.png'
import { useAuth } from '../../context/AuthContext'
import { ThemeProvider, useTheme } from '../../context/ThemeContext'

const menuItems = [
  { to: '/panel-admin/clientes', label: 'Clientes', icon: FiUsers },
  { to: '/panel-admin/ordenes', label: 'Ordenes de trabajo', icon: FiClipboard },
  { to: '/panel-admin/inventario', label: 'Activos globales', icon: FiBox },
]

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="sidebar-action-btn"
      onClick={toggleTheme}
      aria-pressed={isDark}
      title={isDark ? 'Tema oscuro' : 'Tema claro'}
    >
      {isDark ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}
      <span className="sidebar-action-label">{isDark ? 'Tema oscuro' : 'Tema claro'}</span>
    </button>
  )
}

function AuthenticatedLayoutContent() {
  const { staffProfile, logout } = useAuth()
  const { theme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="auth-shell" data-theme={theme}>
      <aside
        id="panel-sidebar"
        className={mobileNavOpen ? 'sidebar sidebar-open' : 'sidebar'}
        aria-label="Menu del panel"
      >
        <p className="sidebar-title">Panel STC</p>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
              }
            >
              <item.icon aria-hidden="true" />
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggleButton />
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={() => void logout()}
            title="Cerrar sesión"
          >
            <FiLogOut aria-hidden="true" />
            <span className="sidebar-action-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <section className="auth-main">
        <header className="auth-header">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-expanded={mobileNavOpen}
            aria-controls="panel-sidebar"
            aria-label={mobileNavOpen ? 'Cerrar menu' : 'Abrir menu'}
          >
            {mobileNavOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>

          <div className="auth-header-identity">
            <img src={logo} alt="STC" className="brand-logo small header-logo" />
            <div>
              <p className="eyebrow">Acceso interno</p>
              <strong>{staffProfile?.nombre}</strong>
              <p className="auth-email">{staffProfile?.email}</p>
            </div>
          </div>
        </header>

        <main className="auth-content">
          <Outlet />
        </main>
      </section>
    </div>
  )
}

export function AuthenticatedLayout() {
  return (
    <ThemeProvider>
      <AuthenticatedLayoutContent />
    </ThemeProvider>
  )
}