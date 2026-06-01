import { Session } from 'next-auth'

export interface AuthSession extends Session {
  userId: number
  email: string
  name: string
  role: 'admin' | 'contributor' | 'viewer'
}

export const SESSION_COOKIE_NAME = 'devotional_session'

export interface SessionPayload {
  userId: number
  email: string
  name: string
  role: 'admin' | 'contributor' | 'viewer'
}
