import jwt, { type JwtPayload } from 'jsonwebtoken'
import { ApiError } from '../errors/ApiError.js'

const TOKEN_COOKIE = 'auth_token'
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 characters.')
  }
  return secret
}

export function assertJwtConfig() {
  getJwtSecret()
}

export function createAuthToken(userId: string) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' })
}

export function setAuthCookie(response: import('express').Response, userId: string) {
  response.cookie(TOKEN_COOKIE, createAuthToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/api',
  })
}

export function clearAuthCookie(response: import('express').Response) {
  response.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
  })
}

export function getAuthenticatedUserId(token: unknown): string {
  if (typeof token !== 'string') {
    throw new ApiError('You must be signed in to access this resource.', 401)
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload
    if (typeof payload.userId !== 'string') throw new Error('Invalid token subject')
    return payload.userId
  } catch {
    throw new ApiError('Your session is invalid or has expired. Please sign in again.', 401)
  }
}
