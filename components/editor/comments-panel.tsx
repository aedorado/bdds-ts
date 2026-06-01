'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, CheckCircle2, Circle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Comment {
  id: number
  paragraphIndex: number
  timestampSeconds: number | null
  content: string
  resolved: boolean
  createdAt: string
  user: { id: number; name: string } | null
}

interface CommentsPanelProps {
  lectureId: number
  canEdit: boolean
}

export function CommentsPanel({ lectureId, canEdit }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResolved, setShowResolved] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/lectures/${lectureId}/comments`)
      if (res.ok) setComments(await res.json())
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [lectureId])

  useEffect(() => { fetchComments() }, [fetchComments])

  const submitComment = async () => {
    if (!newComment.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/lectures/${lectureId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphIndex: 0, content: newComment }),
      })
      if (res.ok) {
        const comment = await res.json()
        setComments(prev => [...prev, comment])
        setNewComment('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleResolved = async (commentId: number, resolved: boolean) => {
    const res = await fetch(`/api/lectures/${lectureId}/comments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, resolved: !resolved }),
    })
    if (res.ok) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: !resolved } : c))
    }
  }

  const visible = comments.filter(c => showResolved || !c.resolved)
  const resolvedCount = comments.filter(c => c.resolved).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span className="font-semibold text-sm">Comments</span>
          {comments.length > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {comments.filter(c => !c.resolved).length} open
            </span>
          )}
        </div>
        {resolvedCount > 0 && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowResolved(v => !v)}
          >
            {showResolved ? 'Hide resolved' : `Show ${resolvedCount} resolved`}
          </button>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        )}

        {!isLoading && visible.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Be the first to add one.
          </p>
        )}

        {visible.map(comment => (
          <div
            key={comment.id}
            className={`rounded-lg border p-3 text-sm space-y-1.5 ${
              comment.resolved ? 'opacity-60 bg-muted/30' : 'bg-background'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-xs text-muted-foreground">
                {comment.user?.name ?? 'Unknown'}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
                {canEdit && (
                  <button
                    onClick={() => toggleResolved(comment.id, comment.resolved)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={comment.resolved ? 'Re-open' : 'Mark resolved'}
                  >
                    {comment.resolved
                      ? <CheckCircle2 className="w-4 h-4 text-tulasi-600" />
                      : <Circle className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
            </div>
            <p className="leading-relaxed">{comment.content}</p>
          </div>
        ))}
      </div>

      {/* New comment input */}
      <div className="p-4 border-t border-border space-y-2">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitComment()
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">⌘+Enter to submit</span>
          <Button
            size="sm"
            onClick={submitComment}
            disabled={isSubmitting || !newComment.trim()}
          >
            <Send className="w-3 h-3 mr-1.5" />
            {isSubmitting ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  )
}
