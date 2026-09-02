import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

const { apiClient, ApiError } = await import('./apiClient')

function mockSession(token) {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: token ? { access_token: token } : null },
  })
}

function mockFetchResponse({ ok = true, status = 200, text = '' } = {}) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(text),
  })
}

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authorization header', () => {
    it('agrega el header Authorization cuando hay una sesion activa', async () => {
      mockSession('token-activo-123')
      mockFetchResponse({ text: '{}' })

      await apiClient.get('/clientes')

      const [, requestInit] = global.fetch.mock.calls[0]
      expect(requestInit.headers.Authorization).toBe('Bearer token-activo-123')
    })

    it('omite el header Authorization cuando no hay sesion activa', async () => {
      mockSession(null)
      mockFetchResponse({ text: '{}' })

      await apiClient.get('/clientes')

      const [, requestInit] = global.fetch.mock.calls[0]
      expect(requestInit.headers.Authorization).toBeUndefined()
    })
  })

  describe('parseBody (via get/post)', () => {
    it('parsea un body JSON valido', async () => {
      mockSession(null)
      mockFetchResponse({ text: '{"id":"1","nombre":"Cliente Uno"}' })

      const result = await apiClient.get('/clientes/1')

      expect(result).toEqual({ id: '1', nombre: 'Cliente Uno' })
    })

    it('devuelve el texto plano cuando el body no es JSON', async () => {
      mockSession(null)
      mockFetchResponse({ text: 'pong' })

      const result = await apiClient.get('/ping')

      expect(result).toBe('pong')
    })

    it('devuelve null cuando el body esta vacio (204/sin contenido)', async () => {
      mockSession(null)
      mockFetchResponse({ status: 204, text: '' })

      const result = await apiClient.delete('/clientes/1')

      expect(result).toBeNull()
    })
  })

  describe('respuestas no-2xx', () => {
    it('lanza ApiError con status/body/message tomando "title" del JSON de error', async () => {
      mockSession(null)
      mockFetchResponse({ ok: false, status: 400, text: '{"title":"Datos invalidos"}' })

      await expect(apiClient.get('/clientes')).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        body: { title: 'Datos invalidos' },
        message: 'Datos invalidos',
      })
    })

    it('lanza ApiError tomando "message" del JSON de error si no hay "title"', async () => {
      mockSession(null)
      mockFetchResponse({ ok: false, status: 422, text: '{"message":"No se pudo procesar"}' })

      await expect(apiClient.get('/clientes')).rejects.toMatchObject({
        name: 'ApiError',
        status: 422,
        body: { message: 'No se pudo procesar' },
        message: 'No se pudo procesar',
      })
    })

    it('lanza ApiError usando el texto crudo si el body de error no es JSON', async () => {
      mockSession(null)
      mockFetchResponse({ ok: false, status: 500, text: 'Internal Server Error' })

      await expect(apiClient.get('/clientes')).rejects.toMatchObject({
        name: 'ApiError',
        status: 500,
        body: 'Internal Server Error',
        message: 'Internal Server Error',
      })

      expect(apiClient.get('/clientes')).rejects.toBeInstanceOf(ApiError)
    })
  })

  describe('serializacion de body y Content-Type', () => {
    it('post serializa el body como JSON y agrega Content-Type', async () => {
      mockSession(null)
      mockFetchResponse({ text: '{}' })

      await apiClient.post('/clientes', { nombre: 'Nuevo' })

      const [, requestInit] = global.fetch.mock.calls[0]
      expect(requestInit.method).toBe('POST')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify({ nombre: 'Nuevo' }))
    })

    it('put serializa el body como JSON y agrega Content-Type', async () => {
      mockSession(null)
      mockFetchResponse({ text: '{}' })

      await apiClient.put('/clientes/1', { nombre: 'Editado' })

      const [, requestInit] = global.fetch.mock.calls[0]
      expect(requestInit.method).toBe('PUT')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify({ nombre: 'Editado' }))
    })

    it('patch serializa el body como JSON y agrega Content-Type', async () => {
      mockSession(null)
      mockFetchResponse({ text: '{}' })

      await apiClient.patch('/clientes/1', { nombre: 'Parcial' })

      const [, requestInit] = global.fetch.mock.calls[0]
      expect(requestInit.method).toBe('PATCH')
      expect(requestInit.headers['Content-Type']).toBe('application/json')
      expect(requestInit.body).toBe(JSON.stringify({ nombre: 'Parcial' }))
    })

    it('get no manda body ni Content-Type', async () => {
      mockSession(null)
      mockFetchResponse({ text: '{}' })

      await apiClient.get('/clientes')

      const [, requestInit] = global.fetch.mock.calls[0]
      expect(requestInit.method).toBe('GET')
      expect(requestInit.body).toBeUndefined()
      expect(requestInit.headers['Content-Type']).toBeUndefined()
    })

    it('delete no manda body ni Content-Type', async () => {
      mockSession(null)
      mockFetchResponse({ text: '{}' })

      await apiClient.delete('/clientes/1')

      const [, requestInit] = global.fetch.mock.calls[0]
      expect(requestInit.method).toBe('DELETE')
      expect(requestInit.body).toBeUndefined()
      expect(requestInit.headers['Content-Type']).toBeUndefined()
    })
  })
})
