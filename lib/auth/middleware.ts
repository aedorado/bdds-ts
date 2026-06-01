import { getSession } from './session'
import { redirect } from 'next/navigation'

/**
 * Higher-order server component to protect routes by role
 * Usage in layout or page:
 *   const session = await withRole('admin')
 */
export async function withRole(
  requiredRole: 'admin' | 'contributor' | 'viewer' | null = null
) {
  const session = await getSession()

  if (!session) {
    redirect('/api/auth/signin')
  }

  if (requiredRole && !hasRole(session.role, requiredRole)) {
    redirect('/unauthorized')
  }

  return session
}

/**
 * Check if user has required role
 * Hierarchy: admin > contributor > viewer
 */
export function hasRole(
  userRole: string,
  requiredRole: 'admin' | 'contributor' | 'viewer'
): boolean {
  const roleHierarchy: Record<string, number> = {
    admin: 3,
    contributor: 2,
    viewer: 1,
  }

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}

/**
 * Require admin role
 */
export async function withAdminRole() {
  return withRole('admin')
}

/**
 * Require at least contributor role (can edit transcripts)
 */
export async function withContributorRole() {
  return withRole('contributor')
}
