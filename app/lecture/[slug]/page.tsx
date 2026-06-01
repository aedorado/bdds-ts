import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft, Calendar, Clock, MapPin, User, Edit2, BookOpen, Lightbulb, Tag, Layers } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getLectureWithAiBySlug, getLectureById } from '@/lib/db/queries'
import { hasRole } from '@/lib/auth/middleware'
import { cn } from '@/lib/utils'
import { StatusActionButton } from './status-action-button'
import { BackButton } from './back-button'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const lecture = await getLectureWithAiBySlug(slug)
  if (!lecture) return { title: 'Lecture Not Found' }

  const description = lecture.ai?.summary
    ?? lecture.notes
    ?? `Devotional lecture by ${lecture.speaker}${lecture.place ? ` at ${lecture.place}` : ''}.`

  return {
    title: lecture.title,
    description: description.slice(0, 160),
    keywords: lecture.tags ?? undefined,
    openGraph: {
      title: lecture.title,
      description: description.slice(0, 160),
      type: 'article',
      ...(lecture.thumbnailUrl && { images: [{ url: lecture.thumbnailUrl }] }),
      ...(lecture.lectureDate && { publishedTime: lecture.lectureDate.toISOString() }),
    },
    twitter: {
      card: 'summary_large_image',
      title: lecture.title,
      description: description.slice(0, 160),
      ...(lecture.thumbnailUrl && { images: [lecture.thumbnailUrl] }),
    },
  }
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function JsonLd({ lecture }: { lecture: NonNullable<Awaited<ReturnType<typeof getLectureWithAiBySlug>>> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: lecture.title,
    author: { '@type': 'Person', name: lecture.speaker },
    ...(lecture.lectureDate && { datePublished: lecture.lectureDate.toISOString() }),
    ...(lecture.thumbnailUrl && { image: lecture.thumbnailUrl }),
    ...(lecture.place && { locationCreated: { '@type': 'Place', name: lecture.place } }),
    ...(lecture.ai?.summary && { description: lecture.ai.summary }),
    ...(lecture.tags?.length && { keywords: lecture.tags.join(', ') }),
    articleBody: (lecture.cleanedTranscript || lecture.rawTranscript || '').slice(0, 10000),
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default async function LecturePage({ params }: Props) {
  const { slug } = await params

  // Redirect numeric slugs to real slug
  if (/^\d+$/.test(slug)) {
    const byId = await getLectureById(parseInt(slug))
    if (byId) redirect(`/lecture/${byId.slug}`)
    notFound()
  }

  const lecture = await getLectureWithAiBySlug(slug)
  if (!lecture) notFound()

  const session = await getSession()

  // Edit Transcript is only shown when it's the user's active turn in the pipeline
  const canEdit = session && (
    session.role === 'admin' ||
    (lecture.assignedCorrectorId === session.userId && lecture.status === 'assigned') ||
    (lecture.assignedProofreaderId === session.userId && lecture.status === 'corrected')
  )
  const transcript = lecture.cleanedTranscript || lecture.rawTranscript

  // Pipeline action button for the current user
  let pipelineAction: { action: 'correct' | 'proofread' | 'publish'; label: string } | null = null
  if (session) {
    const isAdmin = session.role === 'admin'
    if (lecture.status === 'assigned' && (isAdmin || lecture.assignedCorrectorId === session.userId)) {
      pipelineAction = { action: 'correct', label: 'Mark as Corrected' }
    } else if (lecture.status === 'corrected' && (isAdmin || lecture.assignedProofreaderId === session.userId)) {
      pipelineAction = { action: 'proofread', label: 'Mark as Proofread' }
    } else if (lecture.status === 'proofread' && isAdmin) {
      pipelineAction = { action: 'publish', label: 'Publish Lecture' }
    }
  }

  // Badge shown next to the user's name indicating their role on this lecture
  let contributorRole: 'Corrector' | 'Proofreader' | null = null
  if (session) {
    if (lecture.assignedCorrectorId === session.userId) contributorRole = 'Corrector'
    else if (lecture.assignedProofreaderId === session.userId) contributorRole = 'Proofreader'
  }
  const transcriptBlocks = transcript ? groupTranscriptBySpeaker(transcript) : []

  const statusColors: Record<string, string> = {
    not_started: 'bg-slate-100 text-slate-600',
    assigned:    'bg-blue-100 text-blue-700',
    corrected:   'bg-amber-100 text-amber-700',
    proofread:   'bg-purple-100 text-purple-700',
    published:   'bg-green-100 text-green-700',
    archived:    'bg-slate-100 text-slate-400',
  }
  const statusLabels: Record<string, string> = {
    not_started: 'Unassigned',
    assigned:    'Correction In Progress',
    corrected:   'Proofreading In Progress',
    proofread:   'Ready to Publish',
    published:   'Published',
    archived:    'Archived',
  }

  const hasSidebar = !!(
    lecture.ai?.keyTeachings?.length ||
    lecture.ai?.themes?.length ||
    lecture.tags?.length ||
    lecture.youtubeUrl ||
    lecture.audioUrl ||
    lecture.notes
  )

  return (
    <>
      <JsonLd lecture={lecture} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton />

        {/* Thumbnail */}
        {lecture.thumbnailUrl && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <Image
              src={lecture.thumbnailUrl}
              alt={lecture.title}
              width={1280}
              height={400}
              className="w-full h-72 object-cover"
              priority
            />
          </div>
        )}

        {/* Title + meta — full width above the columns */}
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-3">
            {lecture.category && (
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 bg-saffron-100 text-saffron-800 rounded">
                {lecture.category}
              </span>
            )}
            <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColors[lecture.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {statusLabels[lecture.status] ?? lecture.status}
            </span>
            {contributorRole && (
              <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700">
                Your role: {contributorRole}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold font-heading leading-tight">
              {lecture.title}
            </h1>
            <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-1">
              {canEdit && (
                <Link href={`/lecture/${lecture.slug}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Transcript
                </Link>
              )}
              {pipelineAction && (
                <StatusActionButton
                  lectureId={lecture.id}
                  action={pipelineAction.action}
                  label={pipelineAction.label}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{lecture.speaker}</span>
            {lecture.lectureDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(lecture.lectureDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            {lecture.place && (
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{lecture.place}</span>
            )}
            {lecture.durationSeconds && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatDuration(lecture.durationSeconds)}</span>
            )}
          </div>
        </header>

        {/* Two-column layout on large screens when there's sidebar content */}
        <div className={hasSidebar ? 'flex flex-col lg:grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] lg:gap-10 lg:items-start' : ''}>

          {/* ── Main column ── */}
          <article className="order-2 lg:order-1 mt-6 lg:mt-0">
            {/* AI Summary */}
            {lecture.ai?.summary && (
              <Card className="mb-8 border-saffron-200 bg-saffron-50 dark:bg-saffron-950/20 dark:border-saffron-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-saffron-600" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{lecture.ai.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Full Transcript */}
            {transcriptBlocks.length > 0 ? (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm leading-relaxed">
                    {transcriptBlocks.map((block, i) => (
                      <div key={i}>
                        {block.speaker && (
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            {block.speaker}
                          </p>
                        )}
                        <p className="text-foreground/90">
                          <TranscriptText text={block.text} showTimestamps={!!canEdit} />
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-8 border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No transcript available yet.
                </CardContent>
              </Card>
            )}
          </article>

          {/* ── Sidebar ── */}
          {hasSidebar && (
            <aside className="order-1 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-1 space-y-6">

              {/* Key Teachings */}
              {lecture.ai?.keyTeachings?.length ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Key Teachings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3 list-none">
                      {lecture.ai.keyTeachings.map((t, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ) : null}

              {/* Themes */}
              {lecture.ai?.themes?.length ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-4 h-4 text-violet-500" />
                      Themes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {lecture.ai.themes.map((theme, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                          {theme}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              {/* Tags */}
              {lecture.tags?.length ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {lecture.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/search?q=${encodeURIComponent(tag)}`}
                          className="text-xs px-2.5 py-1 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Media */}
              {(lecture.youtubeUrl || lecture.audioUrl) && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Media</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {lecture.youtubeUrl && (
                      <a
                        href={lecture.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-saffron-600 hover:underline text-sm font-medium block"
                      >
                        Watch on YouTube →
                      </a>
                    )}
                    {lecture.audioUrl && (
                      <audio controls className="w-full">
                        <source src={lecture.audioUrl} />
                      </audio>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {lecture.notes && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{lecture.notes}</p>
                  </CardContent>
                </Card>
              )}

            </aside>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Inline timestamp renderer ────────────────────────────────────────────────
// Splits text on (H:MM:SS) / (MM:SS) patterns and renders timestamps dimmed.

const INLINE_TS_RE = /(\(\d+:\d{2}(?::\d{2})?\))/g

function TranscriptText({ text, showTimestamps }: { text: string; showTimestamps: boolean }) {
  const parts = text.split(INLINE_TS_RE)
  return (
    <>
      {parts.map((part, i) =>
        /^\(\d+:\d{2}(?::\d{2})?\)$/.test(part) ? (
          showTimestamps ? (
            <span key={i} className="text-[11px] text-muted-foreground/60 font-mono mx-0.5 select-none">
              {part}
            </span>
          ) : null
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ─── Viewer grouping ──────────────────────────────────────────────────────────
// Splits transcript on blank lines (the natural paragraph breaks already in the
// raw text). Each non-empty chunk becomes one paragraph. Chunks that are purely
// a speaker label are treated as headers rather than body text.

interface TranscriptBlock { speaker: string | null; text: string }

function groupTranscriptBySpeaker(raw: string): TranscriptBlock[] {
  const chunks = raw.split(/\n{2,}/).map(c => c.trim()).filter(Boolean)

  // Matches legacy "[Speaker 1]" pure-label chunks
  const LEGACY_LABEL_RE = /^\[?Speaker\s+\d+\]?(\s*\(.*?\))?$/i
  // Matches a timestamp at the start of a line: (58:47) or (1:00:25)
  const TIMESTAMP_START_RE = /^\(\d+:\d{2}(?::\d{2})?\)/

  const blocks: TranscriptBlock[] = []
  let currentSpeaker: string | null = null

  for (const chunk of chunks) {
    if (LEGACY_LABEL_RE.test(chunk)) {
      currentSpeaker = chunk
      continue
    }

    const lines = chunk.split('\n')
    const firstLine = lines[0].trim()
    const rest = lines.slice(1).join('\n').trim()

    // Named-speaker format: first line is a short name with no timestamp,
    // second line starts with a timestamp → split into speaker + text
    if (
      rest &&
      firstLine.length <= 80 &&
      !TIMESTAMP_START_RE.test(firstLine) &&
      TIMESTAMP_START_RE.test(rest)
    ) {
      blocks.push({ speaker: firstLine, text: rest })
    } else {
      blocks.push({ speaker: currentSpeaker, text: chunk })
    }
  }

  return blocks
}
