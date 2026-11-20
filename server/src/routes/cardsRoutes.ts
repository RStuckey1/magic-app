import { Router } from 'express'
import { getCardById, getCardPage, searchCards } from '../controllers/cardsController.js'

const cardsRouter = Router()

cardsRouter.get('/search', searchCards)
cardsRouter.get('/page', getCardPage)
cardsRouter.get('/:cardId', getCardById)

export default cardsRouter
