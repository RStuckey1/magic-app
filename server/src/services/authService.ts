import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { ApiError } from '../errors/ApiError.js'

export type User = {
  id: string
  email: string
}

export async function register(email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const result = await pool.query<User>(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email',
      [randomUUID(), email, passwordHash],
    )
    return result.rows[0]
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError('An account with that email already exists.', 409)
    }
    throw error
  }
}

export async function login(email: string, password: string): Promise<User> {
  const result = await pool.query<User & { password_hash: string }>(
    'SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
    [email],
  )
  const user = result.rows[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError('Email or password is incorrect.', 401)
  }

  return { id: user.id, email: user.email }
}

export async function getUser(userId: string): Promise<User> {
  const result = await pool.query<User>(
    'SELECT id, email FROM users WHERE id = $1',
    [userId],
  )
  if (!result.rows[0]) throw new ApiError('Your account could not be found.', 401)
  return result.rows[0]
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
