export class ApiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiRequestError(
      'The API is unreachable. Check that the Express server is running on port 3001.',
      0,
    )
  }

  if (response.status === 204) return undefined as T

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiRequestError(
      'The API returned an empty or invalid response. Check the [api] terminal output.',
      response.status,
    )
  }
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
