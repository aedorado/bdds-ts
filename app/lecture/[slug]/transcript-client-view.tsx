'use client'

import { useState } from 'react'
import { useTranscriptEditor } from '@/lib/transcript'
import { SyncedTranscript, shouldShowSync, countTimestamps } from '@/components/media/synced-transcript'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Radio, RadioOff, ChevronDown } from 'lucide-react'

interface Block { speaker: string | null; text: string; isHeading?: boolean; headingLevel?: number | null; timestampLabel?: string | null; timestampSeconds?: number | null }

interface Props {
  blocks: Block[]
}

export function TranscriptClientView({ blocks }: Props) {
  const { currentTimeSeconds, seekPlayer } = useTranscriptEditor()
  const timestampCount = countTimestamps(blocks)
  const canSync = shouldShowSync(blocks)
  const [syncDisabled, setSyncDisabled] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const isSyncActive = canSync && !syncDisabled

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Transcript
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {canSync && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSyncDisabled(!syncDisabled)}
                className={`h-auto text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                  isSyncActive
                    ? 'bg-saffron-100 text-saffron-700 dark:bg-saffron-950/50 dark:text-saffron-400 hover:bg-saffron-200 dark:hover:bg-saffron-950/70'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={isSyncActive ? 'Click to disable sync' : 'Click to enable sync'}
              >
                {isSyncActive ? (
                  <>
                    <Radio className="w-3 h-3 mr-1.5 animate-pulse" />
                    <span>Sync</span>
                  </>
                ) : (
                  <>
                    <RadioOff className="w-3 h-3 mr-1.5" />
                    <span>Sync off</span>
                  </>
                )}
              </Button>
            )}
            {isSyncActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`h-auto text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                  autoScroll
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-950/70'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                title={autoScroll ? 'Click to disable auto-scroll' : 'Click to enable auto-scroll'}
              >
                <ChevronDown className="w-3 h-3 mr-1" />
                <span>{autoScroll ? 'Auto-scroll' : 'No scroll'}</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {canSync && !isSyncActive && (
          <div className="mb-3 text-xs text-muted-foreground/70 p-2 bg-muted/40 rounded border border-border/50">
            💡 Sync is disabled. Click the toggle above to re-enable.
          </div>
        )}
        {!canSync && timestampCount > 0 && (
          <div className="mb-3 text-xs text-muted-foreground/70 p-2 bg-muted/40 rounded border border-border/50">
            💡 Found {timestampCount} timestamp{timestampCount !== 1 ? 's' : ''} — sync needs ≥5 timestamps to activate
          </div>
        )}
        <SyncedTranscript
          blocks={blocks}
          onSeek={seekPlayer}
          currentTime={isSyncActive ? currentTimeSeconds : 0}
          disabled={syncDisabled}
          autoScroll={autoScroll}
        />
      </CardContent>
    </Card>
  )
}
