import { Router } from 'express'
import { getCardPage, searchCards } from '../controllers/cardsController.js'

const cardsRouter = Router()

cardsRouter.get('/search', searchCards)
cardsRouter.get('/page', getCardPage)

export default cardsRouter
