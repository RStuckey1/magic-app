import type { Request, Response } from 'express'
import { clearAuthCookie, setAuthCookie } from '../auth/jwt.js'
import { ApiError } from '../errors/ApiError.js'
import { getUser, login, register } from '../services/authService.js'

export async function registerUser(request: Request, response: Response) {
  const { email, password } = readCredentials(request)
  validateCredentials(email, password)

  const user = await register(email.trim().toLowerCase(), password)
  setAuthCookie(response, user.id)
  response.status(201).json({ user })
}

export async function loginUser(request: Request, response: Response) {
  const { email, password } = readCredentials(request)
  validateCredentials(email, password)

  const user = await login(email.trim().toLowerCase(), password)
  setAuthCookie(response, user.id)
  response.json({ user })
}

export function logoutUser(_request: Request, response: Response) {
  clearAuthCookie(response)
  response.status(204).end()
}

export async function currentUser(_request: Request, response: Response) {
  response.json({ user: await getUser(response.locals.userId) })
}

function readCredentials(request: Request): { email: string; password: string } {
  const body: unknown = request.body
  if (!body || typeof body !== 'object') {
    throw new ApiError('Email and password are required.', 400)
  }

  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new ApiError('Email and password are required.', 400)
  }

  return { email, password }
}

function validateCredentials(email: string, password: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ApiError('Enter a valid email address.', 400)
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new ApiError('Password must be between 8 and 72 bytes.', 400)
  }
}
