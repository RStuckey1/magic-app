import app from './app.js'
import { assertJwtConfig } from './auth/jwt.js'
import { pool } from './db/pool.js'

const port = Number(process.env.PORT) || 3001

async function startServer() {
  assertJwtConfig()
  await pool.query('SELECT 1')
  app.listen(port, '127.0.0.1', () => {
    console.log(`Card API listening on http://127.0.0.1:${port}`)
  })
}

void startServer().catch(async (error: unknown) => {
  console.error('The API server could not start:', error)
  await pool.end()
  process.exitCode = 1
})
