import type { Request, Response } from 'express'
import { ApiError } from '../errors/ApiError.js'
import {
  createDecklist as create,
  deleteDecklist as remove,
  listDecklists,
  removeDecklistCard as removeCard,
  renameDecklist as rename,
  setDecklistCard,
} from '../services/decklistService.js'

export async function getDecklists(_request: Request, response: Response) {
  response.json({ decklists: await listDecklists(response.locals.userId) })
}

export async function createDecklist(request: Request, response: Response) {
  const name = readName(request.body)
  response.status(201).json({
    decklist: await create(response.locals.userId, name),
  })
}

export async function renameDecklist(request: Request, response: Response) {
  const name = readName(request.body)
  response.json({
    decklist: await rename(
      response.locals.userId,
      getRouteParam(request, 'decklistId'),
      name,
    ),
  })
}

export async function deleteDecklist(request: Request, response: Response) {
  await remove(response.locals.userId, getRouteParam(request, 'decklistId'))
  response.status(204).end()
}

export async function updateDecklistCard(request: Request, response: Response) {
  const body: unknown = request.body
  if (!body || typeof body !== 'object') {
    throw new ApiError('Card details are required.', 400)
  }

  const { cardName, quantity } = body as Record<string, unknown>
  if (typeof cardName !== 'string' || !cardName.trim()) {
    throw new ApiError('A card name is required.', 400)
  }
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new ApiError('Card quantity must be between 1 and 99.', 400)
  }

  response.json({
    card: await setDecklistCard(
      response.locals.userId,
      getRouteParam(request, 'decklistId'),
      getRouteParam(request, 'cardId'),
      cardName.trim(),
      quantity,
    ),
  })
}

export async function deleteDecklistCard(request: Request, response: Response) {
  await removeCard(
    response.locals.userId,
    getRouteParam(request, 'decklistId'),
    getRouteParam(request, 'cardId'),
  )
  response.status(204).end()
}

function readName(body: unknown) {
  if (!body || typeof body !== 'object' || !('name' in body) || typeof body.name !== 'string') {
    throw new ApiError('A decklist name is required.', 400)
  }
  const name = body.name.trim()
  if (name.length < 1 || name.length > 100) {
    throw new ApiError('Decklist name must be between 1 and 100 characters.', 400)
  }
  return name
}

function getRouteParam(request: Request, name: string) {
  const value = request.params[name]
  if (typeof value !== 'string' || !value) {
    throw new ApiError(`A valid ${name} is required.`, 400)
  }
  if (name === 'decklistId' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError('A valid decklistId is required.', 400)
  }
  return value
}
