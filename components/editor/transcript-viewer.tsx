'use client'

import { useState, useRef, useEffect } from 'react'
import { TranscriptSegment } from '@/lib/transcript/parser'
import { normalizeAudioUrl } from '@/lib/utils/audio-utils'
import { Search, X, ChevronUp, ChevronDown, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  youtubeUrl?: string | null
  audioUrl?: string | null
}

export function TranscriptViewer({ segments, youtubeUrl, audioUrl }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const matchingSegments = searchQuery.trim()
    ? segments.reduce<number[]>((acc, seg, i) => {
        if (seg.text.toLowerCase().includes(searchQuery.toLowerCase())) acc.push(i)
        return acc
      }, [])
    : []

  useEffect(() => {
    if (matchingSegments.length > 0) {
      setCurrentMatchIndex(0)
    }
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (matchingSegments.length > 0) {
      const el = document.getElementById(`view-segment-${matchingSegments[currentMatchIndex]}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentMatchIndex, matchingSegments])

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)
    return match?.[1]
  }

  const seekToTimestamp = (seconds: number | null) => {
    if (seconds === null) return
    // Update active segment
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].timestampSeconds !== null && segments[i].timestampSeconds! <= seconds) {
        setActiveSegmentIndex(i)
        break
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-border p-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{segments.length} segments</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setIsSearchOpen(v => !v); setSearchQuery('') }}
          className={isSearchOpen ? 'bg-muted' : ''}
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Search bar */}
      {isSearchOpen && (
        <div className="sticky top-[52px] z-10 bg-muted p-3 flex gap-2 items-center border-b border-border">
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded border border-border bg-background text-sm"
            autoFocus
          />
          {matchingSegments.length > 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentMatchIndex + 1} / {matchingSegments.length}
            </span>
          )}
          <Button variant="outline" size="sm" disabled={matchingSegments.length === 0}
            onClick={() => setCurrentMatchIndex(i => i === 0 ? matchingSegments.length - 1 : i - 1)}>
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={matchingSegments.length === 0}
            onClick={() => setCurrentMatchIndex(i => (i + 1) % matchingSegments.length)}>
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setIsSearchOpen(false); setSearchQuery('') }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Media player */}
      {youtubeUrl && getYouTubeId(youtubeUrl) && (
        <div className="p-4 border-b border-border">
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(youtubeUrl)}`}
            className="w-full max-w-lg aspect-video rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {!youtubeUrl && audioUrl && (
        <div className="p-4 border-b border-border">
          <audio controls className="w-full">
            <source src={normalizeAudioUrl(audioUrl)} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Transcript */}
      <div ref={containerRef} className="max-w-4xl mx-auto w-full p-6 space-y-2 font-transcript">
        {segments.map((segment, index) => {
          const isMatch = matchingSegments.includes(index)
          const isCurrentMatch = matchingSegments[currentMatchIndex] === index
          const isActive = activeSegmentIndex === index

          return (
            <div
              key={segment.id}
              id={`view-segment-${index}`}
              className={`transcript-segment ${isActive ? 'active' : ''} ${isCurrentMatch ? 'ring-2 ring-saffron-500 rounded' : ''} ${isMatch && !isCurrentMatch ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
            >
              {segment.timestampLabel && (
                <button
                  onClick={() => seekToTimestamp(segment.timestampSeconds)}
                  className="transcript-segment-timestamp hover:text-saffron-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title="Jump to this timestamp"
                >
                  <Play className="w-3 h-3" />
                  {segment.timestampLabel}
                </button>
              )}

              {segment.speaker && !segment.isHeading && (
                <span className="transcript-speaker-pill">{segment.speaker}</span>
              )}

              <div className={`p-2 whitespace-pre-wrap break-words ${segment.isHeading ? `transcript-heading-h${segment.headingLevel}` : ''}`}>
                {highlightText(segment.text, searchQuery)}
              </div>
            </div>
          )
        })}

        {segments.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-2">No transcript available yet.</p>
            <p className="text-sm">This lecture is awaiting transcription.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}
