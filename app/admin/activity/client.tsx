'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, User, BookOpen, Zap, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ActivityRow {
  id: number
  action: string
  metadata: unknown
  createdAt: Date | string
  userName: string | null
  userEmail: string | null
  userRole: string | null
  lectureTitle: string | null
  lectureSlug: string | null
}

interface Props {
  rows: ActivityRow[]
  page: number
  totalPages: number
  total: number
  userFilter: string
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  transcript_corrected:  { label: 'Corrected',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' },
  proofread_completed:   { label: 'Proofread',      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
  transcript_submitted:  { label: 'Submitted',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
  comment_added:         { label: 'Comment',         color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  lecture_completed:     { label: 'Completed',       color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  lecture_assigned:      { label: 'Assigned',        color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200' },
  status_changed:        { label: 'Status changed',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' },
}

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action.replace(/_/g, ' '), color: 'bg-muted text-muted-foreground' }
}

function fmtDateTime(d: Date | string) {
  const date = new Date(d)
  return {
    date: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

function roleColor(role: string | null) {
  if (role === 'admin') return 'bg-saffron-100 text-saffron-700 dark:bg-saffron-900 dark:text-saffron-200'
  if (role === 'corrector') return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
  if (role === 'proofreader') return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
  return 'bg-muted text-muted-foreground'
}

export function ActivityClient({ rows, page, totalPages, total, userFilter }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(userFilter)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce: push to URL 400ms after user stops typing, reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('user', search.trim())
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const goTo = (p: number) => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('user', search.trim())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {userFilter && (
          <span className="text-xs text-muted-foreground">
            Showing results for <span className="font-medium text-foreground">&ldquo;{userFilter}&rdquo;</span>
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} {userFilter ? 'matching' : 'total'} events</span>
        <span>Page {page} of {totalPages || 1}</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left font-medium">When</th>
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium w-36">Action</th>
              <th className="px-4 py-3 text-left font-medium">Lecture</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No activity recorded yet
                </td>
              </tr>
            ) : rows.map((row, i) => {
              const { date, time } = fmtDateTime(row.createdAt)
              const am = actionMeta(row.action)
              const meta = row.metadata as Record<string, unknown> | null

              return (
                <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                  {/* When */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium">{date}</div>
                    <div className="text-xs text-muted-foreground">{time}</div>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-xs font-medium leading-tight">{row.userName ?? 'Unknown'}</div>
                        <Badge className={`text-[10px] px-1.5 py-0 mt-0.5 ${roleColor(row.userRole)}`}>
                          {row.userRole ?? 'viewer'}
                        </Badge>
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${am.color}`}>{am.label}</Badge>
                  </td>

                  {/* Lecture */}
                  <td className="px-4 py-3">
                    {row.lectureSlug ? (
                      <Link href={`/lecture/${row.lectureSlug}`} className="flex items-center gap-1.5 text-xs hover:underline text-foreground max-w-[220px]">
                        <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="line-clamp-2 leading-snug">{row.lectureTitle}</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Details from metadata */}
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px]">
                    {meta
                      ? Object.entries(meta)
                          .filter(([, v]) => v !== null && v !== undefined)
                          .map(([k, v]) => (
                            <span key={k} className="inline-block mr-2">
                              <span className="text-muted-foreground/60">{k}:</span> {String(v)}
                            </span>
                          ))
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                  : <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => goTo(p as number)}
                    >
                      {p}
                    </Button>
              )}
          </div>

          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goTo(page + 1)}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
