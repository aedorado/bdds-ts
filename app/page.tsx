'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui'
import { BookOpen, Users, Zap, Search, ArrowRight, Mic, Edit3, Globe } from 'lucide-react'

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-saffron-600/10 blur-[120px]" />
          <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-lotus-600/8 blur-[100px]" />
          <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-amber-600/8 blur-[100px]" />
        </div>

        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(to right, #f59e0b 1px, transparent 1px), linear-gradient(to bottom, #f59e0b 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="pt-28 pb-20 sm:pt-36 sm:pb-28 text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-saffron-700/40 bg-saffron-900/20 text-saffron-300 text-sm font-medium mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-saffron-400 animate-pulse" />
              Devotional knowledge, preserved forever
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold font-heading leading-none mb-6 bg-clip-text text-transparent bg-gradient-to-br from-saffron-300 via-amber-400 to-lotus-400">
              Devotional
              <br />
              Transcripts
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
              Transcribe, edit, and share devotional lectures. Built for scholars, correctors, and the entire seva community.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' ? (
                <Link href="/dev-login">
                  <Button size="lg" className="bg-saffron-600 hover:bg-saffron-400 text-white gap-2 px-8 h-12 text-base rounded-xl shadow-lg shadow-saffron-900/40 hover:shadow-xl hover:shadow-saffron-900/60 transition-all duration-200 hover:scale-105 cursor-pointer">
                    Dev Login
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm gap-2.5 px-8 h-12 text-base rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer"
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
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500 gap-2 px-8 h-12 text-base rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer">
                  <Search className="w-4 h-4" />
                  Explore Lectures
                </Button>
              </Link>
            </div>
          </div>

          {/* How it works */}
          <div className="pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-800">
              {[
                {
                  icon: <Mic className="w-5 h-5" />,
                  step: '01',
                  title: 'Upload & Transcribe',
                  desc: 'Add lecture audio or video with metadata. Build the foundation for collaborative transcription.',
                  color: 'text-saffron-400',
                  bg: 'bg-saffron-900/30',
                },
                {
                  icon: <Edit3 className="w-5 h-5" />,
                  step: '02',
                  title: 'Correct & Proofread',
                  desc: 'Contributors correct and proofread each transcript. Earn seva points for every contribution.',
                  color: 'text-lotus-400',
                  bg: 'bg-purple-900/30',
                },
                {
                  icon: <Globe className="w-5 h-5" />,
                  step: '03',
                  title: 'Search & Share',
                  desc: 'Published transcripts are fully searchable. Find any teaching across the entire archive.',
                  color: 'text-amber-400',
                  bg: 'bg-amber-900/20',
                },
              ].map(({ icon, step, title, desc, color, bg }) => (
                <div key={step} className="bg-slate-900/80 p-8 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center`}>
                      {icon}
                    </div>
                    <span className="text-3xl font-bold text-slate-800 font-heading">{step}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features grid */}
          <div className="pb-20">
            <h2 className="text-2xl font-bold font-heading text-white mb-8 text-center">Everything the seva needs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: <BookOpen className="w-5 h-5" />,
                  title: 'Transcribe',
                  desc: 'Audio-synced editor with real-time segment highlighting.',
                  color: 'text-saffron-400',
                  bg: 'bg-saffron-900/30',
                  border: 'hover:border-saffron-400/60',
                },
                {
                  icon: <Users className="w-5 h-5" />,
                  title: 'Collaborate',
                  desc: 'Role-based access for correctors, proofreaders, and admins.',
                  color: 'text-tulasi-400',
                  bg: 'bg-green-900/30',
                  border: 'hover:border-tulasi-700',
                },
                {
                  icon: <Search className="w-5 h-5" />,
                  title: 'Search',
                  desc: 'Full-text PostgreSQL search across all transcripts.',
                  color: 'text-lotus-400',
                  bg: 'bg-purple-900/30',
                  border: 'hover:border-lotus-700/60',
                },
                {
                  icon: <Zap className="w-5 h-5" />,
                  title: 'Gamify',
                  desc: 'Seva points, badge tiers, and a community leaderboard.',
                  color: 'text-amber-400',
                  bg: 'bg-amber-900/20',
                  border: 'hover:border-amber-700/60',
                },
              ].map(({ icon, title, desc, color, bg, border }) => (
                <div
                  key={title}
                  className={`bg-slate-900/60 border border-slate-800 ${border} rounded-xl p-6 transition-colors duration-200`}
                >
                  <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center mb-4`}>
                    {icon}
                  </div>
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA footer strip */}
          <div className="pb-20">
            <div className="bg-gradient-to-r from-saffron-900/40 via-amber-900/30 to-purple-900/40 border border-saffron-800/40 rounded-2xl p-10 text-center">
              <h2 className="text-2xl font-bold font-heading text-white mb-3">Ready to contribute?</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Join our community of devotional scholars and start earning seva points today.
              </p>
              {process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' ? (
                <Link href="/dev-login">
                  <Button className="bg-saffron-600 hover:bg-saffron-400 text-white gap-2 px-8 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg shadow-saffron-900/40 hover:shadow-xl hover:shadow-saffron-900/60">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  className="bg-saffron-600 hover:bg-saffron-400 text-white gap-2 px-8 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg shadow-saffron-900/40 hover:shadow-xl hover:shadow-saffron-900/60"
                  onClick={() => signIn('google', { callbackUrl: '/' })}
                >
                  Sign in with Google <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
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
            <div className="group cursor-pointer border border-border hover:border-saffron-400 hover:shadow-md transition-all rounded-xl p-6 bg-card h-full">
              <h2 className="text-lg font-semibold mb-1 group-hover:text-saffron-600 transition-colors">Admin Dashboard</h2>
              <p className="text-muted-foreground text-sm">Manage lectures, users, and platform settings</p>
            </div>
          </Link>
        )}

        {(session.role === 'admin' || session.role === 'contributor') && (
          <Link href="/workspace">
            <div className="group cursor-pointer border border-border hover:border-tulasi-400 hover:shadow-md transition-all rounded-xl p-6 bg-card h-full">
              <h2 className="text-lg font-semibold mb-1 group-hover:text-tulasi-700 transition-colors">My Work</h2>
              <p className="text-muted-foreground text-sm">View your assigned lectures and contribution stats</p>
            </div>
          </Link>
        )}

        <Link href="/search">
          <div className="group cursor-pointer border border-border hover:border-lotus-400 hover:shadow-md transition-all rounded-xl p-6 bg-card h-full">
            <h2 className="text-lg font-semibold mb-1 group-hover:text-lotus-700 transition-colors">Search Lectures</h2>
            <p className="text-muted-foreground text-sm">Discover and explore devotional lectures</p>
          </div>
        </Link>

        <Link href="/community">
          <div className="group cursor-pointer border border-border hover:border-amber-400 hover:shadow-md transition-all rounded-xl p-6 bg-card h-full">
            <h2 className="text-lg font-semibold mb-1 group-hover:text-amber-600 transition-colors">Community</h2>
            <p className="text-muted-foreground text-sm">View leaderboards and top contributors</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
