import { Router } from 'express'
import {
  createDecklist,
  deleteDecklist,
  deleteDecklistCard,
  getDecklists,
  renameDecklist,
  updateDecklistCard,
} from '../controllers/decklistsController.js'
import { requireAuth } from '../auth/requireAuth.js'

const decklistsRouter = Router()

decklistsRouter.use(requireAuth)
decklistsRouter.get('/', getDecklists)
decklistsRouter.post('/', createDecklist)
decklistsRouter.patch('/:decklistId', renameDecklist)
decklistsRouter.delete('/:decklistId', deleteDecklist)
decklistsRouter.put('/:decklistId/cards/:cardId', updateDecklistCard)
decklistsRouter.delete('/:decklistId/cards/:cardId', deleteDecklistCard)

export default decklistsRouter
