import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../lib/apiClient'
import { InventarioPage } from './InventarioPage'

vi.mock('../../../lib/apiClient', async () => {
  const actual = await vi.importActual('../../../lib/apiClient')
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  }
})

describe('InventarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.get.mockImplementation((path) => {
      if (path === '/activos') {
        return Promise.resolve([{ id: '1', tipo: 'camara', estado: 'operativo' }])
      }
      return Promise.resolve([])
    })
  })

  it('renderiza sin lanzar ReferenceError y muestra el label legible del tipo de activo', async () => {
    render(<InventarioPage />)

    expect(await screen.findByText('Cámara')).toBeInTheDocument()
  })
})
