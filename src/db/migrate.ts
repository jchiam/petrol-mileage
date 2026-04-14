import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import path from 'path'

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  })

  const db = drizzle(pool)

  console.log('Running migrations...')
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'src/db/migrations'),
  })
  console.log('Migrations complete.')

  await pool.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
