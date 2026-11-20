import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pool } from './pool.js'

async function migrate() {
  const migration = await readFile(
    resolve(process.cwd(), 'server', 'migrations', '001_initial.sql'),
    'utf8',
  )

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(migration)
    await client.query('COMMIT')
    console.log('Database migrations completed.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

void migrate().catch((error: unknown) => {
  console.error('Database migration failed:', error)
  process.exitCode = 1
})
