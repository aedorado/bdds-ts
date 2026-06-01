import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function seedDevUsers() {
  const devUsers = [
    { id: 1, email: 'admin@devotional.local', name: 'Admin User', role: 'admin' },
    { id: 2, email: 'corrector@devotional.local', name: 'Corrector User', role: 'corrector' },
    { id: 3, email: 'proofreader@devotional.local', name: 'Proofreader User', role: 'proofreader' },
    { id: 4, email: 'viewer@devotional.local', name: 'Viewer User', role: 'viewer' },
  ]

  for (const user of devUsers) {
    const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1)

    if (!existing.length) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      })
      console.log(`✓ Created ${user.name}`)
    } else {
      console.log(`✓ ${user.name} already exists`)
    }
  }

  console.log('\nDev users seeded!')
}

seedDevUsers().catch(console.error)
