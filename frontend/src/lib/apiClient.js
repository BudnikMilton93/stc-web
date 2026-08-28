import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error('Missing VITE_API_URL environment variable')
}

/**
 * Error generico para respuestas no exitosas de la API.
 * Por ahora expone el status y el body crudo (texto o JSON, segun lo que
 * haya devuelto el servidor); el mapeo a mensajes especificos por tipo de
 * error se resuelve en un paso posterior.
 */
export class ApiError extends Error {
  constructor(status, body, message) {
    super(message || `La API respondio con el estado ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseBody(response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function request(path, { method = 'GET', body, headers, signal } = {}) {
  const authHeader = await getAuthHeader()

  const response = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const responseBody = await parseBody(response)

  if (!response.ok) {
    const message = typeof responseBody === 'string' ? responseBody : responseBody?.title || responseBody?.message

    throw new ApiError(response.status, responseBody, message)
  }

  return responseBody
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
