import express, { type NextFunction, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import authRouter from './routes/authRoutes.js'
import { ApiError } from './errors/ApiError.js'
import cardsRouter from './routes/cardsRoutes.js'
import decklistsRouter from './routes/decklistsRoutes.js'

const app = express()

app.use(express.json({ limit: '32kb' }))
app.use(cookieParser())
app.use('/api/auth', authRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/decklists', decklistsRouter)
app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  void next
  const statusCode = error instanceof ApiError ? error.statusCode : 500
  const message = error instanceof ApiError ? error.message : 'An unexpected server error occurred.'

  if (statusCode === 500) {
    console.error(error)
  }

  response.status(statusCode).json({ error: message })
})

export default app
