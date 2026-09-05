import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'

export function Modal({ open, title, onClose, children, size }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      return
    }

    // Foco inicial solo dentro del contenido del form: si se incluyera el
    // boton de cerrar del header, un espacio tipeado en el primer campo
    // dispara su click nativo (Space activa un <button> enfocado) y cierra
    // el modal a mitad de la escritura. Corre una sola vez al abrir (no en
    // cada re-render del padre), para no robarle el foco al campo activo
    // mientras el usuario escribe.
    const firstField = bodyRef.current?.querySelector('input, select, textarea, button')
    firstField?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={size ? `modal-card modal-card--${size}` : 'modal-card'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="ghost-btn minimal-btn" aria-label="Cerrar" onClick={onClose}>
            <FiX aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
