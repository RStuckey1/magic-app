import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { ApiRequestError, apiRequest } from '../api/client'
import { getCardById, searchCards } from '../api/cards'
import type { ScryfallCard } from '../../shared/cards'

type User = { id: string; email: string }
type DeckCard = { cardId: string; cardName: string; quantity: number }
type Decklist = {
  id: string
  name: string
  cards: DeckCard[]
}
type CardPreview = {
  cardId: string
  cardName: string
  image: string | null
  loading: boolean
  error: string
  left: number
  top: number
}

export default function AccountDecklists() {
  const [user, setUser] = useState<User | null>(null)
  const [decklists, setDecklists] = useState<Decklist[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [deckName, setDeckName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cardSearchText, setCardSearchText] = useState('')
  const [cardSearchQuery, setCardSearchQuery] = useState('')
  const [cardSearchResults, setCardSearchResults] = useState<ScryfallCard[]>([])
  const [cardSearchLoading, setCardSearchLoading] = useState(false)
  const [cardSearchError, setCardSearchError] = useState('')
  const [cardPreview, setCardPreview] = useState<CardPreview | null>(null)
  const cardSearchController = useRef<AbortController | null>(null)
  const cardPreviewController = useRef<AbortController | null>(null)
  const cardImageCache = useRef(new Map<string, string | null>())

  useEffect(() => {
    let active = true
    void apiRequest<{ user: User }>('/api/auth/me')
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser)
      })
      .catch((requestError: unknown) => {
        if (active && !(requestError instanceof ApiRequestError && requestError.status === 401)) {
          setError(errorMessage(requestError))
        }
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return

    let active = true
    void apiRequest<{ decklists: Decklist[] }>('/api/decklists')
      .then(({ decklists: lists }) => {
        if (active) {
          setDecklists(lists)
          setSelectedDeckId((current) =>
            lists.some((decklist) => decklist.id === current)
              ? current
              : lists[0]?.id ?? '',
          )
        }
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorMessage(requestError))
      })
    return () => { active = false }
  }, [user])

  useEffect(() => () => {
    cardSearchController.current?.abort()
    cardPreviewController.current?.abort()
  }, [])

  const selectedDeck = decklists.find((decklist) => decklist.id === selectedDeckId)

  async function searchForCards(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = cardSearchText.trim()
    setCardSearchQuery(query)
    if (!query) {
      cardSearchController.current?.abort()
      cardSearchController.current = null
      setCardSearchResults([])
      setCardSearchError('')
      setCardSearchLoading(false)
      return
    }

    cardSearchController.current?.abort()
    const controller = new AbortController()
    cardSearchController.current = controller
    setCardSearchLoading(true)
    setCardSearchError('')
    setCardSearchResults([])

    try {
      const { data } = await searchCards(query, controller.signal)
      if (!controller.signal.aborted) setCardSearchResults(data)
    } catch (requestError) {
      if (!controller.signal.aborted) setCardSearchError(errorMessage(requestError))
    } finally {
      if (!controller.signal.aborted) {
        setCardSearchLoading(false)
        cardSearchController.current = null
      }
    }
  }

  function closeCardPreview() {
    cardPreviewController.current?.abort()
    cardPreviewController.current = null
    setCardPreview(null)
  }

  async function toggleCardPreview(
    event: MouseEvent<HTMLButtonElement>,
    card: DeckCard,
  ) {
    if (cardPreview?.cardId === card.cardId) {
      closeCardPreview()
      return
    }

    cardPreviewController.current?.abort()
    const bounds = event.currentTarget.getBoundingClientRect()
    const previewWidth = 164
    const previewHeight = 250
    const gap = 8
    const left = bounds.right + previewWidth + gap <= window.innerWidth
      ? bounds.right + gap
      : Math.max(gap, bounds.left - previewWidth - gap)
    const top = Math.min(
      Math.max(gap, bounds.top),
      Math.max(gap, window.innerHeight - previewHeight - gap),
    )
    const cached = cardImageCache.current.get(card.cardId)
    const hasCachedImage = cardImageCache.current.has(card.cardId)
    setCardPreview({
      cardId: card.cardId,
      cardName: card.cardName,
      image: cached ?? null,
      loading: !hasCachedImage,
      error: '',
      left,
      top,
    })
    if (hasCachedImage) return

    const controller = new AbortController()
    cardPreviewController.current = controller
    try {
      const cardData = await getCardById(card.cardId, controller.signal)
      const image = cardImage(cardData)
      cardImageCache.current.set(card.cardId, image)
      if (!controller.signal.aborted) {
        setCardPreview((current) => current?.cardId === card.cardId
          ? { ...current, image, loading: false }
          : current)
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setCardPreview((current) => current?.cardId === card.cardId
          ? { ...current, loading: false, error: errorMessage(requestError) }
          : current)
      }
    } finally {
      if (!controller.signal.aborted) cardPreviewController.current = null
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const path = isRegistering ? '/api/auth/register' : '/api/auth/login'
      const result = await apiRequest<{ user: User }>(path, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(result.user)
      setPassword('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    setError('')
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
      closeCardPreview()
      setUser(null)
      setDecklists([])
      setSelectedDeckId('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function createDecklist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ decklist: Decklist }>('/api/decklists', {
        method: 'POST',
        body: JSON.stringify({ name: deckName }),
      })
      setDecklists((current) => [result.decklist, ...current])
      setSelectedDeckId(result.decklist.id)
      setDeckName('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function renameDecklist() {
    if (!selectedDeck) return
    const name = window.prompt('New decklist name', selectedDeck.name)?.trim()
    if (!name || name === selectedDeck.name) return
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ decklist: { id: string; name: string } }>(
        `/api/decklists/${selectedDeck.id}`,
        { method: 'PATCH', body: JSON.stringify({ name }) },
      )
      setDecklists((current) => current.map((decklist) =>
        decklist.id === result.decklist.id
          ? { ...decklist, name: result.decklist.name }
          : decklist,
      ))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function deleteDecklist() {
    if (!selectedDeck) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/decklists/${selectedDeck.id}`, { method: 'DELETE' })
      closeCardPreview()
      setDecklists((current) => current.filter((decklist) => decklist.id !== selectedDeck.id))
      setSelectedDeckId('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function saveCard(card: Pick<ScryfallCard, 'id' | 'name'>, quantity: number) {
    if (!selectedDeck) return
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ card: DeckCard }>(
        `/api/decklists/${selectedDeck.id}/cards/${encodeURIComponent(card.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ cardName: card.name, quantity }),
        },
      )
      setDecklists((current) => current.map((decklist) => {
        if (decklist.id !== selectedDeck.id) return decklist
        const existing = decklist.cards.some((item) => item.cardId === result.card.cardId)
        return {
          ...decklist,
          cards: existing
            ? decklist.cards.map((item) => item.cardId === result.card.cardId ? result.card : item)
            : [...decklist.cards, result.card],
        }
      }))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function removeCard(cardId: string) {
    if (!selectedDeck) return
    if (cardPreview?.cardId === cardId) closeCardPreview()
    setBusy(true)
    setError('')
    try {
      await apiRequest(
        `/api/decklists/${selectedDeck.id}/cards/${encodeURIComponent(cardId)}`,
        { method: 'DELETE' },
      )
      setDecklists((current) => current.map((decklist) =>
        decklist.id === selectedDeck.id
          ? { ...decklist, cards: decklist.cards.filter((card) => card.cardId !== cardId) }
          : decklist,
      ))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="decks-panel" aria-label="Account and decklists">
      <div className="decks-heading">
        <div>
          <p className="eyebrow">YOUR COLLECTION</p>
          <h2>Saved decklists</h2>
        </div>
        {user && (
          <div className="account-actions">
            <span>{user.email}</span>
            <button type="button" onClick={() => void logout()} disabled={busy}>Sign out</button>
          </div>
        )}
      </div>

      {!user ? (
        <form className="auth-form" onSubmit={(event) => void handleAuth(event)}>
          <p>Sign in or create an account to save decklists.</p>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
          <button className="text-button" type="button" onClick={() => setIsRegistering((current) => !current)}>
            {isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
        </form>
      ) : (
        <>
          <form className="deck-create-form" onSubmit={(event) => void createDecklist(event)}>
            <input
              aria-label="New decklist name"
              placeholder="New decklist name"
              maxLength={100}
              required
              value={deckName}
              onChange={(event) => setDeckName(event.target.value)}
            />
            <button type="submit" disabled={busy}>Create decklist</button>
          </form>

          {decklists.length > 0 && (
            <div className="deck-editor">
              <div className="deck-selector">
                <label>
                  Decklist
                  <select
                    value={selectedDeckId}
                    onChange={(event) => {
                      closeCardPreview()
                      setSelectedDeckId(event.target.value)
                    }}
                  >
                    {decklists.map((decklist) => (
                      <option key={decklist.id} value={decklist.id}>{decklist.name}</option>
                    ))}
                  </select>
                </label>
                {selectedDeck && (
                  <div className="deck-actions">
                    <button type="button" onClick={() => void renameDecklist()} disabled={busy}>Rename</button>
                    <button type="button" onClick={() => void deleteDecklist()} disabled={busy}>Delete</button>
                  </div>
                )}
              </div>

              {selectedDeck && (
                <div className="deck-content">
                  <div>
                    <h3>{selectedDeck.name}</h3>
                    {selectedDeck.cards.length === 0 ? (
                      <p className="deck-empty">This decklist is empty. Add a card from the search results.</p>
                    ) : (
                      <ul className="deck-card-list">
                        {selectedDeck.cards.map((card) => (
                          <li key={card.cardId} onMouseLeave={closeCardPreview}>
                            <button
                              className="deck-card-name"
                              type="button"
                              aria-expanded={cardPreview?.cardId === card.cardId}
                              aria-describedby={cardPreview?.cardId === card.cardId
                                ? `card-preview-${card.cardId}`
                                : undefined}
                              onClick={(event) => void toggleCardPreview(event, card)}
                            >
                              {card.quantity}× {card.cardName}
                            </button>
                            <div>
                              <button
                                type="button"
                                aria-label={`Decrease ${card.cardName} quantity`}
                                disabled={busy}
                                onClick={() => card.quantity === 1
                                  ? void removeCard(card.cardId)
                                  : void saveCard(
                                    { id: card.cardId, name: card.cardName },
                                    card.quantity - 1,
                                  )}
                              >−</button>
                              <button
                                type="button"
                                aria-label={`Increase ${card.cardName} quantity`}
                                disabled={busy || card.quantity >= 99}
                                onClick={() => void saveCard(
                                  { id: card.cardId, name: card.cardName },
                                  card.quantity + 1,
                                )}
                              >+</button>
                              <button type="button" onClick={() => void removeCard(card.cardId)} disabled={busy}>
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="add-cards">
                    <h3>Search cards to add</h3>
                    <form className="deck-card-search" onSubmit={(event) => void searchForCards(event)} role="search">
                      <input
                        aria-label="Search cards for this decklist"
                        placeholder="Card name or Scryfall search"
                        value={cardSearchText}
                        onChange={(event) => setCardSearchText(event.target.value)}
                      />
                      <button type="submit" disabled={cardSearchLoading}>
                        {cardSearchLoading ? 'Searching…' : 'Search'}
                      </button>
                    </form>
                    {cardSearchError && <p className="account-error" role="alert">{cardSearchError}</p>}
                    {!cardSearchError && cardSearchLoading ? (
                      <p className="deck-empty">Searching cards…</p>
                    ) : !cardSearchError && cardSearchResults.length === 0 ? (
                      <p className="deck-empty">
                        {cardSearchQuery ? 'No cards found. Try a different search.' : 'Search for cards to add them to this decklist.'}
                      </p>
                    ) : !cardSearchError && (
                      <ul className="deck-card-list">
                        {cardSearchResults.map((card) => {
                          const existing = selectedDeck.cards.find((item) => item.cardId === card.id)
                          return (
                            <li key={card.id}>
                              <span>{card.name}{existing ? ` (${existing.quantity})` : ''}</span>
                              <button
                                type="button"
                                disabled={busy || (existing?.quantity ?? 0) >= 99}
                                onClick={() => void saveCard(card, (existing?.quantity ?? 0) + 1)}
                              >Add</button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {cardPreview && (
                <div
                  className="card-preview-tooltip"
                  id={`card-preview-${cardPreview.cardId}`}
                  role="tooltip"
                  style={{ left: cardPreview.left, top: cardPreview.top }}
                >
                  {cardPreview.loading ? (
                    <span>Loading card…</span>
                  ) : cardPreview.error ? (
                    <span>{cardPreview.error}</span>
                  ) : cardPreview.image ? (
                    <img src={cardPreview.image} alt={cardPreview.cardName} />
                  ) : (
                    <span>Image unavailable</span>
                  )}
                </div>
              )}
            </div>
          )}
          {decklists.length === 0 && <p className="deck-empty">Create your first decklist above.</p>}
        </>
      )}

      {error && <p className="account-error" role="alert">{error}</p>}
    </section>
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

function cardImage(card: ScryfallCard) {
  return card.image_uris?.small
    ?? card.card_faces?.[0]?.image_uris?.small
    ?? card.image_uris?.normal
    ?? card.card_faces?.[0]?.image_uris?.normal
    ?? null
}
