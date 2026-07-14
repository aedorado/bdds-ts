'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createLectureAction } from '@/lib/db/actions'

const INPUT = 'w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring'
const LABEL = 'block text-xs font-medium text-muted-foreground mb-1'

type FormState = {
  slug: string; title: string; speaker: string; category: string
  youtubeUrl: string; audioUrl: string; place: string; lectureDate: string
  notes: string; rawTranscript: string; tags: string; durationSeconds: string
  isPublic: boolean
}

const EMPTY: FormState = {
  slug: '', title: '', speaker: '', category: '',
  youtubeUrl: '', audioUrl: '', place: '', lectureDate: '',
  notes: '', rawTranscript: '', tags: '', durationSeconds: '',
  isPublic: false,
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60)
}

interface Filters {
  speakers: string[]
  categories: string[]
  places: string[]
}

export function NewLectureClient() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [metaLoading, setMetaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    speakers: [],
    categories: [],
    places: [],
  })
  const [filtersLoading, setFiltersLoading] = useState(true)

  // Fetch filters on mount with timeout
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

        const res = await fetch('/api/lectures/filters', { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!res.ok) throw new Error('Failed to fetch filters')
        const data = await res.json()
        setFilters(data)
      } catch (err) {
         console.error('Error fetching filters:', err)
         // Silently fail - form still works without suggestions
      } finally {
        setFiltersLoading(false)
      }
    }

    fetchFilters()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleYoutubeBlur = async (url: string) => {
    if (!url.trim() || !url.includes('youtube')) return
    setMetaLoading(true)
    try {
      const res = await fetch(`/api/youtube-meta?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const meta = await res.json()
      setForm(prev => ({
        ...prev,
        title: prev.title || meta.title,
        speaker: prev.speaker || meta.author,
        slug: prev.slug || slugify(meta.title),
      }))
    } catch { /* silent */ } finally { setMetaLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createLectureAction({
      slug: form.slug.toLowerCase(),
      title: form.title,
      speaker: form.speaker,
      category: form.category || undefined,
      youtubeUrl: form.youtubeUrl || undefined,
      audioUrl: form.audioUrl || undefined,
      place: form.place || undefined,
      lectureDate: form.lectureDate ? new Date(form.lectureDate) : undefined,
      notes: form.notes || undefined,
      rawTranscript: form.rawTranscript || undefined,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : undefined,
      durationSeconds: form.durationSeconds ? parseInt(form.durationSeconds) : undefined,
      isPublic: form.isPublic,
    })
    setLoading(false)
    if (result.success) {
      router.push('/admin/lectures')
    } else {
      setError(result.error ?? 'Failed to create lecture')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={LABEL}>
            YouTube URL
            {metaLoading && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin" />}
          </label>
          <input type="url" name="youtubeUrl" value={form.youtubeUrl} onChange={handleChange}
            onBlur={e => handleYoutubeBlur(e.target.value)}
            placeholder="https://youtube.com/watch?v=…" className={INPUT} />
          <p className="text-[11px] text-muted-foreground mt-1">Paste URL and tab out — title, speaker &amp; slug will auto-fill</p>
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>Title *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange} required placeholder="Lecture title" className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Speaker *</label>
          {!filtersLoading ? (
            <Combobox
              options={filters.speakers}
              value={form.speaker}
              onValueChange={(value) =>
                setForm(prev => ({ ...prev, speaker: value }))
              }
              placeholder="Select or type speaker name..."
              searchPlaceholder="Search speakers..."
            />
          ) : (
            <input
              type="text"
              name="speaker"
              value={form.speaker}
              onChange={handleChange}
              required
              placeholder="Speaker name"
              className={INPUT}
            />
          )}
        </div>

        <div>
          <label className={LABEL}>Category</label>
          {!filtersLoading ? (
            <Combobox
              options={filters.categories}
              value={form.category}
              onValueChange={(value) =>
                setForm(prev => ({ ...prev, category: value }))
              }
              placeholder="Select or type category..."
              searchPlaceholder="Search categories..."
            />
          ) : (
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Bhagavad Gita"
              className={INPUT}
            />
          )}
        </div>

        <div>
          <label className={LABEL}>Slug *</label>
          <div className="flex gap-2">
            <input type="text" name="slug" value={form.slug} onChange={handleChange} required placeholder="url-friendly-slug" className={INPUT} />
            {!form.youtubeUrl.trim() && (
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={() => {
                    const parts = [form.title, form.speaker].filter(Boolean)
                    const baseSlug = slugify(parts.join(' ') || 'lecture')
                    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
                    const slug = `${baseSlug}-${randomSuffix}`
                    setForm(prev => ({ ...prev, slug }))
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

        <div>
          <label className={LABEL}>Lecture Date</label>
          <input type="date" name="lectureDate" value={form.lectureDate} onChange={handleChange} className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Place</label>
          {!filtersLoading ? (
            <Combobox
              options={filters.places}
              value={form.place}
              onValueChange={(value) =>
                setForm(prev => ({ ...prev, place: value }))
              }
              placeholder="Select or type place..."
              searchPlaceholder="Search places..."
            />
          ) : (
            <input
              type="text"
              name="place"
              value={form.place}
              onChange={handleChange}
              placeholder="City, Country"
              className={INPUT}
            />
          )}
        </div>

        <div>
          <label className={LABEL}>Audio URL</label>
          <input type="url" name="audioUrl" value={form.audioUrl} onChange={handleChange} placeholder="https://…/audio.mp3 or https://drive.google.com/file/d/…" className={INPUT} />
          <p className="text-[11px] text-muted-foreground mt-1">Supports: Direct MP3/WAV, Google Drive, Dropbox, YouTube, or other audio hosts</p>
        </div>

        <div>
          <label className={LABEL}>Duration (seconds)</label>
          <input type="number" name="durationSeconds" value={form.durationSeconds} onChange={handleChange} placeholder="3600" min="0" className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Tags (comma-separated)</label>
          <input type="text" name="tags" value={form.tags} onChange={handleChange} placeholder="tag1, tag2" className={INPUT} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Internal notes" className={INPUT} />
      </div>

      <div className="flex items-center gap-2 py-2">
        <input
          type="checkbox"
          id="isPublic"
          name="isPublic"
          checked={form.isPublic}
          onChange={handleChange}
          className="w-4 h-4 accent-amber-600 rounded border-gray-300 text-saffron-600 focus:ring-saffron-500"
        />
        <label htmlFor="isPublic" className="text-sm font-medium text-foreground cursor-pointer">
          Publicly Visible <span className="text-xs text-muted-foreground font-normal">(bypasses status pipeline)</span>
        </label>
      </div>

      <div>
        <label className={LABEL}>Raw Transcript</label>
        <textarea name="rawTranscript" value={form.rawTranscript} onChange={handleChange} rows={8} placeholder="Paste raw transcript here…" className={INPUT} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Lecture
        </Button>
        <Link href="/admin/lectures">
          <Button type="button" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
        </Link>
      </div>
    </form>
  )
}
