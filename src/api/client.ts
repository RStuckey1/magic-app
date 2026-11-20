export class ApiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json()
  if (!response.ok) {
    const message = isErrorPayload(payload) && typeof payload.error === 'string'
      ? payload.error
      : 'The request could not be completed.'
    throw new ApiRequestError(message, response.status)
  }
  return payload as T
}

function isErrorPayload(payload: unknown): payload is { error?: unknown } {
  return typeof payload === 'object' && payload !== null
}
