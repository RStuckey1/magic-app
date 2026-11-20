import type { SearchResponse } from '../../shared/cards'

async function requestCards(path: string, signal?: AbortSignal): Promise<SearchResponse> {
  const response = await fetch(path, { signal })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || 'The card search could not be completed.')
  }

  return payload as SearchResponse
}

export function searchCards(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query })
  return requestCards(`/api/cards/search?${params}`, signal)
}

export function getCardPage(nextPage: string) {
  const params = new URLSearchParams({ url: nextPage })
  return requestCards(`/api/cards/page?${params}`)
}
