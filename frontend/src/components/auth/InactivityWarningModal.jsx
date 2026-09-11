import { FiAlertTriangle } from 'react-icons/fi'
import { Modal } from '../ui/Modal'

function formatCountdown(seconds) {
  const safeSeconds = Math.max(seconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

// Aviso previo al cierre de sesion por inactividad. `onStayActive` cierra el
// modal reprogramando los timers: no dispara un logout, es el "cancelar" del
// cierre automatico.
export function InactivityWarningModal({ open, secondsRemaining, onStayActive }) {
  return (
    <Modal open={open} title="Tu sesión está por cerrarse" onClose={onStayActive} size="sm">
      <div className="confirm-dialog-body">
        <FiAlertTriangle className="confirm-dialog-icon" aria-hidden="true" />
        <p>
          Tu sesión está por cerrarse por inactividad en{' '}
          <strong>{formatCountdown(secondsRemaining)}</strong>. Movete o tocá una tecla para
          seguir conectado.
        </p>
      </div>

      <div className="form-actions">
        <button type="button" className="primary-btn" onClick={onStayActive}>
          Continuar sesión
        </button>
      </div>
    </Modal>
  )
}
