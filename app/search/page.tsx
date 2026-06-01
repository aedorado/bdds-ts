'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Search as SearchIcon } from 'lucide-react'

interface SearchResult {
  lectureId: number
  slug: string
  title: string
  speaker: string
  status: string
  snippet: string
  matchTimestamps: number[]
  thumbnailUrl: string | null
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Unassigned',               color: 'bg-slate-100 text-slate-600' },
  assigned:    { label: 'Correction In Progress',   color: 'bg-blue-100 text-blue-700' },
  corrected:   { label: 'Proofreading In Progress', color: 'bg-amber-100 text-amber-700' },
  proofread:   { label: 'Ready to Publish',         color: 'bg-purple-100 text-purple-700' },
  published:   { label: 'Published',                color: 'bg-green-100 text-green-700' },
  archived:    { label: 'Archived',                 color: 'bg-slate-100 text-slate-400' },
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [committedQuery, setCommittedQuery] = useState('')
  const [selectedSpeaker, setSelectedSpeaker] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchAll, setSearchAll] = useState(false)
  const [speakers, setSpeakers] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)

  useEffect(() => {
    async function fetchFilters() {
      try {
        const response = await fetch('/api/search?filters=true')
        const data = await response.json()
        setSpeakers(data.speakers || [])
        setCategories(data.categories || [])
      } catch (err) {
        console.error('Failed to load filters:', err)
      } finally {
        setFiltersLoading(false)
      }
    }
    fetchFilters()
  }, [])

  useEffect(() => {
    async function performSearch() {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          q: committedQuery,
          speaker: selectedSpeaker,
          category: selectedCategory,
          page: page.toString(),
          limit: '12',
          publishedOnly: searchAll ? 'false' : 'true',
        })

        const response = await fetch(`/api/search?${params}`)
        const data = await response.json()

        setResults(data.results || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 0)
        if (data.isAdmin && !isAdmin) { setIsAdmin(true); setSearchAll(true) }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [committedQuery, selectedSpeaker, selectedCategory, page, searchAll])

  const handleSubmit = () => {
    setPage(1)
    setCommittedQuery(searchQuery)
  }

  const handleReset = () => {
    setSearchQuery('')
    setCommittedQuery('')
    setSelectedSpeaker('')
    setSelectedCategory('')
    setSearchAll(false)
    setPage(1)
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold font-heading mb-2">Search Lectures</h1>
        <p className="text-muted-foreground">
          Find devotional lectures by keyword, speaker, or category
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4 p-6 bg-muted rounded-lg">
        <div>
          <label className="block text-sm font-semibold mb-2">Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search lectures, transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 px-4 py-2 rounded border border-border bg-background"
            />
            <Button onClick={handleSubmit} disabled={isLoading}>
              <SearchIcon className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Speaker</label>
            <select
              value={selectedSpeaker}
              onChange={(e) => { setSelectedSpeaker(e.target.value); setPage(1) }}
              className="w-full px-4 py-2 rounded border border-border bg-background"
            >
              <option value="">All Speakers</option>
              {filtersLoading ? <option disabled>Loading...</option> : speakers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1) }}
              className="w-full px-4 py-2 rounded border border-border bg-background"
            >
              <option value="">All Categories</option>
              {filtersLoading ? <option disabled>Loading...</option> : categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={handleReset} className="w-full">Reset Filters</Button>
          </div>
        </div>

        {/* Admin-only: search all toggle */}
        {isAdmin && (
          <label className="flex items-center gap-2.5 cursor-pointer w-fit pt-1">
            <input
              type="checkbox"
              checked={searchAll}
              onChange={(e) => { setSearchAll(e.target.checked); setPage(1) }}
              className="w-4 h-4 accent-amber-600"
            />
            <span className="text-sm font-medium">
              Search all transcripts
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">(including unpublished — admin only)</span>
            </span>
          </label>
        )}
      </div>

      {!isLoading && results.length > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          Found {total} lecture{total !== 1 ? 's' : ''}
          {searchAll && <span className="ml-1.5 text-amber-600 font-medium">(all statuses)</span>}
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg">{error}</div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No lectures found</h2>
          <p className="text-muted-foreground">
            {searchQuery || selectedSpeaker || selectedCategory
              ? 'Try adjusting your search criteria'
              : searchAll ? 'No lectures exist yet' : 'No published lectures yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {results.map((result) => (
              <Link key={result.lectureId} href={`/lecture/${result.slug}`}>
                <Card className="h-full cursor-pointer hover:shadow-lg hover:border-saffron-400 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-lg">{result.title}</CardTitle>
                      {searchAll && (() => {
                        const sm = STATUS_META[result.status]
                        return (
                          <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 ${sm?.color ?? 'bg-slate-100 text-slate-600'}`}>
                            {sm?.label ?? result.status}
                          </span>
                        )
                      })()}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <User className="w-4 h-4" />{result.speaker}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{result.snippet}</p>
                    {result.matchTimestamps.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold mb-2">Jump to:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.matchTimestamps.slice(0, 3).map((ts) => (
                            <button key={ts} onClick={(e) => e.preventDefault()}
                              className="text-xs px-2 py-1 bg-saffron-100 dark:bg-saffron-900 text-saffron-800 dark:text-saffron-100 rounded hover:bg-saffron-200 transition-colors">
                              {formatTimestamp(ts)}
                            </button>
                          ))}
                          {result.matchTimestamps.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{result.matchTimestamps.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    <Button variant="outline" className="w-full mt-2" size="sm">View Lecture</Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
