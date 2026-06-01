'use client'

import Link from 'next/link'
import { ArrowLeft, Eye, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { TranscriptSegment } from '@/lib/transcript/parser'
import { TranscriptViewer } from '@/components/editor/transcript-viewer'
import { CommentsPanel } from '@/components/editor/comments-panel'
import { useState } from 'react'
import { cn } from '@/lib/utils'

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

interface TranscriptViewClientProps {
  lecture: LectureData
  segments: TranscriptSegment[]
  userRole: string
}

export function TranscriptViewClient({ lecture, segments, userRole }: TranscriptViewClientProps) {
  const [showComments, setShowComments] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-border px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <Link href={`/lecture/${lecture.slug}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          <div className="text-center min-w-0">
            <h1 className="text-base font-bold truncate">{lecture.title}</h1>
            <p className="text-xs text-muted-foreground">{lecture.speaker}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Eye className="w-3 h-3" />
              Viewer mode
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowComments(v => !v)}>
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Comments</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Transcript viewer */}
        <div className={`flex-1 overflow-y-auto ${showComments ? 'hidden md:block' : ''}`}>
          <TranscriptViewer
            segments={segments}
            youtubeUrl={lecture.youtubeUrl}
            audioUrl={lecture.audioUrl}
          />
        </div>

        {/* Comments sidebar */}
        {showComments && (
          <div className="w-full md:w-80 border-l border-border flex flex-col bg-background">
            <div className="flex items-center justify-between px-4 pt-3 md:hidden">
              <span className="font-semibold text-sm">Comments</span>
              <Button variant="ghost" size="sm" onClick={() => setShowComments(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CommentsPanel lectureId={lecture.id} canEdit={false} />
          </div>
        )}
      </div>

      {/* Role badge */}
      <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg opacity-80">
        Signed in as <strong>{userRole}</strong> — read-only access
      </div>
    </div>
  )
}
