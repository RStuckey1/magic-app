import type { SearchResponse } from '../../../shared/cards.js'
import { ApiError } from '../errors/ApiError.js'

const SCRYFALL_SEARCH_URL = 'https://api.scryfall.com/cards/search'

export async function searchCards(query: string): Promise<SearchResponse> {
  const url = new URL(SCRYFALL_SEARCH_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('order', 'name')
  return fetchCards(url)
}

export async function getCardPage(pageUrl: string): Promise<SearchResponse> {
  let url: URL
  try {
    url = new URL(pageUrl)
  } catch {
    throw new ApiError('The requested card page URL is invalid.', 400)
  }

  if (
    url.origin !== 'https://api.scryfall.com'
    || url.pathname !== '/cards/search'
    || url.username
    || url.password
  ) {
    throw new ApiError('The requested card page URL is not supported.', 400)
  }

  return fetchCards(url)
}

async function fetchCards(url: URL): Promise<SearchResponse> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new ApiError('Scryfall could not be reached. Please try again.', 502)
  }

  if (response.status === 404) {
    return { data: [], has_more: false, total_cards: 0 }
  }

  const payload = await response.json() as SearchResponse | { details?: string }
  if (!response.ok) {
    const message = 'details' in payload && payload.details
      ? payload.details
      : 'The card search could not be completed.'
    throw new ApiError(message, 502)
  }

  return payload as SearchResponse
}
