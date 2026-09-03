import { Link } from 'react-router-dom'
import { FiChevronRight } from 'react-icons/fi'

// items: [{ label, to }]. El ultimo item se muestra como texto plano (pagina
// actual, sin link); los anteriores son navegables.
export function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Miga de pan">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span className="breadcrumb-item" key={item.to ?? item.label}>
            {isLast || !item.to ? (
              <span className="breadcrumb-current" aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            ) : (
              <Link className="breadcrumb-link" to={item.to}>
                {item.label}
              </Link>
            )}
            {!isLast ? <FiChevronRight aria-hidden="true" className="breadcrumb-separator" /> : null}
          </span>
        )
      })}
    </nav>
  )
}
