#!/usr/bin/env node

/**
 * Setup script to initialize PostgreSQL extensions
 * Run this after creating the database to enable full-text search
 */

import postgres from 'postgres'
import { config } from 'dotenv'

config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL not set')
  process.exit(1)
}

const client = postgres(connectionString)

async function setupExtensions() {
  try {
    console.log('🔧 Setting up PostgreSQL extensions...')

    // Enable pg_trgm for trigram matching (used in search)
    await client`CREATE EXTENSION IF NOT EXISTS pg_trgm`
    console.log('✅ pg_trgm extension enabled')

    // Enable unaccent for accent-insensitive search
    await client`CREATE EXTENSION IF NOT EXISTS unaccent`
    console.log('✅ unaccent extension enabled')

    console.log('\n✨ Database setup complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

setupExtensions()
