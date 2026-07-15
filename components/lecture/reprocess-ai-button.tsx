'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { reprocessLectureAiAction } from '@/lib/db/actions'
import { useRouter } from 'next/navigation'

interface ReprocessAiButtonProps {
  lectureId: number
  status?: string | null
  error?: string | null
  variant?: 'button' | 'badge'
  onTriggered?: () => void
}

export function ReprocessAiButton({
  lectureId,
  status,
  error,
  variant = 'button',
  onTriggered,
}: ReprocessAiButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReprocess = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmReprocess = window.confirm(
      'Are you sure you want to regenerate the AI summary, key teachings, themes, quotes, scriptural verses, personalities, and Q&A for this lecture? This will run in the background.'
    )

    if (!confirmReprocess) return

    setLoading(true)
    try {
      const res = await reprocessLectureAiAction(lectureId)
      if (res.success) {
        if (onTriggered) {
          onTriggered()
        } else {
          router.refresh()
        }
      } else {
        alert(`Error triggering AI reprocessing: ${res.error}`)
      }
    } catch (err) {
      alert(`An unexpected error occurred: ${err instanceof Error ? err.message : err}`)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'badge') {
    // Return badges styled exactly like the ones in the admin client.tsx but clickable
    if (loading) {
      return (
        <button
          disabled
          title="AI generation triggering..."
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold cursor-not-allowed"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </button>
      )
    }

    if (!status) {
      return (
        <button
          onClick={handleReprocess}
          title="AI generation not started. Click to trigger."
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-300 transition-colors cursor-pointer"
        >
          AI
        </button>
      )
    }

    if (status === 'pending') {
      return (
        <button
          onClick={handleReprocess}
          title="AI generation in progress. Click to re-trigger."
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold animate-pulse hover:bg-yellow-200 transition-colors cursor-pointer"
        >
          AI
        </button>
      )
    }

    if (status === 'completed') {
      return (
        <button
          onClick={handleReprocess}
          title="AI generation completed. Click to reprocess."
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-[10px] font-bold hover:bg-green-200 transition-colors cursor-pointer"
        >
          ✓
        </button>
      )
    }

    // Failed
    return (
      <button
        onClick={handleReprocess}
        title={`AI generation failed: ${error || 'Unknown error'}. Click to retry.`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-[10px] font-bold hover:bg-red-200 transition-colors cursor-pointer"
      >
        ✗
      </button>
    )
  }

  // Button variant for details header
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-saffron-200 text-saffron-700 hover:bg-saffron-50 dark:border-saffron-900/50 dark:text-saffron-400 dark:hover:bg-saffron-950/20"
      disabled={loading || status === 'pending'}
      onClick={handleReprocess}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Queueing AI...
        </>
      ) : status === 'pending' ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
          AI Running...
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5" />
          Reprocess AI
        </>
      )}
    </Button>
  )
}
