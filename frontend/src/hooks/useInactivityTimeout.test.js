import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInactivityTimeout } from './useInactivityTimeout'

const TIMEOUT_MS = 30_000
const WARNING_MS = 10_000

function dispatchKeydown() {
  window.dispatchEvent(new KeyboardEvent('keydown'))
}

describe('useInactivityTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no arranca los timers cuando enabled es false', () => {
    const onTimeout = vi.fn()
    renderHook(() =>
      useInactivityTimeout({ timeoutMs: TIMEOUT_MS, warningMs: WARNING_MS, onTimeout, enabled: false }),
    )

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS + 1000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('muestra el aviso warningMs antes del timeout y despues llama a onTimeout', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useInactivityTimeout({ timeoutMs: TIMEOUT_MS, warningMs: WARNING_MS, onTimeout, enabled: true }),
    )

    expect(result.current.warningActive).toBe(false)

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - WARNING_MS)
    })
    expect(result.current.warningActive).toBe(true)
    expect(onTimeout).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(WARNING_MS)
    })
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('un evento de mouse/teclado reinicia el contador y evita el timeout', () => {
    const onTimeout = vi.fn()
    renderHook(() =>
      useInactivityTimeout({ timeoutMs: TIMEOUT_MS, warningMs: WARNING_MS, onTimeout, enabled: true }),
    )

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - WARNING_MS)
    })

    act(() => {
      dispatchKeydown()
    })

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - WARNING_MS - 1000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('stayActive cierra el aviso y reprograma los timers', () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useInactivityTimeout({ timeoutMs: TIMEOUT_MS, warningMs: WARNING_MS, onTimeout, enabled: true }),
    )

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - WARNING_MS)
    })
    expect(result.current.warningActive).toBe(true)

    act(() => {
      result.current.stayActive()
    })
    expect(result.current.warningActive).toBe(false)

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_MS - 1000)
    })
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
