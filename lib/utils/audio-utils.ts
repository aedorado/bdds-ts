/**
 * Convert various audio sources to playable URLs
 */

/**
 * Convert Google Drive share link to streaming URL
 * @param url Google Drive share link
 * @returns Streaming audio URL
 *
 * Formats handled:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=drive_link
 * - https://drive.google.com/file/d/{FILE_ID}/view
 * - https://drive.google.com/open?id={FILE_ID}
 */
export function convertGoogleDriveLink(url: string): string {
  // Extract file ID from various Google Drive URL formats
  let fileId: string | null = null

  // Format 1: /file/d/{FILE_ID}/view
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
  if (match1) {
    fileId = match1[1]
  }

  // Format 2: ?id={FILE_ID}
  if (!fileId) {
    const match2 = url.match(/[?&]id=([a-zA-Z0-9-_]+)/)
    if (match2) {
      fileId = match2[1]
    }
  }

  if (!fileId) {
    // If we can't extract ID, return original URL
    return url
  }

  // Return streaming URL (not download)
  // This works for audio playback in browsers
  return `https://drive.google.com/uc?id=${fileId}`
}

/**
 * Detect audio source type and convert if needed
 * @param url Audio URL
 * @returns Playable audio URL
 */
export function normalizeAudioUrl(url: string): string {
  if (!url) return ''

  // Check if it's a Google Drive link
  if (url.includes('drive.google.com')) {
    return convertGoogleDriveLink(url)
  }

  // Return as-is for other sources (YouTube, Dropbox, direct MP3, etc.)
  return url
}

/**
 * Validate if URL is likely an audio source
 * @param url URL to validate
 * @returns true if URL looks like an audio source
 */
export function isValidAudioUrl(url: string): boolean {
  if (!url) return false

  // Check for common audio file extensions
  const audioExtensions = /\.(mp3|wav|m4a|ogg|flac|aac|webm|opus)(\?|$)/i
  if (audioExtensions.test(url)) return true

  // Check for known audio services
  const audioServices = [
    'drive.google.com',
    'dropbox.com',
    'soundcloud.com',
    'spotify.com',
    'youtube.com',
    'youtu.be',
    'podbean.com',
    'anchor.fm',
    'buzzsprout.com',
    'transistor.fm',
  ]

  return audioServices.some(service => url.includes(service))
}

/**
 * Get audio source type for UI hints
 * @param url Audio URL
 * @returns Human-readable source name
 */
export function getAudioSourceType(url: string): string {
  if (url.includes('drive.google.com')) return 'Google Drive'
  if (url.includes('dropbox.com')) return 'Dropbox'
  if (url.includes('soundcloud.com')) return 'SoundCloud'
  if (url.includes('spotify.com')) return 'Spotify'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  if (url.match(/\.(mp3|wav)(\?|$)/i)) return 'Direct MP3/WAV'
  return 'Audio'
}
