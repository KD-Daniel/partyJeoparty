import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function migrate() {
  try {
    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')

    // Split by semicolon and execute each statement
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log('Running database migration...')

    for (const statement of statements) {
      await pool.query(statement)
    }

    console.log('Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migrate()
