'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, User, ChevronDown } from 'lucide-react'

interface Session {
  userId?: number
  name?: string
  email?: string
  role?: string
}

export function UserMenu({ session }: { session: Session | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (res.ok) window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!session?.userId) return null

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-saffron-100 text-saffron-800 dark:bg-saffron-900 dark:text-saffron-100'
      case 'corrector': return 'bg-tulasi-100 text-tulasi-800 dark:bg-tulasi-900 dark:text-tulasi-100'
      case 'proofreader': return 'bg-lotus-100 text-lotus-800 dark:bg-lotus-900 dark:text-lotus-100'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">{session.name}</span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-border z-50">
          <div className="p-4 border-b border-border">
            <p className="font-semibold text-sm truncate">{session.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.email}</p>
            <div className="mt-3">
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getRoleBadgeColor(session.role)}`}>
                {session.role?.charAt(0).toUpperCase()}{session.role?.slice(1)}
              </span>
            </div>
          </div>
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
