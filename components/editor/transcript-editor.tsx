'use client'

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useTranscriptEditor } from '@/lib/transcript/context'
import { useSegmentMarker } from '@/lib/hooks/useSegmentMarker'
import { TranscriptSegment, extractTimestamp } from '@/lib/transcript/parser'
import { getSpeakerColor } from '@/lib/transcript/speaker-colors'
import { Button } from '@/components/ui/button'
import { Search, X, ChevronUp, ChevronDown, ZoomOut, ZoomIn, Pencil, Undo2, Redo2, Check, Plus, Bookmark } from 'lucide-react'
import { debounce } from '@/lib/utils'

interface TranscriptEditorProps {
  lectureId: number
  initialSegments: TranscriptSegment[]
  onSave?: (segments: TranscriptSegment[]) => Promise<void>
}

export function TranscriptEditor({ lectureId, initialSegments, onSave }: TranscriptEditorProps) {
  const {
    segments, setSegments,
    activeSegmentIndex,
    isSearchOpen, toggleSearch, setSearchQuery, searchQuery,
    searchMatches, currentSearchIndex, nextSearchMatch, previousSearchMatch,
    toggleDistractionFree, distractionFreeMode,
    seekPlayer,
    pendingFocus, clearPendingFocus, setPendingFocus,
  } = useTranscriptEditor()
  const { markedIndex, setMarker } = useSegmentMarker(lectureId)

  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving'>('saved')
  const isDirtyRef = useRef(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isReplaceOpen, setIsReplaceOpen] = useState(false)
  const [replaceText, setReplaceText] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const editorRef = useRef<HTMLDivElement>(null)
  const debouncedSaveRef = useRef<((s: TranscriptSegment[]) => void) | undefined>(undefined)
  const historyRef = useRef<{ segments: TranscriptSegment[]; activeIndex: number }[]>([])
  const historyIndexRef = useRef(-1)
  const isUndoRedoRef = useRef(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const pushHistory = useCallback((segs: TranscriptSegment[]) => {
    if (isUndoRedoRef.current) return
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push({ segments: segs.map(s => ({ ...s })), activeIndex: activeSegmentIndex ?? 0 })
    if (historyRef.current.length > 50) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length - 1
    updateHistoryState()
  }, [updateHistoryState, activeSegmentIndex])

  useEffect(() => {
    setSegments(initialSegments)
    historyRef.current = [{ segments: initialSegments.map(s => ({ ...s })), activeIndex: 0 }]
    historyIndexRef.current = 0
    isDirtyRef.current = false
    setSaveStatus('saved')
    updateHistoryState()
  }, [initialSegments, setSegments, updateHistoryState])

  useEffect(() => {
    debouncedSaveRef.current = debounce(async (segs: TranscriptSegment[]) => {
      if (!onSave) return
      try {
        setSaveStatus('saving')
        await onSave(segs)
        isDirtyRef.current = false
        setLastSaved(new Date().toLocaleTimeString())
        setSaveStatus('saved')
      } catch (e) {
        console.error('Save failed', e)
        setSaveStatus('dirty')
      }
    }, 15000)
  }, [onSave])

  const triggerSave = useCallback((segs: TranscriptSegment[]) => {
    // Use a ref so marking dirty doesn't cause a re-render mid-keystroke (would reset cursor)
    if (!isDirtyRef.current) {
      isDirtyRef.current = true
      setSaveStatus('dirty')
    }
    debouncedSaveRef.current?.(segs)
  }, [])

  const applySegments = useCallback((segs: TranscriptSegment[]) => {
    pushHistory(segs); setSegments(segs); triggerSave(segs)
  }, [pushHistory, setSegments, triggerSave])

  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleTextChange = useCallback((index: number, text: string) => {
    const updated = segments.map((s, i) => i === index ? { ...s, text } : s)
    setSegments(updated); triggerSave(updated)
    if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current)
    historyDebounceRef.current = setTimeout(() => pushHistory(updated), 800)
  }, [segments, setSegments, triggerSave, pushHistory])

  const handleRevertHeading = useCallback((index: number) => {
    const updated = segments.map((s, i) => i === index
      ? { ...s, isHeading: false, headingLevel: null }
      : s)
    applySegments(updated)
  }, [segments, applySegments])

  const handleInsertHeading = useCallback((afterIndex: number, level: number) => {
    const newSeg: TranscriptSegment = {
      id: `heading-${Date.now()}`,
      timestampSeconds: null,
      timestampLabel: null,
      speaker: null,
      text: `Heading ${level}`,
      paragraphIndex: afterIndex,
      isHeading: true,
      headingLevel: level,
    }
    const updated = [...segments]
    updated.splice(afterIndex + 1, 0, newSeg)
    applySegments(updated)
    setTimeout(() => {
      const el = document.getElementById(`segment-${afterIndex + 1}`)
      const editable = el?.querySelector('[contenteditable]') as HTMLElement | null
      if (editable) { editable.focus(); document.execCommand('selectAll') }
    }, 50)
  }, [segments, applySegments])

  const handleSpeakerChange = useCallback((index: number, newSpeaker: string, applyAll: boolean) => {
    const old = segments[index].speaker
    const updated = segments.map((s, i) => {
      if (applyAll && s.speaker === old) return { ...s, speaker: newSpeaker || null }
      if (!applyAll && i === index) return { ...s, speaker: newSpeaker || null }
      return s
    })
    applySegments(updated)
  }, [segments, applySegments])

  const handleReplaceOne = useCallback(() => {
    const match = searchMatches[currentSearchIndex]
    if (!match || !searchQuery.trim()) return
    const seg = segments[match.segmentIndex]
    const idx = seg.text.toLowerCase().indexOf(searchQuery.toLowerCase())
    if (idx === -1) return
    const newText = seg.text.slice(0, idx) + replaceText + seg.text.slice(idx + searchQuery.length)
    const updated = segments.map((s, i) => i === match.segmentIndex ? { ...s, text: newText } : s)
    applySegments(updated)
    setSearchQuery(searchQuery) // re-run search to update matches
  }, [segments, searchQuery, replaceText, searchMatches, currentSearchIndex, applySegments, setSearchQuery])

  const handleReplaceAll = useCallback(() => {
    if (!searchQuery.trim()) return
    const updated = segments.map(s => ({
      ...s,
      text: s.text.split(searchQuery).join(replaceText),
      speaker: s.speaker ? s.speaker.split(searchQuery).join(replaceText) : s.speaker,
    }))
    applySegments(updated); setSearchQuery(replaceText)
  }, [segments, searchQuery, replaceText, applySegments, setSearchQuery])

  const handleSplit = useCallback((index: number, before: string, after: string) => {
    const seg = segments[index]
    const first: TranscriptSegment = { ...seg, text: before.trimEnd() }
    const afterTrimmed = after.trimStart()
    const { timestampSeconds, timestampLabel, cleanText } = extractTimestamp(afterTrimmed)
    const second: TranscriptSegment = { ...seg, id: `${seg.id}-s${Date.now()}`, text: cleanText, timestampSeconds: timestampSeconds ?? null, timestampLabel: timestampLabel ?? null }
    const updated = [...segments]; updated.splice(index, 1, first, second)
    applySegments(updated)
    // Focus start of the new second segment
    setPendingFocus({ index: index + 1, cursorPos: 0 })
  }, [segments, applySegments, setPendingFocus])

  const handleMerge = useCallback((index: number, currentText: string) => {
    if (index === 0) return
    const prev = segments[index - 1]
    const next = segments[index]
    const timeMarker = next?.timestampLabel ? ` (${next.timestampLabel})` : ''
    const cursorPos = prev.text.trimEnd().length + timeMarker.length + 1
    const merged: TranscriptSegment = { ...prev, text: prev.text.trimEnd() + timeMarker + ' ' + currentText.trimStart() }
    const updated = [...segments]; updated.splice(index - 1, 2, merged)
    applySegments(updated)
    setPendingFocus({ index: index - 1, cursorPos })
  }, [segments, applySegments, setPendingFocus])

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--; isUndoRedoRef.current = true
      const state = historyRef.current[historyIndexRef.current]
      setSegments([...state.segments]); isUndoRedoRef.current = false
      // Keep cursor at current segment, don't jump to saved activeIndex
      setPendingFocus({ index: activeSegmentIndex ?? 0, cursorPos: 0 })
      updateHistoryState()
    }
  }, [setSegments, setPendingFocus, updateHistoryState, activeSegmentIndex])

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++; isUndoRedoRef.current = true
      const state = historyRef.current[historyIndexRef.current]
      setSegments([...state.segments]); isUndoRedoRef.current = false
      // Keep cursor at current segment, don't jump to saved activeIndex
      setPendingFocus({ index: activeSegmentIndex ?? 0, cursorPos: 0 })
      updateHistoryState()
    }
  }, [setSegments, setPendingFocus, updateHistoryState, activeSegmentIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 's') { e.preventDefault(); debouncedSaveRef.current?.(segments) }
      if (mod && !e.shiftKey && e.key === 'f') { e.preventDefault(); setIsReplaceOpen(false); toggleSearch() }
      if (mod && e.key === 'h') { e.preventDefault(); setIsReplaceOpen(true); if (!isSearchOpen) toggleSearch() }
      if (mod && e.shiftKey && e.key === 'F') { e.preventDefault(); toggleDistractionFree() }
      if (mod && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
      if ((mod && e.shiftKey && e.key === 'z') || (mod && e.key === 'y')) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [segments, isSearchOpen, toggleSearch, toggleDistractionFree, undo, redo])

  // Consume pendingFocus from context (set by split/merge in context)
  useEffect(() => {
    if (!pendingFocus) return
    clearPendingFocus()
    requestAnimationFrame(() => {
      const el = document.getElementById(`segment-${pendingFocus.index}`)
      const editable = el?.querySelector('[contenteditable]') as HTMLElement | null
      if (!editable) return
      // preventScroll on split (cursorPos=0) so the page doesn't jump;
      // allow scroll on merge so the cursor stays visible after segments shift
      editable.focus({ preventScroll: pendingFocus.cursorPos === 0 })
      const range = document.createRange()
      const sel = window.getSelection()
      if (!sel) return
      if (pendingFocus.cursorPos === -1) {
        // end of content
        range.selectNodeContents(editable)
        range.collapse(false)
      } else {
        const node = editable.firstChild
        if (node?.nodeType === Node.TEXT_NODE) {
          const pos = Math.min(pendingFocus.cursorPos, (node as Text).length)
          range.setStart(node, pos); range.collapse(true)
        }
      }
      sel.removeAllRanges(); sel.addRange(range)
    })
  }, [pendingFocus, clearPendingFocus])

  useEffect(() => {
    if (autoScroll && activeSegmentIndex != null)
      document.getElementById(`segment-${activeSegmentIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeSegmentIndex, autoScroll])

  useEffect(() => {
    const match = searchMatches[currentSearchIndex]
    if (match != null)
      document.getElementById(`segment-${match.segmentIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentSearchIndex, searchMatches])

  const saveIndicator = saveStatus === 'saving'
    ? <span className="text-xs text-muted-foreground">Saving…</span>
    : saveStatus === 'dirty'
      ? <span className="text-xs text-amber-500 font-medium">● Unsaved</span>
      : lastSaved
        ? <span className="text-xs text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Saved {lastSaved}</span>
        : <span className="text-xs text-muted-foreground">Saved</span>

  return (
    <div className={distractionFreeMode ? 'distraction-free-active' : ''}>
      {/* Distraction-free exit button */}
      {distractionFreeMode && (
        <button
          onClick={toggleDistractionFree}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/90 border border-border rounded-md px-3 py-1.5 shadow-md hover:bg-muted transition-colors backdrop-blur"
          title="Exit focus mode (⌘⇧F)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          Exit focus
        </button>
      )}

      {!distractionFreeMode && (
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-border px-4 py-2.5 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            {saveIndicator}
            {markedIndex !== null && (
              <button
                onClick={() => document.getElementById(`segment-${markedIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="text-xs px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors font-medium"
                title="Jump to left off position"
              >
                📍 Left off at segment {markedIndex + 1}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" className="h-7 w-7 p-0">
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" className="h-7 w-7 p-0">
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Button variant="outline" size="sm" onClick={() => { setIsReplaceOpen(false); toggleSearch() }} className={isSearchOpen && !isReplaceOpen ? 'bg-muted' : ''}>
              <Search className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline text-xs">Find</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setIsReplaceOpen(true); if (!isSearchOpen) toggleSearch() }} className={isReplaceOpen ? 'bg-muted' : ''}>
              <span className="text-xs">Replace</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={autoScroll ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-950/70' : ''}
              title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
            >
              <ChevronDown className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline text-xs">{autoScroll ? 'Scroll' : 'No scroll'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={toggleDistractionFree} title="Focus mode (⌘⇧F)">
              <ZoomOut className="w-3.5 h-3.5 sm:mr-1.5" /><span className="hidden sm:inline text-xs">Focus</span>
            </Button>
          </div>
        </div>
      )}

      {isSearchOpen && !distractionFreeMode && (
        <div className="sticky top-[57px] z-10 bg-background/95 backdrop-blur border-b border-border shadow-sm px-4 py-2.5 flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Find…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? previousSearchMatch() : nextSearchMatch() }
                if (e.key === 'Escape') { toggleSearch(); setIsReplaceOpen(false) }
              }}
              className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded border border-border bg-background"
              autoFocus
            />
            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{searchMatches.length > 0 ? `${currentSearchIndex + 1}/${searchMatches.length}` : '0'}</span>
            <Button variant="outline" size="sm" onClick={previousSearchMatch} disabled={!searchMatches.length} className="h-7 w-7 p-0"><ChevronUp className="w-3.5 h-3.5" /></Button>
            <Button variant="outline" size="sm" onClick={nextSearchMatch} disabled={!searchMatches.length} className="h-7 w-7 p-0"><ChevronDown className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { toggleSearch(); setIsReplaceOpen(false) }} className="h-7 w-7 p-0"><X className="w-3.5 h-3.5" /></Button>
          </div>
          {isReplaceOpen && (
            <div className="flex gap-2 items-center">
              <input type="text" placeholder="Replace with…" value={replaceText} onChange={e => setReplaceText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReplaceAll()}
                className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded border border-border bg-background" />
              <Button variant="outline" size="sm" onClick={handleReplaceOne} disabled={!searchQuery.trim() || !searchMatches.length} className="shrink-0 h-7 text-xs whitespace-nowrap">
                Replace
              </Button>
              <Button size="sm" onClick={handleReplaceAll} disabled={!searchQuery.trim()} className="shrink-0 h-7 text-xs whitespace-nowrap">
                All {searchMatches.length > 0 ? `(${searchMatches.length})` : ''}
              </Button>
            </div>
          )}
        </div>
      )}

      <div ref={editorRef} className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-8 py-6">
        {segments.map((segment, index) => (
          <div key={segment.id} className={!segment.text.trim() ? 'opacity-40' : ''}>
            <SegmentEditor segment={segment} index={index}
              isActive={activeSegmentIndex === index}
              isSearchMatch={searchMatches.some(m => m.segmentIndex === index)}
              isCurrentMatch={searchMatches[currentSearchIndex]?.segmentIndex === index}
              searchQuery={searchQuery}
              prevSpeaker={index > 0 ? segments[index - 1].speaker : undefined}
              siblingCount={segments.filter(s => s.speaker === segment.speaker).length}
              isFirst={index === 0}
              isLast={index === segments.length - 1}
              onChange={text => handleTextChange(index, text)}
              onSpeakerChange={(sp, all) => handleSpeakerChange(index, sp, all)}
              onRevertHeading={() => handleRevertHeading(index)}
              onSeekRequest={seekPlayer}
              onSplit={(before, after) => handleSplit(index, before, after)}
              onMergeWithPrevious={text => handleMerge(index, text)}
              onNavigateNext={() => setPendingFocus({ index: index + 1, cursorPos: 0 })}
              onNavigatePrevious={() => setPendingFocus({ index: index - 1, cursorPos: -1 })}
            />
            <InsertHeadingDivider
              isMarked={markedIndex === index}
              onSetMarker={() => setMarker(markedIndex === index ? null : index)}
              onInsert={level => handleInsertHeading(index, level)}
            />
          </div>
        ))}
        {segments.length === 0 && <div className="text-center py-16 text-muted-foreground text-sm">No segments to edit.</div>}
      </div>
    </div>
  )
}

interface SegmentEditorProps {
  segment: TranscriptSegment; index: number; isActive: boolean; isSearchMatch: boolean
  isCurrentMatch: boolean; searchQuery: string; siblingCount: number; isFirst: boolean; isLast: boolean
  prevSpeaker: string | null | undefined
  onChange: (text: string) => void
  onSpeakerChange: (newSpeaker: string, applyAll: boolean) => void
  onRevertHeading: () => void
  onSeekRequest: (seconds: number) => void
  onSplit: (before: string, after: string) => void
  onMergeWithPrevious: (currentText: string) => void
  onNavigateNext: () => void
  onNavigatePrevious: () => void
}

function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function applyHighlight(el: HTMLDivElement, text: string, query: string, isCurrent: boolean) {
  if (!query.trim()) { el.textContent = text; return }
  const escaped = escapeRegex(query)
  const html = text.replace(
    new RegExp(escaped, 'gi'),
    m => `<mark class="${isCurrent
      ? 'bg-orange-300 dark:bg-orange-600 rounded px-0.5'
      : 'bg-yellow-200 dark:bg-yellow-700/60 rounded px-0.5'}">${m}</mark>`
  )
  el.innerHTML = html
}

function SegmentEditor({ segment, index, isActive, isSearchMatch, isCurrentMatch, searchQuery, siblingCount, isFirst, isLast, prevSpeaker, onChange, onSpeakerChange, onRevertHeading, onSeekRequest, onSplit, onMergeWithPrevious, onNavigateNext, onNavigatePrevious }: SegmentEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const lastDomTextRef = useRef(segment.text)
  const [editingSpeaker, setEditingSpeaker] = useState(false)
  const [speakerDraft, setSpeakerDraft] = useState(segment.speaker ?? '')
  const [isFocused, setIsFocused] = useState(false)
  // inline confirmation: null = not shown, awaiting choice
  const [applyAllPrompt, setApplyAllPrompt] = useState<{ draft: string } | null>(null)
  const applyAllPromptRef = useRef<{ draft: string } | null>(null)
  const speakerInputRef = useRef<HTMLInputElement>(null)
  const color = getSpeakerColor(segment.speaker)

  useLayoutEffect(() => {
    if (contentRef.current) { contentRef.current.textContent = segment.text; lastDomTextRef.current = segment.text }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = contentRef.current
    // Never overwrite DOM while element is focused — user is actively typing
    if (!el || el === document.activeElement) return
    if (segment.text !== lastDomTextRef.current) {
      el.textContent = segment.text; lastDomTextRef.current = segment.text
    }
  }, [segment.text])

  useEffect(() => {
    const el = contentRef.current
    if (!el || isFocused) return  // Never touch DOM while user is typing
    if (!isSearchMatch || !searchQuery.trim()) {
      if (el.innerHTML !== segment.text) el.textContent = segment.text
    } else {
      applyHighlight(el, segment.text, searchQuery, isCurrentMatch)
    }
  }, [isSearchMatch, isCurrentMatch, searchQuery, isFocused, segment.text])

  useEffect(() => { if (editingSpeaker) speakerInputRef.current?.focus() }, [editingSpeaker])

  const handleInput = useCallback(() => {
    const text = contentRef.current?.textContent ?? ''
    lastDomTextRef.current = text; onChange(text)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = contentRef.current; if (!el) return
    const text = el.textContent ?? ''
    const offset = getCaretOffset(el)
    const textLength = text.length

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSplit(text.slice(0, offset), text.slice(offset))
    }
    if (e.key === 'Backspace' && !isFirst) {
      // Merge at start of any segment (filled or empty)
      if (offset === 0) {
        e.preventDefault(); onMergeWithPrevious(text)
      }
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      // Go to next segment if at the end
      if (offset === textLength && !isLast) {
        e.preventDefault(); onNavigateNext()
      }
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      // Go to previous segment if at the start
      if (offset === 0 && !isFirst) {
        e.preventDefault(); onNavigatePrevious()
      }
    }
  }, [isFirst, isLast, onSplit, onMergeWithPrevious, onNavigateNext, onNavigatePrevious])

  const commitSpeaker = useCallback((draft: string) => {
    const trimmed = draft.trim()
    if (trimmed === (segment.speaker ?? '')) {
      setEditingSpeaker(false)
      setApplyAllPrompt(null)
      return
    }
    if (siblingCount > 1) {
      const prompt = { draft: trimmed }
      applyAllPromptRef.current = prompt
      setApplyAllPrompt(prompt)
    } else {
      setEditingSpeaker(false)
      onSpeakerChange(trimmed, false)
    }
  }, [segment.speaker, siblingCount, onSpeakerChange])

  const confirmApplyAll = useCallback((applyAll: boolean) => {
    const prompt = applyAllPromptRef.current
    if (!prompt) return
    applyAllPromptRef.current = null
    setEditingSpeaker(false)
    setApplyAllPrompt(null)
    onSpeakerChange(prompt.draft, applyAll)
  }, [onSpeakerChange])

  return (
    <div id={`segment-${index}`} className={['group border-b border-border/40 last:border-0 transition-colors', isActive ? 'bg-amber-50/60 dark:bg-amber-900/10' : '', isCurrentMatch ? 'ring-2 ring-blue-400 ring-inset rounded' : '', isSearchMatch && !isCurrentMatch ? 'bg-yellow-50/40 dark:bg-yellow-900/10' : ''].filter(Boolean).join(' ')}>
      <div className={`flex gap-3 sm:gap-5 py-3 pl-2 border-l-[3px] ${color.border}`}>
        <div className="w-12 sm:w-16 shrink-0 pt-1 text-right">
          {segment.timestampLabel && (
            <button onClick={() => segment.timestampSeconds != null && onSeekRequest(segment.timestampSeconds)}
              title={`Seek to ${segment.timestampLabel}`}
              className="text-[10px] sm:text-[11px] text-muted-foreground/50 font-mono tabular-nums hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              {segment.timestampLabel}
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {!segment.isHeading && segment.speaker !== null && segment.speaker !== prevSpeaker && (
            <div className="mb-1 mt-0.5">
              {editingSpeaker ? (
                <div className="flex flex-col gap-1">
                  <input ref={speakerInputRef} value={speakerDraft} onChange={e => setSpeakerDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitSpeaker(speakerDraft)
                      if (e.key === 'Escape') { setEditingSpeaker(false); setSpeakerDraft(segment.speaker ?? ''); setApplyAllPrompt(null) }
                    }}
                    onBlur={() => {
                      // Delay so clicks on the inline prompt buttons register first
                      setTimeout(() => {
                        if (!applyAllPromptRef.current) commitSpeaker(speakerDraft)
                      }, 150)
                    }}
                    className="text-xs px-2 py-0.5 rounded border border-blue-400 bg-background outline-none w-44" placeholder="Speaker name…" />
                  {applyAllPrompt && (
                    <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5 w-fit">
                      <span className="text-muted-foreground">Rename all {siblingCount} segments?</span>
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => confirmApplyAll(true)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >Yes</button>
                      <span className="text-muted-foreground/40">·</span>
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => confirmApplyAll(false)}
                        className="text-muted-foreground hover:underline"
                      >Just this one</button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => { setSpeakerDraft(segment.speaker ?? ''); setEditingSpeaker(true) }} title="Click to rename speaker"
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${color.pill}`}>
                  <Pencil className="w-2.5 h-2.5 opacity-40" />{segment.speaker}
                </button>
              )}
            </div>
          )}
          {segment.isHeading && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                {'H' + segment.headingLevel}
              </span>
              <button
                onClick={onRevertHeading}
                className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors underline underline-offset-2"
                title="Convert back to normal text"
              >
                remove
              </button>
            </div>
          )}
          <div ref={contentRef} contentEditable suppressContentEditableWarning
            onInput={handleInput} onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true)
              const el = contentRef.current
              if (el && el.innerHTML !== el.textContent) el.textContent = segment.text
            }}
            onBlur={() => setIsFocused(false)}
            className={['outline-none leading-relaxed rounded px-1 -mx-1 focus:bg-blue-50/30 dark:focus:bg-blue-900/10 whitespace-pre-wrap break-words', segment.isHeading ? (segment.headingLevel === 1 ? 'text-xl font-bold' : segment.headingLevel === 2 ? 'text-lg font-semibold' : 'text-base font-medium') : 'text-sm sm:text-base text-foreground'].join(' ')} />
        </div>
      </div>
    </div>
  )
}

// ─── Insert heading divider ───────────────────────────────────────────────────

function InsertHeadingDivider({ isMarked, onSetMarker, onInsert }: { isMarked: boolean; onSetMarker: () => void; onInsert: (level: number) => void }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative h-6 flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setOpen(false) }}
    >
      {/* Divider line — highlighted if marked */}
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-px transition-colors ${
          isMarked
            ? 'bg-amber-400/60 dark:bg-amber-500/60'
            : hovered
              ? 'bg-primary/40'
              : 'bg-border/30'
        }`}
      />

      {(hovered || isMarked) && (
        <div className="absolute left-0 z-10 flex items-center gap-1">
          {/* Marker button */}
          <button
            onClick={onSetMarker}
            style={{
              borderColor: isMarked ? '#b45309' : 'var(--border)',
              color: isMarked ? '#b45309' : 'var(--muted-foreground)',
              backgroundColor: isMarked ? '#fef3c7' : 'var(--background)',
            }}
            className="flex items-center justify-center w-5 h-5 rounded-full border transition-all shadow-sm dark:border-amber-400 dark:bg-background dark:text-amber-400"
            title={isMarked ? 'Clear marker' : 'Mark as left off here'}
          >
            <Bookmark className="w-3 h-3 fill-current" />
          </button>

          {/* Heading menu button */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-bold leading-none shadow-sm"
            title="Insert heading"
          >
            +
          </button>
        </div>
      )}

      {open && (
        <div className="absolute left-12 z-20 flex items-center gap-1 bg-popover border border-border rounded-md shadow-md px-2 py-1">
          {([1, 2, 3] as const).map(lvl => (
            <button
              key={lvl}
              onClick={() => { onInsert(lvl); setOpen(false) }}
              className="text-xs font-bold px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={`Insert ${'#'.repeat(lvl)} heading`}
            >
              {'H' + lvl}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0).cloneRange()
  range.selectNodeContents(el)
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
  return range.toString().length
}
