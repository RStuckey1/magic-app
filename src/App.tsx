import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getCardPage, searchCards } from './api/cards'
import AccountDecklists from './components/AccountDecklists'
import type { ScryfallCard } from '../shared/cards'
import './App.css'

const colors = [
  { code: 'W', label: 'White', className: 'white' },
  { code: 'U', label: 'Blue', className: 'blue' },
  { code: 'B', label: 'Black', className: 'black' },
  { code: 'R', label: 'Red', className: 'red' },
  { code: 'G', label: 'Green', className: 'green' },
]

const rarities = ['common', 'uncommon', 'rare', 'mythic']
const quickSearches = ['Legendary creatures', 'Instant spells', 'Dragons', 'Artifacts']

function cardImage(card: ScryfallCard) {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
}

function displayPrice(price: string | null) {
  return price ? `$${Number(price).toFixed(2)}` : '—'
}

function App() {
  const [searchText, setSearchText] = useState('')
  const [submittedText, setSubmittedText] = useState('')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedRarity, setSelectedRarity] = useState('')
  const [results, setResults] = useState<ScryfallCard[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [nextPage, setNextPage] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const searchId = useRef(0)

  const makeQuery = () => {
    const terms = [submittedText.trim() || 't:creature']
    if (selectedColors.length) terms.push(`id:${selectedColors.join('')}`)
    if (selectedRarity) terms.push(`r:${selectedRarity}`)
    return terms.join(' ')
  }

  const query = makeQuery()

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++searchId.current

    async function search() {
      setLoading(true)
      setLoadingMore(false)
      setError('')
      setResults([])
      setNextPage(undefined)

      try {
        const data = await searchCards(query, controller.signal)
        if (requestId === searchId.current) {
          setResults(data.data)
          setTotalCards(data.total_cards)
          setNextPage(data.next_page)
        }
      } catch (requestError) {
        if (controller.signal.aborted) return
        if (requestId === searchId.current) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Something went wrong while searching.',
          )
        }
      } finally {
        if (requestId === searchId.current) setLoading(false)
      }
    }

    void search()
    return () => controller.abort()
  }, [query, retry])

  async function loadMore() {
    if (!nextPage || loadingMore) return
    const requestId = searchId.current
    setLoadingMore(true)
    setError('')

    try {
      const data = await getCardPage(nextPage)
      if (requestId !== searchId.current) return

      setResults((current) => [...current, ...data.data])
      setNextPage(data.next_page)
    } catch (requestError) {
      if (requestId === searchId.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Something went wrong while loading more cards.',
        )
      }
    } finally {
      if (requestId === searchId.current) setLoadingMore(false)
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittedText(searchText)
  }

  function toggleColor(color: string) {
    setSelectedColors((current) =>
      current.includes(color)
        ? current.filter((value) => value !== color)
        : [...current, color],
    )
  }

  function chooseQuickSearch(search: string) {
    const terms: Record<string, string> = {
      'Legendary creatures': 't:legendary t:creature',
      'Instant spells': 't:instant',
      Dragons: 't:dragon',
      Artifacts: 't:artifact',
    }
    setSearchText(terms[search])
    setSubmittedText(terms[search])
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Mana Index home">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span>Mana<span className="brand-light">Index</span></span>
        </a>
        <span className="topbar-note"><span className="live-dot" /> Powered by Scryfall</span>
      </header>

      <main>
        <section className="intro">
          <p className="eyebrow">YOUR GATHERING, CATALOGUED</p>
          <h1>Find Your Next<br /><span>Favorite Card.</span></h1>
          <p className="intro-copy">
            Search across every set, every format, and every plane.
          </p>

          <form className="search-bar" onSubmit={handleSearch} role="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.2 4.2" />
            </svg>
            <input
              aria-label="Search Magic cards"
              placeholder="Try “Lightning Bolt” or t:dragon"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            {searchText && (
              <button
                className="clear-search"
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchText('')}
              >×</button>
            )}
            <button className="search-submit" type="submit">Search <span>↗</span></button>
          </form>

          <div className="quick-searches" aria-label="Popular searches">
            <span>Popular:</span>
            {quickSearches.map((search) => (
              <button key={search} type="button" onClick={() => chooseQuickSearch(search)}>
                {search}
              </button>
            ))}
          </div>
        </section>

        <section className="explorer" aria-label="Card search results">
          <aside className="options-panel" aria-label="Search options">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">REFINE RESULTS</p>
                <h2>Options</h2>
              </div>
              <button
                className="reset-button"
                type="button"
                onClick={() => {
                  setSelectedColors([])
                  setSelectedRarity('')
                }}
              >Reset</button>
            </div>

            <div className="filter-group">
              <h3>Color identity</h3>
              <p className="filter-hint">Choose one or more colors</p>
              <div className="color-options">
                {colors.map((color) => (
                  <button
                    className={`color-option ${color.className}${selectedColors.includes(color.code) ? ' selected' : ''}`}
                    key={color.code}
                    type="button"
                    aria-label={color.label}
                    aria-pressed={selectedColors.includes(color.code)}
                    title={color.label}
                    onClick={() => toggleColor(color.code)}
                  >{color.code}</button>
                ))}
              </div>
            </div>

            <div className="filter-group rarity-group">
              <h3>Rarity</h3>
              <div className="rarity-options">
                {rarities.map((rarity) => (
                  <button
                    className={`rarity-option${selectedRarity === rarity ? ' selected' : ''}`}
                    key={rarity}
                    type="button"
                    aria-pressed={selectedRarity === rarity}
                    onClick={() => setSelectedRarity((current) => current === rarity ? '' : rarity)}
                  >
                    <span className={`rarity-gem ${rarity}`} aria-hidden="true" />
                    <span>{rarity[0].toUpperCase() + rarity.slice(1)}</span>
                    {selectedRarity === rarity && <span className="checkmark">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-tip">
              <span aria-hidden="true">✧</span>
              <p>Tip: use Scryfall syntax like <code>o:draw</code> or <code>cmc=3</code> in your search.</p>
            </div>
          </aside>

          <div className="results-section">
            <div className="results-header">
              <div>
                <p className="eyebrow">THE MULTIVERSE</p>
                <h2>{loading ? 'Searching cards…' : 'Card results'}</h2>
              </div>
              {!loading && !error && (
                <span className="result-count">{totalCards.toLocaleString()} cards</span>
              )}
            </div>

            {error && (
              <div className="message-state error-state" role="alert">
                <span className="state-icon">!</span>
                <h3>Search unavailable</h3>
                <p>{error}</p>
                <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>
              </div>
            )}

            {loading && (
              <div className="card-grid" aria-label="Loading cards">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="card-skeleton" key={index}>
                    <div className="skeleton-image" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div className="message-state">
                <span className="state-icon">⌕</span>
                <h3>No cards found</h3>
                <p>Try a different name or loosen your options.</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <>
                <div className="card-grid">
                  {results.map((card) => {
                    const image = cardImage(card)
                    return (
                      <a
                        className="card-item"
                        href={card.scryfall_uri}
                        target="_blank"
                        rel="noreferrer"
                        key={card.id}
                      >
                        <div className="card-image-wrap">
                          {image ? (
                            <img src={image} alt={card.name} loading="lazy" />
                          ) : (
                            <div className="no-image">Image unavailable</div>
                          )}
                          <span className={`card-rarity ${card.rarity}`}>{card.rarity}</span>
                        </div>
                        <div className="card-info">
                          <div className="card-title-row">
                            <h3>{card.name}</h3>
                            {card.mana_cost && <span className="mana-cost">{card.mana_cost}</span>}
                          </div>
                          <p className="card-type">{card.type_line}</p>
                          <div className="card-meta">
                            <span>{card.set_name}</span>
                            <span>{displayPrice(card.prices.usd)}</span>
                          </div>
                        </div>
                      </a>
                    )
                  })}
                </div>
                {nextPage && (
                  <button
                    className="load-more"
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading cards…' : 'Load more cards'}
                    {!loadingMore && <span aria-hidden="true">↓</span>}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <AccountDecklists cards={results} />
      </main>

      <footer>
        <span>Made for the love of the game.</span>
        <span>Richard Stuckey 2026</span>
        <span>Card data and images provided by <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>.</span>
      </footer>
    </div>
  )
}

export default App
