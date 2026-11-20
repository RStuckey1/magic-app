import { useEffect, useState, type FormEvent } from 'react'
import { ApiRequestError, apiRequest } from '../api/client'
import type { ScryfallCard } from '../../shared/cards'

type User = { id: string; email: string }
type DeckCard = { cardId: string; cardName: string; quantity: number }
type Decklist = {
  id: string
  name: string
  cards: DeckCard[]
}

type AccountDecklistsProps = {
  cards: ScryfallCard[]
}

export default function AccountDecklists({ cards }: AccountDecklistsProps) {
  const [user, setUser] = useState<User | null>(null)
  const [decklists, setDecklists] = useState<Decklist[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [deckName, setDeckName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  const selectedDeck = decklists.find((decklist) => decklist.id === selectedDeckId)

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
                  <select value={selectedDeckId} onChange={(event) => setSelectedDeckId(event.target.value)}>
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
                          <li key={card.cardId}>
                            <span>{card.quantity}× {card.cardName}</span>
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
                    <h3>Add from search results</h3>
                    {cards.length === 0 ? (
                      <p className="deck-empty">Search for cards to add them to this decklist.</p>
                    ) : (
                      <ul className="deck-card-list">
                        {cards.map((card) => {
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
