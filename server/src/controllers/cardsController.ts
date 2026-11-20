import type { Request, Response } from 'express'
import {
  getCardById as fetchCardById,
  getCardPage as fetchCardPage,
  searchCards as fetchCards,
} from '../services/scryfallService.js'
import { ApiError } from '../errors/ApiError.js'

export async function searchCards(request: Request, response: Response) {
  const query = request.query.q
  if (typeof query !== 'string' || !query.trim()) {
    throw new ApiError('A card search query is required.', 400)
  }

  response.json(await fetchCards(query))
}

export async function getCardById(request: Request, response: Response) {
  const cardId = request.params.cardId
  if (
    typeof cardId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId)
  ) {
    throw new ApiError('A valid card ID is required.', 400)
  }

  response.json(await fetchCardById(cardId))
}

export async function getCardPage(request: Request, response: Response) {
  const pageUrl = request.query.url
  if (typeof pageUrl !== 'string' || !pageUrl) {
    throw new ApiError('A card page URL is required.', 400)
  }

  response.json(await fetchCardPage(pageUrl))
}
