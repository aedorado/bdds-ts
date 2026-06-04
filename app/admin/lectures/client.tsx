'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, Pencil, X, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, Search } from 'lucide-react'
import {
  updateLectureAction,
  deleteLectureAction,
  assignCorrectorAction,
  assignProofreaderAction,
} from '@/lib/db/actions'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

const INPUT = 'w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring'
const LABEL = 'block text-xs font-medium text-muted-foreground mb-1'

// ─── constants ───────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Unassigned',               color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  assigned:    { label: 'Correction In Progress',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
  corrected:   { label: 'Proofreading In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' },
  proofread:   { label: 'Ready to Publish',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
  published:   { label: 'Published',                color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  archived:    { label: 'Archived',                 color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

const ALL_STATUSES = Object.keys(STATUS_META)

type SortKey = 'title' | 'lectureDate' | 'createdAt' | 'status'
type SortDir = 'asc' | 'desc'

// ─── types ───────────────────────────────────────────────────────────────────

interface Lecture {
  id: number
  slug: string
  title: string
  speaker: string
  status: string
  category?: string | null
  place?: string | null
  youtubeUrl?: string | null
  audioUrl?: string | null
  assignedCorrectorId?: number | null
  assignedProofreaderId?: number | null
  lectureDate?: Date | string | null
  createdAt: Date | string
  createdBy: number
  notes?: string | null
  rawTranscript?: string | null
  tags?: string[] | null
  durationSeconds?: number | null
  aiGenerationStatus?: string | null
  aiGenerationStartedAt?: Date | string | null
  aiGenerationCompletedAt?: Date | string | null
  aiGenerationError?: string | null
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface AdminLecturesClientProps {
  initialLectures: Lecture[]
  totalLectures: number
  userId: number
  contributors: User[]
  currentUserId: number
}

type FormState = {
  slug: string; title: string; speaker: string; category: string
  youtubeUrl: string; audioUrl: string; place: string; lectureDate: string
  notes: string; rawTranscript: string; tags: string; durationSeconds: string
}

const EMPTY_FORM: FormState = {
  slug: '', title: '', speaker: '', category: '',
  youtubeUrl: '', audioUrl: '', place: '', lectureDate: '',
  notes: '', rawTranscript: '', tags: '', durationSeconds: '',
}

// ─── main component ──────────────────────────────────────────────────────────

export function AdminLecturesClient({ initialLectures, totalLectures, contributors, currentUserId }: AdminLecturesClientProps) {
  const [lectures, setLectures] = useState<Lecture[]>(initialLectures)
  const [error, setError] = useState<string | null>(null)

  // edit modal
  const [editLecture, setEditLecture] = useState<Lecture | null>(null)
  const [editData, setEditData] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [metaLoading, setMetaLoading] = useState(false)

  // table controls
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // ── stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of ALL_STATUSES) counts[s] = 0
    for (const l of lectures) counts[l.status] = (counts[l.status] ?? 0) + 1
    return counts
  }, [lectures])

  // ── filtered + sorted ──────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let rows = [...lectures]
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.speaker.toLowerCase().includes(q) ||
        l.slug.toLowerCase().includes(q) ||
        (l.category ?? '').toLowerCase().includes(q)
      )
    }
    if (filterStatus) rows = rows.filter(l => l.status === filterStatus)
    rows.sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      if (sortKey === 'title')       { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
      if (sortKey === 'status')      { av = a.status; bv = b.status }
      if (sortKey === 'lectureDate') { av = a.lectureDate ? new Date(a.lectureDate).getTime() : 0; bv = b.lectureDate ? new Date(b.lectureDate).getTime() : 0 }
      if (sortKey === 'createdAt')   { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime() }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [lectures, search, filterStatus, sortKey, sortDir])

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" /> :
    sortDir === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />

  const handleInput = (set: React.Dispatch<React.SetStateAction<FormState>>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      set(prev => ({ ...prev, [name]: value }))
    }

  const handleYoutubeBlur = async (url: string, set: React.Dispatch<React.SetStateAction<FormState>>) => {
    if (!url.trim() || !url.includes('youtube')) return
    setMetaLoading(true)
    try {
      const res = await fetch(`/api/youtube-meta?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const meta = await res.json()
      set(prev => ({
        ...prev,
        title: prev.title || meta.title,
        speaker: prev.speaker || meta.author,
        slug: prev.slug || slugify(meta.title),
      }))
    } catch { /* silent */ } finally { setMetaLoading(false) }
  }

  const buildSubmitData = (fd: FormState) => ({
    slug: fd.slug.toLowerCase(),
    title: fd.title,
    speaker: fd.speaker,
    category: fd.category || undefined,
    youtubeUrl: fd.youtubeUrl || undefined,
    audioUrl: fd.audioUrl || undefined,
    place: fd.place || undefined,
    lectureDate: fd.lectureDate ? new Date(fd.lectureDate) : undefined,
    notes: fd.notes || undefined,
    rawTranscript: fd.rawTranscript || undefined,
    tags: fd.tags ? fd.tags.split(',').map(t => t.trim()) : undefined,
    durationSeconds: fd.durationSeconds ? parseInt(fd.durationSeconds) : undefined,
  })

  const openEdit = (l: Lecture) => {
    setEditLecture(l)
    setEditData({
      slug: l.slug,
      title: l.title,
      speaker: l.speaker,
      category: l.category ?? '',
      youtubeUrl: l.youtubeUrl ?? '',
      audioUrl: l.audioUrl ?? '',
      place: l.place ?? '',
      lectureDate: l.lectureDate ? new Date(l.lectureDate).toISOString().slice(0, 10) : '',
      notes: l.notes ?? '',
      rawTranscript: l.rawTranscript ?? '',
      tags: l.tags ? l.tags.join(', ') : '',
      durationSeconds: l.durationSeconds ? String(l.durationSeconds) : '',
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editLecture) return
    setSaving(true); setError(null)
    try {
      const result = await updateLectureAction(editLecture.id, buildSubmitData(editData))
      if (result.success && result.lecture) {
        setLectures(prev => prev.map(l => l.id === editLecture.id ? { ...l, ...result.lecture as unknown as Lecture } : l))
        setEditLecture(null)
      } else setError(result.error || 'Failed to update lecture')
    } catch (err) { setError(err instanceof Error ? err.message : 'An error occurred') }
    finally { setSaving(false) }
  }

  const [assigningLectureId, setAssigningLectureId] = useState<number | null>(null)

  const handleAssignCorrector = async (lectureId: number, correctorId: number | null) => {
    setAssigningLectureId(lectureId)
    try {
      const result = await assignCorrectorAction(lectureId, correctorId)
      if (result.success && result.lecture)
        setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, assignedCorrectorId: correctorId, status: result.lecture.status } : l))
      else setError(result.error || 'Failed to assign corrector')
    } finally {
      setAssigningLectureId(null)
    }
  }

  const handleAssignProofreader = async (lectureId: number, proofreaderId: number | null) => {
    setAssigningLectureId(lectureId)
    try {
      const result = await assignProofreaderAction(lectureId, proofreaderId)
      if (result.success)
        setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, assignedProofreaderId: proofreaderId } : l))
      else setError(result.error || 'Failed to assign proofreader')
    } finally {
      setAssigningLectureId(null)
    }
  }

  const [statusConfirm, setStatusConfirm] = useState<{ lectureId: number; fromStatus: string; toStatus: string; title: string } | null>(null)

  const handleStatusChange = (lecture: Lecture, newStatus: string) => {
    if (newStatus === lecture.status) return
    setStatusConfirm({ lectureId: lecture.id, fromStatus: lecture.status, toStatus: newStatus, title: lecture.title })
  }

  const confirmStatusChange = async () => {
    if (!statusConfirm) return
    const { lectureId, toStatus } = statusConfirm
    const result = await updateLectureAction(lectureId, { status: toStatus })
    if (result.success && result.lecture) {
      setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, status: toStatus } : l))
      setStatusConfirm(null)
    } else {
      setError(result.error || 'Failed to update status')
    }
  }

  const handleDelete = async (lectureId: number) => {
    if (!confirm('Delete this lecture? This cannot be undone.')) return
    const result = await deleteLectureAction(lectureId)
    if (result.success) setLectures(prev => prev.filter(l => l.id !== lectureId))
    else setError(result.error || 'Failed to delete lecture')
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Status stat pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(f => f === s ? '' : s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
              ${filterStatus === s
                ? `${STATUS_META[s].color} border-transparent ring-2 ring-offset-1 ring-current`
                : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'}`}
          >
            <span>{STATUS_META[s].label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filterStatus === s ? 'bg-white/30' : 'bg-muted'}`}>
              {stats[s]}
            </span>
          </button>
        ))}
        <span className="ml-auto flex items-center text-xs text-muted-foreground">
          {totalLectures} total
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search title, speaker, slug…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Link href="/admin/lectures/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Lecture
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">
                <button className="flex items-center font-medium hover:text-foreground" onClick={() => handleSort('title')}>
                  Title <SortIcon col="title" />
                </button>
              </th>
              <th className="px-4 py-3 text-left w-32">
                <button className="flex items-center font-medium hover:text-foreground" onClick={() => handleSort('status')}>
                  Status <SortIcon col="status" />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium w-40">Corrector</th>
              <th className="px-4 py-3 text-left font-medium w-40">Proofreader</th>
              <th className="px-4 py-3 text-center font-medium w-12">AI</th>
              <th className="px-3 py-3 w-20 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  {search || filterStatus ? 'No lectures match your filters.' : 'No lectures yet. Add the first one!'}
                </td>
              </tr>
            ) : displayed.map((lecture, i) => (
              <tr key={lecture.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                {/* Title */}
                <td className="px-4 py-3">
                  <Link href={`/lecture/${lecture.slug}`} className="font-medium leading-snug hover:underline line-clamp-2">
                    {lecture.title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {lecture.speaker}{lecture.category ? ` · ${lecture.category}` : ''}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <select
                    value={lecture.status}
                    onChange={e => handleStatusChange(lecture, e.target.value)}
                    className={`px-2 py-1 text-xs rounded border-0 cursor-pointer font-medium ${STATUS_META[lecture.status]?.color ?? STATUS_META.not_started.color}`}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </td>

                {/* Corrector */}
                <td className="px-4 py-3">
                  <div className="relative">
                    <select
                      value={lecture.assignedCorrectorId ?? ''}
                      onChange={e => handleAssignCorrector(lecture.id, e.target.value ? parseInt(e.target.value) : null)}
                      disabled={assigningLectureId === lecture.id}
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Unassigned</option>
                      {contributors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {assigningLectureId === lecture.id && (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground pointer-events-none" />
                    )}
                  </div>
                </td>

                {/* Proofreader */}
                <td className="px-4 py-3">
                  <div className="relative">
                    <select
                      value={lecture.assignedProofreaderId ?? ''}
                      onChange={e => handleAssignProofreader(lecture.id, e.target.value ? parseInt(e.target.value) : null)}
                      disabled={assigningLectureId === lecture.id}
                      className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Unassigned</option>
                      {contributors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {assigningLectureId === lecture.id && (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground pointer-events-none" />
                    )}
                  </div>
                </td>

                {/* AI Status */}
                <td className="px-4 py-3 text-center">
                  {!lecture.aiGenerationStatus ? (
                    <button
                      title="AI generation not started"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-300 transition-colors"
                    >
                      AI
                    </button>
                  ) : lecture.aiGenerationStatus === 'pending' ? (
                    <button
                      title="AI generation in progress"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold animate-pulse hover:bg-yellow-200 transition-colors"
                    >
                      AI
                    </button>
                  ) : lecture.aiGenerationStatus === 'completed' ? (
                    <button
                      title="AI generation completed"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-[10px] font-bold hover:bg-green-200 transition-colors"
                    >
                      ✓
                    </button>
                  ) : (
                    <button
                      title={`AI generation failed: ${lecture.aiGenerationError || 'Unknown error'}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-[10px] font-bold hover:bg-red-200 transition-colors"
                    >
                      ✗
                    </button>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/lecture/${lecture.slug}`} title="Open lecture" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(lecture)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {lecture.createdBy === currentUserId ? (
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(lecture.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    ) : (
                      <span title="Only the admin who added this lecture can delete it" className="inline-flex items-center justify-center w-8 h-8">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground/30" />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Status change confirmation ───────────────────────────────────────── */}
      {statusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setStatusConfirm(null)}>
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-base">Confirm Status Change</h2>
              <button onClick={() => setStatusConfirm(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are changing the status of <span className="font-medium text-foreground">&ldquo;{statusConfirm.title}&rdquo;</span>:
              </p>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_META[statusConfirm.fromStatus]?.color}`}>
                  {STATUS_META[statusConfirm.fromStatus]?.label}
                </span>
                <span className="text-muted-foreground text-sm">→</span>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_META[statusConfirm.toStatus]?.color}`}>
                  {STATUS_META[statusConfirm.toStatus]?.label}
                </span>
              </div>
              {/* Warn if going backwards */}
              {ALL_STATUSES.indexOf(statusConfirm.toStatus) < ALL_STATUSES.indexOf(statusConfirm.fromStatus) && (
                <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-md">
                  ⚠️ This is a <strong>backwards</strong> move in the pipeline. The assigned contributor will be able to re-do their stage.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setStatusConfirm(null)}>Cancel</Button>
              <Button size="sm" onClick={confirmStatusChange}>Confirm Change</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────────────── */}
      {editLecture && (
        <Modal title={`Edit: ${editLecture.title}`} onClose={() => setEditLecture(null)} wide>
          <LectureForm
            data={editData}
            onChange={handleInput(setEditData)}
            onYoutubeBlur={url => handleYoutubeBlur(url, setEditData)}
            onGenerateSlug={slug => setEditData(prev => ({ ...prev, slug }))}
            metaLoading={metaLoading}
            contributors={contributors}
            editMode
            currentStatus={editLecture.status}
            onSubmit={handleSaveEdit}
            loading={saving}
            submitLabel="Save Changes"
            onCancel={() => setEditLecture(null)}
          />
        </Modal>
      )}
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-background border border-border rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${wide ? 'max-w-3xl' : 'max-w-2xl'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-base">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Shared lecture form ───────────────────────────────────────────────────────

interface LectureFormProps {
  data: FormState
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onYoutubeBlur: (url: string) => void
  onGenerateSlug: (slug: string) => void
  metaLoading: boolean
  contributors: User[]
  editMode?: boolean
  currentStatus?: string
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  submitLabel: string
  onCancel: () => void
}

function LectureForm({ data, onChange, onYoutubeBlur, onGenerateSlug, metaLoading, onSubmit, loading, submitLabel, onCancel }: LectureFormProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* YouTube URL — first so auto-fill triggers before other fields */}
        <div className="sm:col-span-2">
          <label className={LABEL}>
            YouTube URL
            {metaLoading && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin" />}
          </label>
          <input type="url" name="youtubeUrl" value={data.youtubeUrl} onChange={onChange}
            onBlur={e => onYoutubeBlur(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className={INPUT} />
          <p className="text-[11px] text-muted-foreground mt-1">Paste URL and tab out — title, speaker & slug will auto-fill</p>
        </div>

        {/* Title */}
        <div className="sm:col-span-2">
          <label className={LABEL}>Title *</label>
          <input type="text" name="title" value={data.title} onChange={onChange} required placeholder="Lecture title" className={INPUT} />
        </div>

        {/* Speaker */}
        <div>
          <label className={LABEL}>Speaker *</label>
          <input type="text" name="speaker" value={data.speaker} onChange={onChange} required placeholder="Speaker name" className={INPUT} />
        </div>

        {/* Category */}
        <div>
          <label className={LABEL}>Category</label>
          <input type="text" name="category" value={data.category} onChange={onChange} placeholder="e.g. Bhagavad Gita" className={INPUT} />
        </div>

        {/* Slug */}
        <div>
          <label className={LABEL}>Slug *</label>
          <div className="flex gap-2">
            <input type="text" name="slug" value={data.slug} onChange={onChange} required placeholder="url-friendly-slug" className={INPUT} />
            {!data.youtubeUrl.trim() && (
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={() => {
                    const parts = [data.title, data.speaker].filter(Boolean)
                    const baseSlug = slugify(parts.join(' ') || 'lecture')
                    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
                    const slug = `${baseSlug}-${randomSuffix}`
                    onGenerateSlug(slug)
                  }}
                  className="px-3 py-2 text-xs font-medium bg-muted hover:bg-muted/80 border border-border rounded transition-colors whitespace-nowrap"
                >
                  Generate
                </button>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-slate-950 text-slate-100 text-xs px-2.5 py-1.5 rounded shadow-lg pointer-events-none">
                    title + speaker + 4 random digits
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-3 border-transparent border-t-slate-950"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lecture Date */}
        <div>
          <label className={LABEL}>Lecture Date</label>
          <input type="date" name="lectureDate" value={data.lectureDate} onChange={onChange} className={INPUT} />
        </div>

        {/* Place */}
        <div>
          <label className={LABEL}>Place</label>
          <input type="text" name="place" value={data.place} onChange={onChange} placeholder="City, Country" className={INPUT} />
        </div>

        {/* Audio URL */}
        <div>
          <label className={LABEL}>Audio URL</label>
          <input type="url" name="audioUrl" value={data.audioUrl} onChange={onChange} placeholder="https://…/audio.mp3" className={INPUT} />
        </div>

        {/* Duration */}
        <div>
          <label className={LABEL}>Duration (seconds)</label>
          <input type="number" name="durationSeconds" value={data.durationSeconds} onChange={onChange} placeholder="3600" min="0" className={INPUT} />
        </div>

        {/* Tags */}
        <div>
          <label className={LABEL}>Tags (comma-separated)</label>
          <input type="text" name="tags" value={data.tags} onChange={onChange} placeholder="tag1, tag2" className={INPUT} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={LABEL}>Notes</label>
        <textarea name="notes" value={data.notes} onChange={onChange} rows={2}
          placeholder="Internal notes" className={INPUT} />
      </div>

      {/* Raw Transcript */}
      <div>
        <label className={LABEL}>Raw Transcript</label>
        <textarea name="rawTranscript" value={data.rawTranscript} onChange={onChange} rows={5}
          placeholder="Paste raw transcript here…" className={INPUT} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
