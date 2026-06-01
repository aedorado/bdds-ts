import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',

  dialect: 'postgresql',

  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/devotional_transcripts',
  },

  migrations: {
    table: '__drizzle_migrations__',
    schema: 'drizzle',
  },
})