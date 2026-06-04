'use client'

import { Play } from 'lucide-react'
import { ForwardedRef, forwardRef } from 'react'

interface Block {
  speaker: string | null
  text: string
  isHeading?: boolean
  headingLevel?: number | null
  timestampLabel?: string | null
  timestampSeconds?: number | null
  isActive?: boolean
  ref?: ForwardedRef<HTMLDivElement>
}

interface Props {
  blocks: Block[]
  onSeek?: (seconds: number) => void
}

const TIMESTAMP_RE = /[\[\(](\d+):(\d{2})(?::(\d{2}))?[\]\)]/g

function parseTimestampSeconds(str: string): number | null {
  const match = str.match(/[\[\(](\d+):(\d{2})(?::(\d{2}))?[\]\)]/)
  if (!match) return null
  const [, a, b, c] = match

  if (c) {
    return parseInt(a, 10) * 3600 + parseInt(b, 10) * 60 + parseInt(c, 10)
  } else {
    return parseInt(a, 10) * 60 + parseInt(b, 10)
  }
}

function renderTextWithTimestamps(text: string, onSeek?: (seconds: number) => void) {
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
          onClick={() => onSeek?.(seconds)}
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

export function TranscriptDisplay({ blocks, onSeek }: Props) {
  return (
    <div className="text-sm leading-normal space-y-2">
      {blocks.map((block, i) => {
        // Only show speaker header if different from previous block (and not a heading)
        const showSpeaker = !block.isHeading && (i === 0 || block.speaker !== blocks[i - 1]?.speaker)
        const isActive = block.isActive ?? false

        if (block.isHeading) {
          const headingClass = block.headingLevel === 1 ? 'text-xl font-bold' : block.headingLevel === 2 ? 'text-lg font-semibold' : 'text-base font-medium'
          return (
            <div key={i} ref={block.ref} className={`rounded-sm px-3 py-2 transition-colors ${isActive ? 'bg-saffron-100/60' : 'bg-transparent'}`}>
              <p className={`${headingClass} text-foreground mt-4 mb-2`}>
                {renderTextWithTimestamps(block.text, onSeek)}
              </p>
            </div>
          )
        }

        return (
          <div
            key={i}
            ref={block.ref}
            className={`rounded-sm px-3 py-2 transition-colors ${
              isActive ? 'bg-saffron-100/60' : 'bg-transparent'
            }`}
          >
            {showSpeaker && block.speaker && (
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
