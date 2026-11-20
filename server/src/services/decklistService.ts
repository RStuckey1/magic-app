import { randomUUID } from 'node:crypto'
import { pool } from '../db/pool.js'
import { ApiError } from '../errors/ApiError.js'

export type DecklistCard = {
  cardId: string
  cardName: string
  quantity: number
}

export type Decklist = {
  id: string
  name: string
  created_at: string
  updated_at: string
  cards: DecklistCard[]
}

export async function listDecklists(userId: string): Promise<Decklist[]> {
  const result = await pool.query<Decklist>(
    `SELECT d.id, d.name, d.created_at, d.updated_at,
      COALESCE(
        json_agg(json_build_object(
          'cardId', c.card_id,
          'cardName', c.card_name,
          'quantity', c.quantity
        )) FILTER (WHERE c.card_id IS NOT NULL),
        '[]'
      ) AS cards
    FROM decklists d
    LEFT JOIN decklist_cards c ON c.decklist_id = d.id
    WHERE d.user_id = $1
    GROUP BY d.id
    ORDER BY d.updated_at DESC`,
    [userId],
  )
  return result.rows
}

export async function createDecklist(userId: string, name: string) {
  const result = await pool.query<{ id: string; name: string }>(
    `INSERT INTO decklists (id, user_id, name)
     VALUES ($1, $2, $3)
     RETURNING id, name`,
    [randomUUID(), userId, name],
  )
  return { ...result.rows[0], cards: [] as DecklistCard[] }
}

export async function renameDecklist(userId: string, decklistId: string, name: string) {
  const result = await pool.query<{ id: string; name: string; updated_at: string }>(
    `UPDATE decklists SET name = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, name, updated_at`,
    [decklistId, userId, name],
  )
  if (!result.rows[0]) throw new ApiError('Decklist not found.', 404)
  return result.rows[0]
}

export async function deleteDecklist(userId: string, decklistId: string) {
  const result = await pool.query(
    'DELETE FROM decklists WHERE id = $1 AND user_id = $2',
    [decklistId, userId],
  )
  if (result.rowCount === 0) throw new ApiError('Decklist not found.', 404)
}

export async function setDecklistCard(
  userId: string,
  decklistId: string,
  cardId: string,
  cardName: string,
  quantity: number,
) {
  const result = await pool.query<DecklistCard>(
    `INSERT INTO decklist_cards (decklist_id, card_id, card_name, quantity)
     SELECT d.id, $3, $4, $5 FROM decklists d
     WHERE d.id = $1 AND d.user_id = $2
     ON CONFLICT (decklist_id, card_id)
     DO UPDATE SET card_name = EXCLUDED.card_name, quantity = EXCLUDED.quantity
     RETURNING card_id AS "cardId", card_name AS "cardName", quantity`,
    [decklistId, userId, cardId, cardName, quantity],
  )
  if (!result.rows[0]) throw new ApiError('Decklist not found.', 404)

  await pool.query(
    'UPDATE decklists SET updated_at = NOW() WHERE id = $1 AND user_id = $2',
    [decklistId, userId],
  )
  return result.rows[0]
}

export async function removeDecklistCard(userId: string, decklistId: string, cardId: string) {
  const decklist = await pool.query(
    'SELECT 1 FROM decklists WHERE id = $1 AND user_id = $2',
    [decklistId, userId],
  )
  if (decklist.rowCount === 0) throw new ApiError('Decklist not found.', 404)

  await pool.query(
    'DELETE FROM decklist_cards WHERE decklist_id = $1 AND card_id = $2',
    [decklistId, cardId],
  )
  await pool.query(
    'UPDATE decklists SET updated_at = NOW() WHERE id = $1 AND user_id = $2',
    [decklistId, userId],
  )
}
