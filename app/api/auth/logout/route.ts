import { clearSessionCookie } from '@/lib/auth/session'
import { signOut } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export async function POST() {
  if (process.env.ENABLE_DEV_AUTH === 'true') {
    // Dev auth: clear cookie
    await clearSessionCookie()
  } else {
    // Production: use NextAuth signOut
    await signOut({ redirectTo: '/' })
  }

  redirect('/')
}
