'use client'

import { useState, useEffect, useRef } from 'react'
import { Play } from 'lucide-react'
import { useTranscriptEditor } from '@/lib/transcript'

interface Block { speaker: string | null; text: string }

interface SyncedTranscriptProps {
  blocks: Block[]
  onSeek: (seconds: number) => void
  currentTime?: number
  disabled?: boolean
  autoScroll?: boolean
}

const TIMESTAMP_RE = /\((\d+):(\d{2})(?::(\d{2}))?\)/g

function parseTimestampSeconds(str: string): number | null {
  const match = str.match(/\((\d+):(\d{2})(?::(\d{2}))?\)/)
  if (!match) return null
  const [, a, b, c] = match

  // Format is either (M:SS) or (H:MM:SS)
  if (c) {
    // Has 3 parts: (H:MM:SS)
    return parseInt(a, 10) * 3600 + parseInt(b, 10) * 60 + parseInt(c, 10)
  } else {
    // Has 2 parts: (M:SS)
    return parseInt(a, 10) * 60 + parseInt(b, 10)
  }
}

export function countTimestamps(blocks: Block[]): number {
  let count = 0
  for (const block of blocks) {
    const matches = block.text.match(/\((\d+):(\d{2})(?::(\d{2}))?\)/g)
    if (matches) count += matches.length
  }
  return count
}

export function shouldShowSync(blocks: Block[]): boolean {
  if (blocks.length === 0) return false
  const totalTimestamps = countTimestamps(blocks)
  return totalTimestamps >= 5
}

function extractFirstTimestamp(text: string): { label: string; seconds: number } | null {
  const match = text.match(TIMESTAMP_RE)
  if (!match) return null
  const seconds = parseTimestampSeconds(match[0])
  if (seconds === null) return null
  return { label: match[0], seconds }
}

function renderTextWithTimestamps(text: string, onSeek: (seconds: number) => void) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  TIMESTAMP_RE.lastIndex = 0
  while ((match = TIMESTAMP_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    const seconds = parseTimestampSeconds(match[0])
    if (seconds !== null) {
      parts.push(
        <button
          key={`ts-${match.index}`}
          onClick={() => onSeek(seconds)}
          className="text-saffron-600 hover:text-saffron-700 font-mono text-sm inline-flex items-center gap-0.5 cursor-pointer transition-colors"
          title="Jump to timestamp"
        >
          <Play className="w-2.5 h-2.5" />
          {match[0]}
        </button>
      )
    } else {
      parts.push(<span key={`ts-fallback-${match.index}`}>{match[0]}</span>)
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-end`}>{text.slice(lastIndex)}</span>)
  }

  return parts
}

export function SyncedTranscript({ blocks, onSeek, currentTime = 0, disabled = false, autoScroll = true }: SyncedTranscriptProps) {
  const showSync = !disabled && shouldShowSync(blocks)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showSync || currentTime === undefined) return
    let closestIndex = -1
    let closestDist = Infinity

    for (let i = 0; i < blocks.length; i++) {
      const ts = extractFirstTimestamp(blocks[i].text)
      if (!ts) continue
      const dist = Math.abs(ts.seconds - currentTime)
      if (ts.seconds <= currentTime && dist < closestDist) {
        closestIndex = i
        closestDist = dist
      }
    }

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex >= 0 ? closestIndex : null)
      if (autoScroll && closestIndex >= 0) {
        const el = document.getElementById(`synced-block-${closestIndex}`)
        if (el && Math.abs(el.getBoundingClientRect().top - window.innerHeight / 2) > 100) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [currentTime, blocks, activeIndex, showSync, autoScroll])

  if (!showSync) {
    return (
      <div className="space-y-4 text-sm leading-relaxed">
        {blocks.map((block, i) => (
          <div key={i}>
            {block.speaker && (
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {block.speaker}
              </p>
            )}
            <p className="text-foreground/90 whitespace-pre-wrap break-words">{block.text}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-4 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const isActive = activeIndex === i
        const ts = extractFirstTimestamp(block.text)
        return (
          <div
            key={i}
            id={`synced-block-${i}`}
            className={`transition-colors px-2 py-1 rounded ${isActive ? 'bg-saffron-50/50 dark:bg-saffron-950/30 border-l-2 border-saffron-600' : ''}`}
          >
            {block.speaker && (
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {block.speaker}
              </p>
            )}
            <p className="text-foreground/90 whitespace-pre-wrap break-words">
              {renderTextWithTimestamps(block.text, onSeek)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
