import { useCallback, useEffect, useRef, useState } from 'react'

// Solo interaccion real de mouse/teclado cuenta como actividad (ver
// requerimiento del cierre de sesion por inactividad): deliberadamente no
// incluye 'visibilitychange' ni 'focus' porque volver a la pestaña sin
// interactuar no debe resetear el contador.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel']

// Los listeners de actividad (sobre todo mousemove) pueden dispararse decenas
// de veces por segundo. Escribir en un ref no re-renderiza, pero igual se
// throttlea la reprogramacion de los timers para no llamar clearTimeout/
// setTimeout en cada evento.
const ACTIVITY_THROTTLE_MS = 1000

/**
 * Cierra sesion automaticamente tras `timeoutMs` de inactividad real
 * (mouse/teclado), avisando `warningMs` antes del cierre para que el usuario
 * pueda cancelarlo interactuando con la pagina.
 *
 * No depende de ninguna libreria de terceros: setTimeout nativo alcanza para
 * este caso y evita sumar una dependencia solo para debounce/throttle.
 */
export function useInactivityTimeout({ timeoutMs, warningMs, onTimeout, enabled = true }) {
  const [warningActive, setWarningActive] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(warningMs / 1000))

  const warningTimerRef = useRef(null)
  const timeoutTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const lastResetAtRef = useRef(0)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const clearTimers = useCallback(() => {
    clearTimeout(warningTimerRef.current)
    clearTimeout(timeoutTimerRef.current)
    clearInterval(countdownIntervalRef.current)
  }, [])

  const scheduleTimers = useCallback(() => {
    clearTimers()
    setWarningActive(false)
    setSecondsRemaining(Math.ceil(warningMs / 1000))

    const warningDelay = Math.max(timeoutMs - warningMs, 0)

    warningTimerRef.current = setTimeout(() => {
      setWarningActive(true)

      let remaining = Math.ceil(warningMs / 1000)
      setSecondsRemaining(remaining)

      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1
        setSecondsRemaining(Math.max(remaining, 0))
      }, 1000)
    }, warningDelay)

    timeoutTimerRef.current = setTimeout(() => {
      clearTimers()
      onTimeoutRef.current?.()
    }, timeoutMs)
  }, [clearTimers, timeoutMs, warningMs])

  // Reinicia los timers ignorando el throttle: lo usa el modal de aviso para
  // que "Continuar sesión" tenga efecto inmediato.
  const stayActive = useCallback(() => {
    lastResetAtRef.current = Date.now()
    scheduleTimers()
  }, [scheduleTimers])

  const registerActivity = useCallback(() => {
    const now = Date.now()

    if (now - lastResetAtRef.current < ACTIVITY_THROTTLE_MS) {
      return
    }

    lastResetAtRef.current = now
    scheduleTimers()
  }, [scheduleTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      setWarningActive(false)
      return undefined
    }

    stayActive()

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, registerActivity, { passive: true })
    })

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, registerActivity)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { warningActive, secondsRemaining, stayActive }
}
