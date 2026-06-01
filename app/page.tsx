'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, Zap, Search } from 'lucide-react'

export default function Home() {
  const [session, setSession] = useState<{ userId?: number; role?: string; name?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      const result = await fetch('/api/session').then(r => r.json()).catch(() => null)
      setSession(result)
      setIsLoading(false)
    }
    loadSession()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-saffron-50 via-white to-lotus-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="py-20 sm:py-32">
            <div className="text-center">
              <h1 className="text-5xl sm:text-6xl font-bold font-heading mb-6 bg-clip-text text-transparent bg-gradient-to-r from-saffron-600 to-lotus-600">
                Devotional Transcripts
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                A production-grade platform for transcribing, editing, and sharing devotional lectures with advanced collaboration tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' ? (
                  <Link href="/dev-login">
                    <Button size="lg" className="bg-saffron-600 hover:bg-saffron-700">Dev Login</Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-sm gap-2.5"
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                  </Button>
                )}
                <Link href="/search">
                  <Button size="lg" variant="outline">
                    Explore Lectures
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <BookOpen className="w-8 h-8 text-saffron-600 mb-2" />
                <CardTitle className="text-lg">Transcribe</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Convert audio to text with intelligent speaker detection and timestamps.</CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-tulasi-600 mb-2" />
                <CardTitle className="text-lg">Collaborate</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Work together with contributors in real-time to improve transcripts.</CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Search className="w-8 h-8 text-lotus-600 mb-2" />
                <CardTitle className="text-lg">Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Full-text search across all lectures with highlighting and timestamps.</CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="w-8 h-8 text-amber-600 mb-2" />
                <CardTitle className="text-lg">Gamify</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Earn seva points, build streaks, and compete on the leaderboard.</CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          {/* <div className="py-20 text-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-12 border border-border">
              <h2 className="text-3xl font-bold font-heading mb-4">Ready to get started?</h2>
              <p className="text-muted-foreground mb-8">
                Join our community of devotional scholars and transcribers
              </p>
              <Link href={process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH ? '/dev-login' : '/login'}>
                <Button size="lg" className="bg-saffron-600 hover:bg-saffron-700">
                  {process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH ? 'Try Dev Login' : 'Sign In with Google'}
                </Button>
              </Link>
            </div>
          </div> */}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-heading mb-2">
          Welcome, {session.name}!
        </h1>
        <p className="text-muted-foreground">
          Role: <span className="font-semibold capitalize">{session.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {session.role === 'admin' && (
          <Link href="/admin">
            <Card className="cursor-pointer hover:border-saffron-400 hover:shadow-md transition-all h-full">
              <CardHeader>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>Manage lectures, users, and platform settings</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        {(session.role === 'admin' || session.role === 'contributor') && (
          <Link href="/workspace">
            <Card className="cursor-pointer hover:border-tulasi-400 hover:shadow-md transition-all h-full">
              <CardHeader>
                <CardTitle>My Work</CardTitle>
                <CardDescription>View your assigned lectures and contribution stats</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        <Link href="/search">
          <Card className="cursor-pointer hover:border-lotus-400 hover:shadow-md transition-all h-full">
            <CardHeader>
              <CardTitle>Search Lectures</CardTitle>
              <CardDescription>Discover and explore devotional lectures</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/community">
          <Card className="cursor-pointer hover:border-amber-400 hover:shadow-md transition-all h-full">
            <CardHeader>
              <CardTitle>Community</CardTitle>
              <CardDescription>View leaderboards and top contributors</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
