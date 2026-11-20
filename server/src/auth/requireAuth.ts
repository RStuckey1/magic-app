import type { NextFunction, Request, Response } from 'express'
import { getAuthenticatedUserId } from './jwt.js'

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    response.locals.userId = getAuthenticatedUserId(request.cookies?.auth_token)
    next()
  } catch (error) {
    next(error)
  }
}
