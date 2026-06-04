'use client'

import { MediaPlayer } from './player'

interface Props {
  youtubeUrl?: string | null
  audioUrl?: string | null
  onTimeUpdate?: (time: number) => void
}

export function MediaPlayerWrapper({ youtubeUrl, audioUrl, onTimeUpdate }: Props) {
  return <MediaPlayer youtubeUrl={youtubeUrl} audioUrl={audioUrl} onTimeUpdate={onTimeUpdate} />
}
