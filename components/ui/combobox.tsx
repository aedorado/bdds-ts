'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComboboxProps {
  options: string[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Filter options based on search
  const filtered = search.trim()
    ? options.filter(opt =>
        opt.toLowerCase().includes(search.toLowerCase())
      )
    : options

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleSelect = (option: string) => {
    onValueChange(option)
    setSearch('')
    setOpen(false)
  }

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search || value}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(!open)
            setSearch('')
            if (!open) inputRef.current?.focus()
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
          tabIndex={-1}
        >
          <ChevronsUpDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50">
          <div className="border-b border-border p-2">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2',
                    value === option && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === option ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                {emptyText}
              </div>
            )}

            {/* Show option to add custom value if search text doesn't match existing options */}
            {search.trim() &&
              !options.includes(search.trim()) && (
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-t border-border font-medium"
                >
                  ➕ Add "{search.trim()}"
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
