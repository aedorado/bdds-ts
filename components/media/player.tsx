'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranscriptEditor } from '@/lib/transcript'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

interface YouTubePlayerInstance {
  getCurrentTime: () => number
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setPlaybackRate: (rate: number) => void
  destroy?: () => void
}

interface YouTubeAPI {
  Player: new (el: HTMLDivElement, options: object) => YouTubePlayerInstance
  PlayerState: { PLAYING: number; PAUSED: number }
}

interface WindowWithYT extends Window {
  YT?: YouTubeAPI
  onYouTubeIframeAPIReady?: () => void
}

interface MediaPlayerProps {
  youtubeUrl?: string | null
  audioUrl?: string | null
  onTimeUpdate?: (time: number) => void
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const
type Speed = typeof SPEEDS[number]

export function MediaPlayer({ youtubeUrl, audioUrl, onTimeUpdate }: MediaPlayerProps) {
  const { setCurrentTime, registerSeekPlayer } = useTranscriptEditor()
  const [isPlaying, setIsPlaying] = useState(false)
  const [ytReady, setYtReady] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTimeLocal] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState<Speed>(1)
  const [audioError, setAudioError] = useState(false)
  const [bufferedEnd, setBufferedEnd] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<YouTubePlayerInstance | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPlayingRef = useRef(false)
  const speedRef = useRef<Speed>(1)
  const isDraggingRef = useRef(false)

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted
    }
  }, [isMuted])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const inText = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // Space — play/pause (not in text fields)
      if (e.code === 'Space' && !inText) {
        e.preventDefault()
        togglePlayPause()
        return
      }
      // [ — seek back 5s
      if (e.code === 'BracketLeft' && !inText) {
        e.preventDefault()
        seekRelative(-5)
        return
      }
      // ] — seek forward 5s
      if (e.code === 'BracketRight' && !inText) {
        e.preventDefault()
        seekRelative(5)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePlayPause = useCallback(() => {
    if (ytPlayerRef.current) {
      if (isPlayingRef.current) ytPlayerRef.current.pauseVideo()
      else ytPlayerRef.current.playVideo()
    } else if (audioRef.current) {
      if (isPlayingRef.current) audioRef.current.pause()
      else audioRef.current.play()
    }
  }, [])

  const seekRelative = useCallback((delta: number) => {
    if (ytPlayerRef.current) {
      const t = ytPlayerRef.current.getCurrentTime()
      ytPlayerRef.current.seekTo(Math.max(0, t + delta), true)
    } else if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + delta)
    }
  }, [])

  const seekToSeconds = useCallback((seconds: number) => {
    if (ytPlayerRef.current) ytPlayerRef.current.seekTo(seconds, true)
    else if (audioRef.current) audioRef.current.currentTime = seconds
  }, [])

  const changeSpeed = useCallback((s: Speed) => {
    setSpeed(s)
    if (ytPlayerRef.current) ytPlayerRef.current.setPlaybackRate(s)
    else if (audioRef.current) audioRef.current.playbackRate = s
  }, [])

  // ── YouTube setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!youtubeUrl) return
    const win = window as unknown as WindowWithYT

    const initPlayer = () => {
      if (!playerRef.current || !win.YT) return
      playerRef.current.innerHTML = ''
      const player = new win.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: extractYoutubeId(youtubeUrl),
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            ytPlayerRef.current = player
            setYtReady(true)
            // Register seek function with context so TranscriptEditor can call it
            registerSeekPlayer((s) => player.seekTo(s, true))
            // Apply current speed
            player.setPlaybackRate(speedRef.current)

            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = setInterval(() => {
              const t = player.getCurrentTime()
              setCurrentTimeLocal(t)
              setCurrentTime(t)
              onTimeUpdate?.(t)
            }, 500)
          },
          onStateChange: (event: { data: number }) => {
            if (!win.YT) return
            if (event.data === win.YT.PlayerState.PLAYING) setIsPlaying(true)
            else if (event.data === win.YT.PlayerState.PAUSED) setIsPlaying(false)
          },
        },
      })
    }

    if (win.YT?.Player) initPlayer()
    else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(tag)
      }
      win.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      ytPlayerRef.current = null
      setYtReady(false)
    }
  }, [youtubeUrl, setCurrentTime, onTimeUpdate, registerSeekPlayer])

  // ── HTML5 audio setup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return
    const audio = audioRef.current
    // Register seek with context
    registerSeekPlayer((s) => { audio.currentTime = s })

    const onTU = () => {
      if (!isDraggingRef.current) {
        setCurrentTimeLocal(audio.currentTime)
        setCurrentTime(audio.currentTime)
        onTimeUpdate?.(audio.currentTime)
      }
    }
    const onMeta = () => setDuration(audio.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onProgress = () => {
      if (audio.buffered.length > 0) {
        setBufferedEnd(audio.buffered.end(audio.buffered.length - 1))
      }
    }
    audio.addEventListener('timeupdate', onTU)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('progress', onProgress)
    return () => {
      audio.removeEventListener('timeupdate', onTU)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('progress', onProgress)
    }
  }, [audioUrl, setCurrentTime, onTimeUpdate, registerSeekPlayer])

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  if (!youtubeUrl && !audioUrl) return (
    <div className="p-6 bg-muted rounded-lg text-center text-muted-foreground">No media available</div>
  )

  return (
    <div className="bg-black rounded-b-xl overflow-hidden">
      {/* YouTube 16:9 embed */}
      {youtubeUrl && (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <div ref={playerRef} className="absolute inset-0 w-full h-full" />
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 flex-wrap">
        {/* Play/pause */}
        <button
          onClick={togglePlayPause}
          disabled={youtubeUrl ? !ytReady : false}
          className="flex items-center gap-1 text-xs text-white/80 hover:text-white transition-colors disabled:opacity-40 shrink-0"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Seek ±5s */}
        <button onClick={() => seekRelative(-5)} title="Back 5s  [" className="text-white/50 hover:text-white text-[10px] tabular-nums shrink-0">−5s</button>
        <button onClick={() => seekRelative(5)}  title="Forward 5s  ]" className="text-white/50 hover:text-white text-[10px] tabular-nums shrink-0">+5s</button>

        {/* Timestamp */}
        <span className="text-white/40 text-xs tabular-nums shrink-0">{formatTime(currentTime)}</span>

        {/* Audio progress bar */}
        {audioUrl && !youtubeUrl && (
          <>
            <input
              type="range" min="0" max={duration || 0} value={currentTime}
              onChange={e => setCurrentTimeLocal(parseFloat(e.target.value))}
              onPointerDown={() => { isDraggingRef.current = true }}
              onPointerUp={e => { isDraggingRef.current = false; seekToSeconds(parseFloat((e.target as HTMLInputElement).value)) }}
              className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer min-w-0"
              style={{
                background: `linear-gradient(to right, rgb(59,130,246) ${(currentTime / duration) * 100}%, rgb(71,85,105) ${(currentTime / duration) * 100}%, rgb(71,85,105) ${(bufferedEnd / duration) * 100}%, rgb(51,65,85) ${(bufferedEnd / duration) * 100}%)`
              }}
            />
            <span className="text-xs text-white/40 tabular-nums shrink-0">{formatTime(duration)}</span>
            <audio
              ref={audioRef}
              src={convertGoogleDriveUrl(audioUrl)}
              crossOrigin="anonymous"
              onVolumeChange={e => setVolume(e.currentTarget.volume)}
              onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
              onError={e => console.warn('Audio load error:', e)}
            />
            <Button variant="ghost" size="sm" onClick={() => setIsMuted(!isMuted)} className="text-white hover:bg-slate-700 h-6 w-6 p-0 shrink-0">
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
          </>
        )}

        {/* Speed selector */}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              className={`text-[10px] px-1.5 py-0.5 rounded tabular-nums transition-colors ${
                speed === s
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Keyboard hint */}
        <span className="text-white/20 text-[10px] hidden sm:block shrink-0">[ ] seek · space play</span>
      </div>
    </div>
  )
}

function extractYoutubeId(url: string): string | null {
  const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/, /youtube\.com\/embed\/([^&\n?#]+)/]
  for (const p of patterns) { const m = url.match(p); if (m?.[1]) return m[1] }
  return null
}

function convertGoogleDriveUrl(url: string): string {
  if (url.includes('drive.google.com')) {
    return `/api/media/proxy?url=${encodeURIComponent(url)}`
  }
  return url
}
