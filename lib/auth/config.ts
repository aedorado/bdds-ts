import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        console.error('No email from Google OAuth')
        return false
      }

      try {
        console.log('Checking for existing user:', user.email)
        const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1)

        if (existing.length === 0) {
          console.log('Creating new user:', user.email)
          await db.insert(users).values({
            email: user.email,
            name: user.name ?? 'User',
            avatarUrl: user.image,
            role: 'viewer',
          })
        } else {
          console.log('Updating existing user:', user.email)
          await db
            .update(users)
            .set({ name: user.name ?? existing[0].name, avatarUrl: user.image ?? existing[0].avatarUrl })
            .where(eq(users.email, user.email))
        }

        console.log('Sign-in successful for:', user.email)
        return true
      } catch (error) {
        console.error('Sign-in error:', error instanceof Error ? error.message : error)
        return false
      }
    },

    async jwt({ token, user }) {
      // On first sign-in, fetch our DB record to get the numeric id and role
      if (user?.email) {
        const dbUser = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
        if (dbUser[0]) {
          token.dbUserId = dbUser[0].id
          token.role = dbUser[0].role
          token.name = dbUser[0].name
          token.picture = dbUser[0].avatarUrl ?? token.picture
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = session as any
        s.userId = token.dbUserId
        s.role = token.role
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
})
