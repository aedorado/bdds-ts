'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranscriptEditor } from '@/lib/transcript'
import { TranscriptDisplay } from './transcript-display'
import { AlertCircle, BookOpen, Volume2, ScrollText, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Block { speaker: string | null; text: string; isHeading?: boolean; headingLevel?: number | null; timestampLabel?: string | null; timestampSeconds?: number | null }

interface Props {
  blocks: Block[]
}

const TIMESTAMP_RE = /[\[\(](\d+):(\d{2})(?::(\d{2}))?[\]\)]/

function parseTimestampSeconds(str: string): number | null {
  const match = str.match(/[\[\(](\d+):(\d{2})(?::(\d{2}))?[\]\)]/)
  if (!match) return null
  const [, a, b, c] = match
  if (c) return parseInt(a, 10) * 3600 + parseInt(b, 10) * 60 + parseInt(c, 10)
  return parseInt(a, 10) * 60 + parseInt(b, 10)
}

export function TranscriptSyncWrapper({ blocks }: Props) {
  const { currentTimeSeconds, seekPlayer } = useTranscriptEditor()
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null)
  const [blocksWithTs, setBlocksWithTs] = useState(0)
  const activeBlockRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  // Count blocks that have timestamps
  useEffect(() => {
    const count = blocks.filter(b => TIMESTAMP_RE.test(b.text)).length
    setBlocksWithTs(count)
  }, [blocks])

  // Auto-enable sync only once on mount if we have enough timestamps
  useEffect(() => {
    if (!initializedRef.current && blocksWithTs >= 5) {
      setSyncEnabled(true)
      initializedRef.current = true
    }
  }, [blocksWithTs])

  // Find active block based on current time (regardless of sync state)
  useEffect(() => {
    let activeIndex: number | null = null
    let latestTime = -1

    for (let i = 0; i < blocks.length; i++) {
      const regex = new RegExp(TIMESTAMP_RE.source, 'g')
      let match
      while ((match = regex.exec(blocks[i].text)) !== null) {
        const seconds = parseTimestampSeconds(match[0])
        if (seconds !== null && seconds <= currentTimeSeconds && seconds > latestTime) {
          latestTime = seconds
          activeIndex = i
        }
      }
    }

    setActiveBlockIndex(activeIndex)
  }, [currentTimeSeconds, blocks])

  // Auto-scroll to active block
  useEffect(() => {
    if (syncEnabled && autoScrollEnabled && activeBlockRef.current) {
      activeBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeBlockIndex, syncEnabled, autoScrollEnabled])

  const coverage = blocks.length > 0 ? Math.round((blocksWithTs / blocks.length) * 100) : 0
  const hasEnough = blocksWithTs >= 5

  return (
    <Card className="mb-8 border-l-4 border-l-saffron-600">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Transcript
          </CardTitle>

          {/* Pill controls in header */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!hasEnough && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                <AlertCircle className="w-3 h-3" />
                {blocksWithTs} timestamps — sync needs ≥5
              </span>
            )}

            {hasEnough && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-saffron-100 text-saffron-700 font-medium">
                <Volume2 className="w-3 h-3" />
                {coverage}% synced
              </span>
            )}

            {hasEnough && (
              <button
                onClick={() => setSyncEnabled(v => !v)}
                className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  syncEnabled
                    ? 'bg-saffron-500 text-white hover:bg-saffron-600'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {syncEnabled ? 'Sync On' : 'Sync Off'}
              </button>
            )}

            <button
              onClick={() => setAutoScrollEnabled(v => !v)}
              disabled={!syncEnabled}
              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                syncEnabled
                  ? autoScrollEnabled
                    ? 'bg-saffron-500 text-white hover:bg-saffron-600'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
              }`}
              title={syncEnabled ? 'Toggle auto-scroll' : 'Enable sync first'}
            >
              <ScrollText className="w-3 h-3" />
              {autoScrollEnabled ? 'Auto-scroll' : 'Manual'}
            </button>

            <button
              onClick={() => setShowTimestamps(v => !v)}
              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                showTimestamps
                  ? 'bg-saffron-500 text-white hover:bg-saffron-600'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
              title="Toggle timestamps visibility"
            >
              <Clock className="w-3 h-3" />
              {showTimestamps ? 'Show times' : 'Hide times'}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <TranscriptDisplay
          blocks={blocks.map((block, i) => ({
            ...block,
            text: showTimestamps ? block.text : block.text.replace(/\(\d+:\d{2}(?::\d{2})?\)\s*/g, ''),
            isActive: syncEnabled && i === activeBlockIndex,
            ref: i === activeBlockIndex ? activeBlockRef : undefined,
          }) as any)}
          onSeek={seekPlayer}
        />
      </CardContent>
    </Card>
  )
}
