'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { AlertCircle } from 'lucide-react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    AccessDenied: 'Sign-in was denied. This usually means the database operation failed.',
    OAuthSignin: 'Error connecting to Google. Please check your OAuth credentials.',
    OAuthCallback: 'Error during Google OAuth callback.',
    OAuthCreateAccount: 'Could not create account from Google credentials.',
    default: 'An authentication error occurred.',
  }

  const message = error ? errorMessages[error] || errorMessages.default : errorMessages.default

  return (
    <div className="w-full max-w-sm space-y-6 p-8 rounded-2xl border border-border shadow-sm bg-card">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <h1 className="text-xl font-semibold">Authentication Error</h1>
      </div>

      <p className="text-sm text-muted-foreground">{message}</p>

      {error && (
        <p className="text-xs bg-muted p-2 rounded font-mono text-muted-foreground overflow-auto">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Link href="/login" className="flex-1">
          <Button className="w-full" variant="outline">
            Try Again
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button className="w-full">Home</Button>
        </Link>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <AuthErrorContent />
      </Suspense>
    </div>
  )
}
