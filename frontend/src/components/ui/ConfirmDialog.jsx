import { FiAlertTriangle } from 'react-icons/fi'
import { Modal } from './Modal'

// Dialogo de confirmacion generico para acciones reversibles-pero-disruptivas
// (dar de baja, etc.), reemplazo de window.confirm: permite mostrar el error
// de la request sin perder el contexto de la confirmacion (con window.confirm
// el error solo se veia si por casualidad habia otro modal abierto) y deja el
// dialogo abierto en estado "procesando" mientras la request esta en vuelo.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <div className="confirm-dialog-body">
        <FiAlertTriangle className="confirm-dialog-icon" aria-hidden="true" />
        <p>{message}</p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="button" className="ghost-btn" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        <button type="button" className="danger-btn" onClick={onConfirm} disabled={loading}>
          {loading ? 'Procesando...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
