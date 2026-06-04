'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import posthog from 'posthog-js'

const DEV_USERS = [
  { id: 1, name: 'Admin', role: 'admin', email: 'admin@devotional.local' },
  { id: 2, name: 'Contributor One', role: 'contributor', email: 'contributor1@devotional.local' },
  { id: 3, name: 'Contributor Two', role: 'contributor', email: 'contributor2@devotional.local' },
  { id: 4, name: 'Viewer', role: 'viewer', email: 'viewer@devotional.local' },
]

export default function DevLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (userId: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/auth/dev-login?userId=${userId}`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        const user = DEV_USERS.find(u => u.id === userId)
        posthog.identify(String(userId), {
          name: user?.name,
          email: user?.email,
          role: user?.role,
        })
        posthog.capture('user_logged_in', {
          user_id: userId,
          role: data.session?.role ?? user?.role,
          auth_method: 'dev',
        })
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      posthog.captureException(error)
      console.error('Login failed:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-50 to-tulasi-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-heading mb-2">Dev Login</h1>
          <p className="text-muted-foreground">Select a test user to continue</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DEV_USERS.map((user) => (
            <Card
              key={user.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleLogin(user.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium px-3 py-1 bg-saffron-100 text-saffron-800 dark:bg-saffron-900 dark:text-saffron-100 rounded-full capitalize">
                    {user.role}
                  </span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLogin(user.id)
                    }}
                    disabled={isLoading}
                  >
                    Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>Development Mode:</strong> This page only appears when <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">ENABLE_DEV_AUTH=true</code>
          </p>
        </div>
      </div>
    </div>
  )
}
