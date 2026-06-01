import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

async function seedDatabase() {
  console.log('🌱 Seeding database with test users...')

  try {
    // Clear existing test users
    // Note: In production, you'd want more careful handling

    const testUsers = [
      {
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
        sevaPoints: 1000,
        avatarUrl: null,
      },
      {
        name: 'Corrector One',
        email: 'corrector1@test.com',
        role: 'corrector',
        sevaPoints: 500,
        avatarUrl: null,
      },
      {
        name: 'Corrector Two',
        email: 'corrector2@test.com',
        role: 'corrector',
        sevaPoints: 450,
        avatarUrl: null,
      },
      {
        name: 'Proofreader One',
        email: 'proofreader1@test.com',
        role: 'proofreader',
        sevaPoints: 300,
        avatarUrl: null,
      },
      {
        name: 'Proofreader Two',
        email: 'proofreader2@test.com',
        role: 'proofreader',
        sevaPoints: 280,
        avatarUrl: null,
      },
      {
        name: 'Viewer User',
        email: 'viewer@test.com',
        role: 'viewer',
        sevaPoints: 100,
        avatarUrl: null,
      },
    ]

    for (const user of testUsers) {
      try {
        await db.insert(users).values(user)
        console.log(`✅ Created user: ${user.name} (${user.role})`)
      } catch (error) {
        // User might already exist, skip
        if (error instanceof Error && error.message.includes('unique')) {
          console.log(`⏭️  User already exists: ${user.name}`)
        } else {
          throw error
        }
      }
    }

    console.log('\n✨ Database seeding complete!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase()
