'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, BookOpen, ArrowRight, X } from 'lucide-react'
import { markCorrectedAction, markProofreadAction, publishLectureAction } from '@/lib/db/actions'

interface Props {
  lectureId: number
  action: 'correct' | 'proofread' | 'publish'
  label: string
}

const ACTION_META: Record<string, {
  triggerStyle: string
  confirmStyle: string
  icon: React.ElementType
  from: string
  to: string
  description: string
}> = {
  correct: {
    triggerStyle: 'bg-amber-600 hover:bg-amber-700 text-white',
    confirmStyle: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: CheckCircle2,
    from: 'Assigned',
    to: 'Corrected',
    description: 'You are confirming that the transcript corrections are complete. The lecture will move to the proofreading stage and the assigned proofreader will be notified.',
  },
  proofread: {
    triggerStyle: 'bg-purple-600 hover:bg-purple-700 text-white',
    confirmStyle: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: CheckCircle2,
    from: 'Corrected',
    to: 'Proofread',
    description: 'You are confirming that the proofreading is complete. The lecture will be ready for the admin to publish.',
  },
  publish: {
    triggerStyle: 'bg-green-600 hover:bg-green-700 text-white',
    confirmStyle: 'bg-green-600 hover:bg-green-700 text-white',
    icon: BookOpen,
    from: 'Proofread',
    to: 'Published',
    description: 'You are about to publish this lecture. It will become publicly visible to all visitors.',
  },
}

export function StatusActionButton({ lectureId, action, label }: Props) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = ACTION_META[action]
  const Icon = meta.icon

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result =
      action === 'correct'   ? await markCorrectedAction(lectureId) :
      action === 'proofread' ? await markProofreadAction(lectureId) :
                               await publishLectureAction(lectureId)
    setLoading(false)
    if (result.success) {
      setShowDialog(false)
      router.refresh()
    } else {
      setError(result.error ?? 'Something went wrong')
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="default"
        size="sm"
        className={`gap-1.5 ${meta.triggerStyle}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </Button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !loading && setShowDialog(false)}
        >
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-base">Confirm Workflow Transition</h2>
              <button
                onClick={() => setShowDialog(false)}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Pipeline step visualiser */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                  {meta.from}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  action === 'correct'   ? 'bg-amber-100 text-amber-700' :
                  action === 'proofread' ? 'bg-purple-100 text-purple-700' :
                                          'bg-green-100 text-green-700'
                }`}>
                  {meta.to}
                </span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {meta.description}
              </p>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={loading}
                className={meta.confirmStyle}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {loading ? 'Saving…' : `Confirm — Move to ${meta.to}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
