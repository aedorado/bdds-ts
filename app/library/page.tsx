'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FolderOpen,
  FileAudio,
  ChevronRight,
  Play,
  Pause,
  Search,
  Volume2,
  VolumeX,
  X,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Headphones,
  Info,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Lecture {
  id: number
  slug: string
  title: string
  speaker: string
  audioUrl: string | null
  durationSeconds: number | null
  category: string | null
  place: string | null
  lectureDate: string | null
  status: string
  isPublic: boolean
}

// Normalize speaker name for grouping
function normalizeSpeaker(name: string | null | undefined): string {
  if (!name) return 'Unknown Speaker'
  return name
    .replace(/^HH\s+/i, '')
    .replace(/\s+Maharaja$/i, '')
    .replace(/\s+Swami$/i, ' Swami')
    .trim()
}

// Helper to convert Google Drive link to proxy URL
function convertGoogleDriveUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.includes('drive.google.com')) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

// Color schemes for speaker initials
const AVATAR_COLORS = [
  'bg-saffron-100 text-saffron-800 border-saffron-200 dark:bg-saffron-950/40 dark:text-saffron-300 dark:border-saffron-800/50',
  'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50',
  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
  'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50',
]

function getAvatarStyle(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export default function LibraryPage() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Navigation State
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('ALL')
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Audio Player State
  const [playingLecture, setPlayingLecture] = useState<Lecture | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [audioError, setAudioError] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressBarRef = useRef<HTMLInputElement | null>(null)

  // Fetch lectures
  useEffect(() => {
    async function loadLibrary() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/library')
        if (!response.ok) {
          throw new Error('Failed to load library lectures')
        }
        const data = await response.json()
        setLectures(data.lectures || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }
    loadLibrary()
  }, [])

  // Process unique speakers
  const speakersList = useMemo(() => {
    const counts: Record<string, number> = {}
    lectures.forEach(l => {
      const normalized = normalizeSpeaker(l.speaker)
      counts[normalized] = (counts[normalized] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [lectures])

  // Filter lectures by selected speaker
  const filteredLectures = useMemo(() => {
    if (selectedSpeaker === 'ALL') return lectures
    return lectures.filter(l => normalizeSpeaker(l.speaker) === selectedSpeaker)
  }, [lectures, selectedSpeaker])

  // Get contents of the current folder path (nested categories)
  const directoryContents = useMemo(() => {
    const folders = new Set<string>()
    const files: Lecture[] = []
    const isSearching = searchQuery.trim().length > 0
    const query = searchQuery.toLowerCase()

    for (const lecture of filteredLectures) {
      const categoryStr = lecture.category?.trim() || ''
      const parts = categoryStr ? categoryStr.split('/').map(p => p.trim()).filter(Boolean) : []

      if (isSearching) {
        // Search recursively inside the current folder
        let matchesPrefix = true
        for (let i = 0; i < currentPath.length; i++) {
          if (!parts[i] || parts[i].toLowerCase() !== currentPath[i].toLowerCase()) {
            matchesPrefix = false
            break
          }
        }
        if (matchesPrefix) {
          const titleMatch = lecture.title.toLowerCase().includes(query)
          const categoryMatch = lecture.category?.toLowerCase().includes(query)
          const placeMatch = lecture.place?.toLowerCase().includes(query)
          if (titleMatch || categoryMatch || placeMatch) {
            files.push(lecture)
          }
        }
        continue
      }

      // Normal navigation tree traversal
      let matchesPrefix = true
      for (let i = 0; i < currentPath.length; i++) {
        if (!parts[i] || parts[i].toLowerCase() !== currentPath[i].toLowerCase()) {
          matchesPrefix = false
          break
        }
      }

      if (matchesPrefix) {
        if (parts.length > currentPath.length) {
          folders.add(parts[currentPath.length])
        } else {
          files.push(lecture)
        }
      }
    }

    return {
      subfolders: Array.from(folders).sort(),
      files: files.sort((a, b) => {
        const dateA = a.lectureDate ? new Date(a.lectureDate).getTime() : 0
        const dateB = b.lectureDate ? new Date(b.lectureDate).getTime() : 0
        return dateB - dateA
      }),
    }
  }, [filteredLectures, currentPath, searchQuery])

  // Navigation handlers
  const handleSpeakerChange = (speaker: string) => {
    setSelectedSpeaker(speaker)
    setCurrentPath([])
    setSearchQuery('')
  }

  const enterFolder = (folderName: string) => {
    setCurrentPath(prev => [...prev, folderName])
    setSearchQuery('')
  }

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentPath([])
    } else {
      setCurrentPath(prev => prev.slice(0, index + 1))
    }
    setSearchQuery('')
  }

  // Audio Playback Actions
  const playLecture = (lecture: Lecture) => {
    if (!lecture.audioUrl) return
    setAudioError(false)
    if (playingLecture?.id === lecture.id) {
      if (isPlaying) {
        audioRef.current?.pause()
      } else {
        audioRef.current?.play().catch(err => console.error(err))
      }
    } else {
      setPlayingLecture(lecture)
      setCurrentTime(0)
      setIsPlaying(false)
    }
  }

  // Effect to load and auto-play selected audio track
  useEffect(() => {
    if (!playingLecture || !audioRef.current) return

    const audio = audioRef.current
    audio.src = convertGoogleDriveUrl(playingLecture.audioUrl)
    audio.load()
    audio.playbackRate = playbackRate
    audio.muted = isMuted
    audio.volume = volume

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true)
        })
        .catch(err => {
          console.warn('Audio play failed:', err)
          setIsPlaying(false)
        })
    }
  }, [playingLecture])

  const togglePlayPause = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(err => console.error(err))
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const val = parseFloat(e.target.value)
    audioRef.current.currentTime = val
    setCurrentTime(val)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const val = parseFloat(e.target.value)
    audioRef.current.volume = val
    setVolume(val)
    if (val > 0) {
      setIsMuted(false)
      audioRef.current.muted = false
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    audioRef.current.muted = nextMuted
  }

  const handleSpeedChange = (rate: number) => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Audio HTML5 Events
  const onAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const onAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const onAudioPlay = () => setIsPlaying(true)
  const onAudioPause = () => setIsPlaying(false)
  const onAudioEnded = () => setIsPlaying(false)
  const onAudioError = () => {
    console.error('Audio playback stream error')
    setAudioError(true)
    setIsPlaying(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-saffron-500/20 border-t-saffron-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-sm font-medium">Loading Audio Library...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="bg-card border border-destructive/20 rounded-xl p-6 text-center max-w-md w-full shadow">
          <Info className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Failed to load Library</h2>
          <p className="text-muted-foreground text-xs mb-5">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground w-full rounded-lg">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6 relative">
        
        {/* SPEAKERS SIDEBAR */}
        <aside className={`
          bg-card border border-border rounded-xl shrink-0 transition-all duration-200 h-fit
          ${isSidebarOpen ? 'w-full md:w-64' : 'w-full md:w-0 md:opacity-0 md:pointer-events-none md:p-0 md:border-0'}
          ${isSidebarOpen ? 'block' : 'hidden md:block'}
        `}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold flex items-center gap-2">
              <Headphones className="w-4 h-4 text-saffron-500" />
              Speakers
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {speakersList.length}
            </span>
          </div>

          <div className="p-2 space-y-1 max-h-[calc(100vh-14rem)] overflow-y-auto">
            {/* ALL SPEAKERS */}
            <button
              onClick={() => handleSpeakerChange('ALL')}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer border ${
                selectedSpeaker === 'ALL'
                  ? 'bg-saffron-50 border-saffron-200/50 text-saffron-900 font-semibold dark:bg-saffron-950/20 dark:border-saffron-800/40 dark:text-saffron-200'
                  : 'bg-transparent border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>All Speakers</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {lectures.length}
              </span>
            </button>

            {/* Dynamic Speakers List */}
            {speakersList.map(({ name, count }) => {
              const isActive = selectedSpeaker === name
              const initials = name.split(' ').filter(n => n.length > 0).slice(0, 2).map(n => n[0]).join('')
              const style = getAvatarStyle(name)

              return (
                <button
                  key={name}
                  onClick={() => handleSpeakerChange(name)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer border ${
                    isActive
                      ? 'bg-saffron-50 border-saffron-200/50 text-saffron-900 font-semibold dark:bg-saffron-950/20 dark:border-saffron-800/40 dark:text-saffron-200'
                      : 'bg-transparent border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 ${style}`}>
                      {initials}
                    </div>
                    <span className="truncate">{name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* EXPLORER AREA (Simple List representation) */}
        <section className="flex-1 flex flex-col min-w-0">
          
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="bg-card border-border hover:bg-muted text-xs h-8"
              >
                <List className="w-3.5 h-3.5 mr-1" />
                {isSidebarOpen ? 'Hide Sidebar' : 'Show Speakers'}
              </Button>
              <div>
                <h1 className="text-xl font-bold font-heading text-foreground">Audio Library</h1>
                <p className="text-[10px] text-muted-foreground">
                  {selectedSpeaker === 'ALL' ? 'All Speakers' : `Speaker: ${selectedSpeaker}`}
                </p>
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1">
              <button onClick={() => navigateToBreadcrumb(-1)} className="hover:text-saffron-500 transition-colors cursor-pointer">
                Root
              </button>
              {currentPath.map((folder, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                  <button
                    onClick={() => navigateToBreadcrumb(idx)}
                    className={`hover:text-saffron-500 transition-colors cursor-pointer ${
                      idx === currentPath.length - 1 ? 'text-saffron-600 dark:text-saffron-400 font-semibold' : ''
                    }`}
                  >
                    {folder}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={`Search inside ${currentPath[currentPath.length - 1] || 'root'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border hover:border-border/80 focus:border-saffron-500 rounded-lg py-1.5 pl-8 pr-8 text-xs text-foreground placeholder-muted-foreground outline-none transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-muted-foreground hover:text-foreground absolute right-2 top-1.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* TREE FOLDERS & FILES */}
          {directoryContents.subfolders.length === 0 && directoryContents.files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-8 text-center bg-card/20 min-h-60">
              <FolderOpen className="w-8 h-8 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-foreground text-sm">Directory is Empty</h3>
              <p className="text-muted-foreground text-xs max-w-xs mt-1">
                {searchQuery ? 'No lectures match your search keywords.' : 'This folder is empty.'}
              </p>
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="link"
                  className="text-saffron-500 hover:text-saffron-600 text-xs mt-2 p-0 h-auto"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* SUBFOLDERS LIST */}
              {!searchQuery && directoryContents.subfolders.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Folders ({directoryContents.subfolders.length})
                  </span>
                  <div className="flex flex-col gap-1 border border-border rounded-lg bg-card/50 overflow-hidden divide-y divide-border">
                    {directoryContents.subfolders.map((folderName) => (
                      <div
                        key={folderName}
                        onClick={() => enterFolder(folderName)}
                        className="flex items-center justify-between p-3 hover:bg-muted transition-colors cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Folder className="w-4 h-4 text-saffron-500 fill-saffron-500/10 shrink-0" />
                          <span className="font-medium text-foreground truncate">{folderName}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LECTURES FILES LIST (SIMPLE ROW REPRESENTATION) */}
              {directoryContents.files.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    {searchQuery ? 'Search Results' : 'Lectures'} ({directoryContents.files.length})
                  </span>
                  
                  <div className="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border">
                    {directoryContents.files.map((lecture) => {
                      const isCurrentActive = playingLecture?.id === lecture.id
                      const isCurrentPlaying = isCurrentActive && isPlaying

                      return (
                        <div
                          key={lecture.id}
                          className={`
                            flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 transition-colors text-xs
                            ${isCurrentActive ? 'bg-saffron-50/40 dark:bg-saffron-950/10' : 'hover:bg-muted/40'}
                          `}
                        >
                          {/* Left details */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Play trigger button */}
                            {lecture.audioUrl ? (
                              <button
                                onClick={() => playLecture(lecture)}
                                className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-sm transition-all cursor-pointer ${
                                  isCurrentPlaying
                                    ? 'bg-saffron-500 border-saffron-500 text-white dark:text-slate-950'
                                    : 'bg-background hover:bg-muted text-foreground border-border'
                                }`}
                              >
                                {isCurrentPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                                <FileAudio className="w-3.5 h-3.5" />
                              </div>
                            )}

                            {/* Details text */}
                            <div className="min-w-0">
                              <h4 className={`font-semibold truncate ${isCurrentActive ? 'text-saffron-600 dark:text-saffron-400' : 'text-foreground'}`}>
                                {lecture.title}
                              </h4>
                              
                              <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground mt-0.5">
                                <span>{lecture.speaker}</span>
                                {lecture.lectureDate && (
                                  <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span className="flex items-center gap-0.5">
                                      <Calendar className="w-2.5 h-2.5" />
                                      {new Date(lecture.lectureDate).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'2-digit'})}
                                    </span>
                                  </>
                                )}
                                {lecture.place && (
                                  <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span className="flex items-center gap-0.5 truncate max-w-xs">
                                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{lecture.place}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right controls / links */}
                          <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 pl-11 sm:pl-0">
                            {/* Duration */}
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
                              <Clock className="w-3 h-3" />
                              <span>{lecture.durationSeconds ? formatTime(lecture.durationSeconds) : 'No time'}</span>
                            </div>

                            {/* View Transcript link */}
                            <Link
                              href={`/lecture/${lecture.slug}`}
                              className="text-[10px] text-muted-foreground hover:text-saffron-600 flex items-center gap-1 font-medium bg-muted px-2.5 py-1 rounded border border-border transition-all"
                            >
                              Transcript
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* FLOAT AUDIO PLAYER (Simple, clean, adapts to themes) */}
      <AnimatePresence>
        {playingLecture && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 lg:left-1/2 lg:-translate-x-1/2 z-50 max-w-3xl w-[calc(100%-2rem)] md:w-[calc(100%-3rem)]"
          >
            <div className="bg-card/95 border border-border shadow-xl rounded-xl p-3 md:p-4 flex flex-col gap-3 text-foreground backdrop-blur-md">
              
              {/* Top Row details and action controls */}
              <div className="flex items-center justify-between gap-4">
                
                {/* Lecture details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-saffron-100 text-saffron-600 dark:bg-saffron-950/40 dark:text-saffron-400 flex items-center justify-center shrink-0">
                    <FileAudio className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs truncate" title={playingLecture.title}>
                      {playingLecture.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {playingLecture.speaker}
                    </p>
                  </div>
                </div>

                {/* Player Play/Pause button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground text-[10px]"
                    title="Rewind 10s"
                  >
                    -10s
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="w-9 h-9 rounded-full bg-saffron-500 hover:bg-saffron-400 text-white dark:text-slate-950 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10)
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground text-[10px]"
                    title="Forward 10s"
                  >
                    +10s
                  </button>
                </div>

                {/* Options panel */}
                <div className="flex items-center gap-3 shrink-0">
                  
                  {/* Speed adjustments */}
                  <div className="hidden sm:flex items-center gap-0.5 bg-muted border border-border p-0.5 rounded text-[9px] shrink-0">
                    {[1, 1.25, 1.5].map(rate => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                          playbackRate === rate ? 'bg-saffron-500 text-white dark:text-slate-950' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {/* Volume slider */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer">
                      {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-destructive" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-12 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* External Transcript details page link */}
                  <Link
                    href={`/lecture/${playingLecture.slug}`}
                    className="text-[10px] text-saffron-600 hover:underline font-semibold shrink-0 ml-1 flex items-center gap-0.5"
                  >
                    Transcript
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>

                  {/* Close floating box */}
                  <button
                    onClick={() => {
                      if (audioRef.current) audioRef.current.pause()
                      setIsPlaying(false)
                      setPlayingLecture(null)
                    }}
                    className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title="Close player"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Seek Bar */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{formatTime(currentTime)}</span>
                
                <input
                  ref={progressBarRef}
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(245, 158, 11) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--muted)) ${(currentTime / (duration || 1)) * 100}%)`
                  }}
                />

                <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{formatTime(duration)}</span>
              </div>

              {/* HTML5 audio node */}
              <audio
                ref={audioRef}
                onTimeUpdate={onAudioTimeUpdate}
                onLoadedMetadata={onAudioLoadedMetadata}
                onPlay={onAudioPlay}
                onPause={onAudioPause}
                onEnded={onAudioEnded}
                onError={onAudioError}
                crossOrigin="anonymous"
              />

              {audioError && (
                <span className="text-[9px] text-destructive font-semibold text-center leading-none">
                  Failed to stream audio file. Check CORS proxy configuration or source availability.
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
