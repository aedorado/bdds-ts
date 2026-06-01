'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, Settings, Users, Zap, Sun, Moon, LayoutDashboard, BookOpen, Search as SearchIcon, Globe } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { UserMenu } from './user-menu'

interface Session {
  userId?: number
  name?: string
  email?: string
  role?: string
}

export function MainNav({ session }: { session: Session | null }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme, fontSize, setFontSize } = useTheme()

  const userRole = session?.role ?? null

  // Links are determined by role only — never by current path
  const links = userRole === 'admin'
    ? [
        { href: '/admin',           label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/lectures',  label: 'Lectures',  icon: BookOpen },
        { href: '/admin/users',     label: 'Users',     icon: Users },
        { href: '/admin/activity',  label: 'Activity',  icon: Zap },
        { href: '/search',          label: 'Search',    icon: SearchIcon },
        { href: '/community',       label: 'Community', icon: Globe },
      ]
    : ['corrector', 'proofreader', 'contributor'].includes(userRole ?? '')
    ? [
        { href: '/workspace',              label: 'My Work',   icon: Home },
        { href: '/workspace/my-lectures',  label: 'Assigned',  icon: BookOpen },
        { href: '/search',                 label: 'Search',    icon: SearchIcon },
        { href: '/community',              label: 'Community', icon: Globe },
      ]
    : [
        { href: '/',           label: 'Home',      icon: Home },
        { href: '/search',     label: 'Search',    icon: SearchIcon },
        { href: '/community',  label: 'Community', icon: Globe },
      ]

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-border sticky top-0 z-40">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 font-heading text-xl font-bold">
            <div className="w-8 h-8 bg-saffron-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">D</span>
            </div>
            <span className="hidden sm:inline">Devotional</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || (link.href.split('/').length > 2 && pathname.startsWith(link.href + '/'))

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors ${
                    isActive
                      ? 'bg-saffron-100 text-saffron-800 dark:bg-saffron-900 dark:text-saffron-100'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Theme Toggle + Font Size + User Menu */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors select-none ${
                fontSize === 'large'
                  ? 'bg-saffron-100 text-saffron-800 dark:bg-saffron-900 dark:text-saffron-100'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              aria-label="Toggle font size"
              title={fontSize === 'large' ? 'Switch to normal text' : 'Switch to larger text'}
            >
              Aa
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <UserMenu session={session} />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md hover:bg-muted"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {links.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href || (link.href.split('/').length > 2 && pathname.startsWith(link.href + '/'))

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 transition-colors ${
                      isActive
                        ? 'bg-saffron-100 text-saffron-800 dark:bg-saffron-900 dark:text-saffron-100'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
              <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
                <UserMenu session={session} />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors select-none ${
                      fontSize === 'large'
                        ? 'bg-saffron-100 text-saffron-800 dark:bg-saffron-900 dark:text-saffron-100'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    aria-label="Toggle font size"
                  >
                    Aa
                  </button>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
