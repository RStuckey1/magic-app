import { Router } from 'express'
import { currentUser, loginUser, logoutUser, registerUser } from '../controllers/authController.js'
import { requireAuth } from '../auth/requireAuth.js'

const authRouter = Router()

authRouter.post('/register', registerUser)
authRouter.post('/login', loginUser)
authRouter.post('/logout', logoutUser)
authRouter.get('/me', requireAuth, currentUser)

export default authRouter
