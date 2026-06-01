import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Reuse the connection across hot-reloads in dev and across invocations
// in the same Vercel function instance (avoids connection exhaustion).
declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined
}

const client = globalThis._pgClient ?? postgres(connectionString, {
  max: 3,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  idle_timeout: 20,
  connect_timeout: 10,
})

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgClient = client
}

export const db = drizzle(client, { schema })

export { schema }
