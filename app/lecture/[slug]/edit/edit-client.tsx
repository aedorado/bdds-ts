'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, MessageSquare, X, CheckCircle2, Clock, Info, Video, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TranscriptSegment } from '@/lib/transcript/parser'
import {
  TranscriptEditorProvider,
  saveTranscriptAction,
} from '@/lib/transcript'
import { TranscriptEditor } from '@/components/editor/transcript-editor'
import { CommentsPanel } from '@/components/editor/comments-panel'
import { MediaPlayer } from '@/components/media/player'
import { useEditorActivity } from '@/lib/hooks/useEditorActivity'
import { useActivityTracker } from '@/hooks/useActivityTracker'
import { usePointsAward } from '@/hooks/usePointsAward'
import posthog from 'posthog-js'

interface LectureData {
  id: number
  slug: string
  title: string
  speaker: string
  place?: string
  lectureDate?: string
  category?: string
  status: string
  youtubeUrl?: string
  audioUrl?: string
}

interface TranscriptEditClientProps {
  lecture: LectureData
  segments: TranscriptSegment[]
  userRole: string
  userName: string
  userEmail?: string
}

// Sends a heartbeat every 60s while the tab is visible, awarding editing points.
function useEditingHeartbeat(lectureId: number) {
  const activeRef = useRef(true)
  const minutesRef = useRef(0)

  useEffect(() => {
    const INTERVAL_MS = 60_000

    const sendHeartbeat = async () => {
      if (!activeRef.current) return
      try {
        await fetch('/api/editing/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lectureId }),
        })
        minutesRef.current += 1
      } catch { /* silent — don't block editing */ }
    }

    const onVisibility = () => { activeRef.current = document.visibilityState === 'visible' }
    document.addEventListener('visibilitychange', onVisibility)

    const timer = setInterval(sendHeartbeat, INTERVAL_MS)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [lectureId])
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not started', color: 'bg-slate-100 text-slate-700' },
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  correcting: { label: 'Correcting', color: 'bg-amber-100 text-amber-700' },
  proofreading: { label: 'Proofreading', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completed', color: 'bg-tulasi-100 text-tulasi-700' },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-500' },
}

function useResizer(initialWidth: number) {
  const [width, setWidth] = useState(initialWidth)
  const isDragging = useRef(false)
  
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      // Since the sidebar is on the right, its width is (window width - mouse X)
      const newWidth = window.innerWidth - e.clientX
      setWidth(Math.max(300, Math.min(newWidth, window.innerWidth * 0.8)))
    }
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])
  
  return { 
    width, 
    startDragging: () => { 
      isDragging.current = true
      document.body.style.cursor = 'col-resize'
    } 
  }
}

export function TranscriptEditClient({
  lecture,
  segments,
  userRole,
  userName,
  userEmail,
}: TranscriptEditClientProps) {
  useEditingHeartbeat(lecture.id)

  // Track activity (mouse, keyboard, tab visibility, idle time)
  // Disabled: useEditorActivity causes lag with mousemove/touchmove listeners on document
  // const activityTracker = useEditorActivity({
  //   lectureId: lecture.id,
  //   lectureSlug: lecture.slug,
  // })

  const editorRef = useRef<HTMLDivElement>(null)
  useActivityTracker(editorRef)

  // Points award every 5 minutes (only on edit screen)
  const { pointsAwarded } = usePointsAward()

  const sessionStartTimeRef = useRef<number>(Date.now())
  const lastPostHogEventRef = useRef<number>(0)
  const POSTHOG_THROTTLE_MS = 2 * 60 * 1000 // 2 minutes

  const [showSidebar, setShowSidebar] = useState<'info' | 'comments' | null>(null)
  const hasMedia = !!(lecture.youtubeUrl || lecture.audioUrl)
  const [playerOpen, setPlayerOpen] = useState(hasMedia)
  const [playerCollapsed, setPlayerCollapsed] = useState(false)
  
  const { width: playerWidth, startDragging } = useResizer(450)

  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const checkSize = () => setIsDesktop(window.innerWidth >= 1024)
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  const status = STATUS_LABELS[lecture.status] ?? { label: lecture.status, color: 'bg-muted text-muted-foreground' }

  useEffect(() => {
    posthog.capture('transcript_editing_started', {
      lecture_id: lecture.id,
      slug: lecture.slug,
      title: lecture.title,
      speaker: lecture.speaker,
      status: lecture.status,
      user_role: userRole,
      user_name: userName,
      user_email: userEmail,
      has_media: hasMedia,
    })

    // Track session duration when leaving edit page
    return () => {
      const sessionDurationMs = Date.now() - sessionStartTimeRef.current
      const sessionDurationMinutes = Math.floor(sessionDurationMs / 60000)

      posthog.capture('transcript_editing_ended', {
        lecture_id: lecture.id,
        slug: lecture.slug,
        title: lecture.title,
        speaker: lecture.speaker,
        user_role: userRole,
        user_name: userName,
        user_email: userEmail,
        session_duration_ms: sessionDurationMs,
        session_duration_minutes: sessionDurationMinutes,
      })

      console.log(
        `📊 [${new Date().toLocaleTimeString()}] Editing session ended - User: ${userEmail}, Duration: ${sessionDurationMinutes}m`
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (updatedSegments: TranscriptSegment[]) => {
    try {
      await saveTranscriptAction(lecture.id, updatedSegments)
      // activityTracker.recordSave(false) // Disabled: useEditorActivity hook is disabled

      // Throttle PostHog events to max once every 2 minutes
      const now = Date.now();
      if (now - lastPostHogEventRef.current > POSTHOG_THROTTLE_MS) {
        posthog.capture('transcript_saved', {
          lecture_id: lecture.id,
          slug: lecture.slug,
          title: lecture.title,
          speaker: lecture.speaker,
          segment_count: updatedSegments.length,
          user_role: userRole,
        });
        lastPostHogEventRef.current = now;
      }
    } catch (error) {
      posthog.captureException(error)
      throw error
    }
  }

  return (
    <TranscriptEditorProvider lectureId={lecture.id}>
      {/* Full-screen overlay — sits above the main nav so the editor chrome is always visible */}
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-border px-4 py-3 flex-shrink-0">
          <div className="max-w-full flex items-center justify-between gap-3">
            {/* Left */}
            <div className="flex items-center gap-2 min-w-0">
              <Link href={`/lecture/${lecture.slug}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                <ArrowLeft className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Link>

              <div className="min-w-0">
                <h1 className="font-bold text-sm leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {lecture.title}
                </h1>
                <p className="text-xs text-muted-foreground truncate">{lecture.speaker}</p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`hidden sm:inline text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                {status.label}
              </span>
              <span className="hidden md:inline text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {userRole}
              </span>

              {hasMedia && (
                <Button
                  variant={playerOpen ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => { setPlayerOpen(o => !o); setPlayerCollapsed(false) }}
                  title="Toggle video player"
                >
                  <Video className="w-4 h-4" />
                </Button>
              )}

              <Button
                variant={showSidebar === 'info' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowSidebar(s => s === 'info' ? null : 'info')}
                title="Lecture info"
              >
                <Info className="w-4 h-4" />
              </Button>

              <Button
                variant={showSidebar === 'comments' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowSidebar(s => s === 'comments' ? null : 'comments')}
                title="Comments"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor */}
          <div ref={editorRef} className="flex-1 overflow-y-auto relative">
            <TranscriptEditor
              lectureId={lecture.id}
              initialSegments={segments}
              onSave={handleSave}
            />

            {/* Points earned notification */}
            {pointsAwarded && (
              <div className="fixed bottom-6 right-6 animate-bounce bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg">
                <Zap className="w-4 h-4" />
                +{pointsAwarded.pointsAwarded} pts earned!
              </div>
            )}
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="hidden md:flex w-80 border-l border-border flex-col bg-background flex-shrink-0">
              {showSidebar === 'info' && (
                <InfoPanel lecture={lecture} onClose={() => setShowSidebar(null)} />
              )}
              {showSidebar === 'comments' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-semibold text-sm">Comments</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowSidebar(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <CommentsPanel lectureId={lecture.id} canEdit />
                  </div>
                </>
              )}
            </div>
          )}
          {/* Media Player (Unified Side-by-side or Floating) */}
          {hasMedia && playerOpen && (
            <div
              className={cn(
                "bg-slate-900 flex-shrink-0 flex flex-col",
                isDesktop
                  ? "relative border-l border-border h-full"
                  : "fixed z-40 shadow-2xl border border-white/10 rounded-t-xl bottom-0 left-0 right-0 sm:bottom-4 sm:right-4 sm:left-auto sm:w-[400px] sm:rounded-xl"
              )}
              style={isDesktop ? {
                width: `${playerWidth}px`,
                minWidth: '320px',
                maxWidth: '80vw',
              } : {
                resize: 'horizontal',
                overflow: 'hidden',
                direction: 'rtl',
                minWidth: '280px',
                maxWidth: '90vw',
              }}
            >
              {/* Drag Handle (Desktop only) */}
              {isDesktop && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-50 hover:bg-blue-500/50 transition-colors"
                  onMouseDown={startDragging}
                />
              )}

              <div style={!isDesktop ? { direction: 'ltr' } : undefined} className="flex flex-col h-full w-full">
                {/* Titlebar */}
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 bg-slate-800 cursor-pointer select-none shrink-0",
                    !isDesktop ? "rounded-t-xl sm:rounded-t-xl" : ""
                  )}
                  onClick={() => setPlayerCollapsed(c => !c)}
                >
                  <div className="flex items-center gap-2 text-white/80 text-xs font-medium min-w-0">
                    <Video className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">{lecture.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      className="text-white/50 hover:text-white transition-colors p-1"
                      onClick={e => { e.stopPropagation(); setPlayerCollapsed(c => !c) }}
                      title={playerCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {playerCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      className="text-white/50 hover:text-white transition-colors p-1"
                      onClick={e => { e.stopPropagation(); setPlayerOpen(false) }}
                      title="Close player"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Player body */}
                {!playerCollapsed && (
                  <div className={cn("bg-black", isDesktop ? "flex-1 min-h-0 flex flex-col justify-center" : "")}>
                    <MediaPlayer
                      youtubeUrl={lecture.youtubeUrl}
                      audioUrl={lecture.audioUrl}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile sidebar overlay */}
        {showSidebar && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setShowSidebar(null)}>
            <div
              className="absolute right-0 top-0 h-full w-80 bg-background border-l border-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {showSidebar === 'info' && (
                <InfoPanel lecture={lecture} onClose={() => setShowSidebar(null)} />
              )}
              {showSidebar === 'comments' && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-semibold text-sm">Comments</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowSidebar(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <CommentsPanel lectureId={lecture.id} canEdit />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </TranscriptEditorProvider>
  )
}

function InfoPanel({ lecture, onClose }: { lecture: LectureData; onClose: () => void }) {
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">{children}</p>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">Lecture Info</span>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        {/* Lecture metadata */}
        <div><SectionLabel>Title</SectionLabel><p className="font-medium">{lecture.title}</p></div>
        <div><SectionLabel>Speaker</SectionLabel><p>{lecture.speaker}</p></div>
        {lecture.place && <div><SectionLabel>Place</SectionLabel><p>{lecture.place}</p></div>}
        {lecture.lectureDate && (
          <div>
            <SectionLabel>Date</SectionLabel>
            <p className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {new Date(lecture.lectureDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}
        {lecture.category && <div><SectionLabel>Category</SectionLabel><p>{lecture.category}</p></div>}
        {lecture.status && (
          <div>
            <SectionLabel>Status</SectionLabel>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              {lecture.status.charAt(0).toUpperCase() + lecture.status.slice(1)}
            </p>
          </div>
        )}

        {/* Shortcuts */}
        <div className="pt-4 border-t border-border">
          <SectionLabel>Keyboard Shortcuts</SectionLabel>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            {[
              ['Save', '⌘S'], ['Find', '⌘F'], ['Replace', '⌘H'],
              ['Undo', '⌘Z'], ['Redo', '⌘⇧Z'],
              ['Focus mode', '⌘⇧F'], ['Seek −5s', '['], ['Seek +5s', ']'],
              ['Play/pause', 'Space'],
            ].map(([label, key]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <kbd className="bg-muted px-1.5 py-0.5 rounded font-mono">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
