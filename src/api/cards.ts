import { apiRequest } from './client'
import type { ScryfallCard, SearchResponse } from '../../shared/cards'

export function searchCards(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query })
  return apiRequest<SearchResponse>(`/api/cards/search?${params}`, { signal })
}

export function getCardById(cardId: string, signal?: AbortSignal) {
  return apiRequest<ScryfallCard>(`/api/cards/${encodeURIComponent(cardId)}`, { signal })
}

export function getCardPage(nextPage: string) {
  const params = new URLSearchParams({ url: nextPage })
  return apiRequest<SearchResponse>(`/api/cards/page?${params}`)
}
