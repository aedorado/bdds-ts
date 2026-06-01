'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { TranscriptSegment } from '@/lib/transcript/parser'

export interface TranscriptEditorContextValue {
  segments: TranscriptSegment[]
  activeSegmentIndex: number | null
  currentTimeSeconds: number
  isSearchOpen: boolean
  searchQuery: string
  searchMatches: { segmentIndex: number; matches: number[] }[]
  currentSearchIndex: number
  distractionFreeMode: boolean
  pendingFocus: { index: number; cursorPos: number } | null

  // Actions
  setSegments: (segments: TranscriptSegment[]) => void
  updateSegment: (index: number, updates: Partial<TranscriptSegment>) => void
  setActiveSegmentIndex: (index: number | null) => void
  setCurrentTime: (time: number) => void
  seekTo: (time: number) => void
  // Video player seek — registered by MediaPlayer, called by editor on timestamp click
  registerSeekPlayer: (fn: (seconds: number) => void) => void
  seekPlayer: (seconds: number) => void
  // Structural edits
  splitSegment: (index: number, beforeText: string, afterText: string) => void
  mergeSegmentWithPrevious: (index: number, currentText: string) => void
  clearPendingFocus: () => void
  setPendingFocus: (focus: { index: number; cursorPos: number } | null) => void
  // Search
  toggleSearch: () => void
  setSearchQuery: (query: string) => void
  nextSearchMatch: () => void
  previousSearchMatch: () => void
  toggleDistractionFree: () => void
}

const TranscriptEditorContext = createContext<TranscriptEditorContextValue | undefined>(undefined)

export function TranscriptEditorProvider({ children }: { children: React.ReactNode; lectureId?: number }) {
  const [segments, setSegmentsState] = useState<TranscriptSegment[]>([])
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null)
  const [currentTimeSeconds, setCurrentTimeState] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQueryState] = useState('')
  const [searchMatches, setSearchMatches] = useState<{ segmentIndex: number; matches: number[] }[]>([])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [distractionFreeMode, setDistractionFreeMode] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<{ index: number; cursorPos: number } | null>(null)

  // Holds the player's seekTo function — set by MediaPlayer in onReady
  const seekPlayerFnRef = useRef<((seconds: number) => void) | null>(null)

  const registerSeekPlayer = useCallback((fn: (seconds: number) => void) => {
    seekPlayerFnRef.current = fn
  }, [])

  const seekPlayer = useCallback((seconds: number) => {
    seekPlayerFnRef.current?.(seconds)
  }, [])

  // Update time + highlight active segment
  const handleSetCurrentTime = useCallback((time: number) => {
    setCurrentTimeState(time)
    setSegmentsState(prev => {
      let activeIndex: number | null = null
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].timestampSeconds !== null && prev[i].timestampSeconds! <= time) {
          activeIndex = i
          break
        }
      }
      setActiveSegmentIndex(activeIndex)
      return prev // no state change, just side-effecting
    })
  }, [])

  const setSegments = useCallback((segs: TranscriptSegment[]) => {
    setSegmentsState(segs)
  }, [])

  const updateSegment = useCallback((index: number, updates: Partial<TranscriptSegment>) => {
    setSegmentsState(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s))
  }, [])

  const seekTo = useCallback((time: number) => {
    handleSetCurrentTime(time)
    seekPlayerFnRef.current?.(time)
  }, [handleSetCurrentTime])

  // Split segment[index] at a cursor position into two segments
  const splitSegment = useCallback((index: number, beforeText: string, afterText: string) => {
    setSegmentsState(prev => {
      const seg = prev[index]
      const first: TranscriptSegment = { ...seg, text: beforeText.trimEnd() }
      const second: TranscriptSegment = {
        ...seg,
        id: `${seg.id}-s${Date.now()}`,
        text: afterText.trimStart(),
        timestampSeconds: null,
        timestampLabel: null,
      }
      const next = [...prev]
      next.splice(index, 1, first, second)
      return next
    })
    setPendingFocus({ index: index + 1, cursorPos: 0 })
  }, [])

  // Merge segment[index] into the end of segment[index-1]
  const mergeSegmentWithPrevious = useCallback((index: number, currentText: string) => {
    if (index === 0) return
    setSegmentsState(prev => {
      const prevSeg = prev[index - 1]
      const merged: TranscriptSegment = {
        ...prevSeg,
        text: prevSeg.text.trimEnd() + ' ' + currentText.trimStart(),
      }
      const next = [...prev]
      next.splice(index - 1, 2, merged)
      return next
    })
    // -1 signals "put cursor at end"
    setPendingFocus({ index: index - 1, cursorPos: -1 })
  }, [])

  const clearPendingFocus = useCallback(() => setPendingFocus(null), [])

  const toggleSearch = useCallback(() => {
    setIsSearchOpen(prev => {
      if (prev) { setSearchQueryState(''); setSearchMatches([]) }
      return !prev
    })
  }, [])

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query)
    setCurrentSearchIndex(0)
    if (!query.trim()) { setSearchMatches([]); return }

    const lower = query.toLowerCase()
    const matches: { segmentIndex: number; matches: number[] }[] = []
    setSegmentsState(prev => {
      prev.forEach((seg, si) => {
        const t = seg.text.toLowerCase()
        const m: number[] = []
        let start = 0, idx: number
        while ((idx = t.indexOf(lower, start)) !== -1) { m.push(idx); start = idx + 1 }
        if (m.length) matches.push({ segmentIndex: si, matches: m })
      })
      setSearchMatches(matches)
      return prev
    })
  }, [])

  const nextSearchMatch = useCallback(() => {
    if (!searchMatches.length) return
    const next = (currentSearchIndex + 1) % searchMatches.length
    setCurrentSearchIndex(next)
    const m = searchMatches[next]
    if (m) {
      setSegmentsState(prev => {
        const t = prev[m.segmentIndex]?.timestampSeconds
        if (t != null) seekTo(t)
        return prev
      })
    }
  }, [searchMatches, currentSearchIndex, seekTo])

  const previousSearchMatch = useCallback(() => {
    if (!searchMatches.length) return
    const prev2 = currentSearchIndex === 0 ? searchMatches.length - 1 : currentSearchIndex - 1
    setCurrentSearchIndex(prev2)
    const m = searchMatches[prev2]
    if (m) {
      setSegmentsState(prev => {
        const t = prev[m.segmentIndex]?.timestampSeconds
        if (t != null) seekTo(t)
        return prev
      })
    }
  }, [searchMatches, currentSearchIndex, seekTo])

  const toggleDistractionFree = useCallback(() => setDistractionFreeMode(p => !p), [])

  const value: TranscriptEditorContextValue = {
    segments,
    activeSegmentIndex,
    currentTimeSeconds,
    isSearchOpen,
    searchQuery,
    searchMatches,
    currentSearchIndex,
    distractionFreeMode,
    pendingFocus,

    setSegments,
    updateSegment,
    setActiveSegmentIndex,
    setCurrentTime: handleSetCurrentTime,
    seekTo,
    registerSeekPlayer,
    seekPlayer,
    splitSegment,
    mergeSegmentWithPrevious,
    clearPendingFocus,
    setPendingFocus,
    toggleSearch,
    setSearchQuery: handleSetSearchQuery,
    nextSearchMatch,
    previousSearchMatch,
    toggleDistractionFree,
  }

  return (
    <TranscriptEditorContext.Provider value={value}>
      {children}
    </TranscriptEditorContext.Provider>
  )
}

export function useTranscriptEditor() {
  const ctx = useContext(TranscriptEditorContext)
  if (!ctx) throw new Error('useTranscriptEditor must be used within TranscriptEditorProvider')
  return ctx
}
