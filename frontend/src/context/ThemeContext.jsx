import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'stc-panel-theme'
const DEFAULT_THEME = 'dark'

const ThemeContext = createContext(null)

function readStoredTheme() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
}

/**
 * Tema claro/oscuro del panel admin (/panel-admin/*). No afecta a la landing
 * publica ni al login: el atributo data-theme se aplica solo al contenedor
 * .auth-shell de AuthenticatedLayout, y el CSS scopea las reglas del tema
 * oscuro a `.auth-shell[data-theme="dark"]` (ver index.css).
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme)

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  useLayoutEffect(() => {
    // Los modales se renderizan via createPortal a document.body, fuera del
    // arbol de .auth-shell, asi que no heredan sus variables CSS de tema por
    // ancestria normal. Reflejar el tema tambien en <body> (solo mientras el
    // panel esta montado; se limpia al desmontar) permite que index.css
    // scopee las mismas reglas a `body[data-theme]` sin afectar landing ni
    // login, que nunca montan este provider. useLayoutEffect (no useEffect)
    // para que quede sincronizado con el data-theme de .auth-shell antes del
    // primer paint, evitando un flash con el tema equivocado si un modal se
    // abriera de inmediato.
    document.body.dataset.theme = theme

    return () => {
      delete document.body.dataset.theme
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }

  return context
}
