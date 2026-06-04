/**
 * Transcript segment type
 */
export interface TranscriptSegment {
  id: string
  timestampSeconds: number | null
  timestampLabel: string | null
  speaker: string | null
  text: string
  paragraphIndex: number
  isHeading: boolean
  headingLevel: number | null
}

/**
 * Parse raw transcript into structured segments
 *
 * Handles:
 * - Timestamps: (28:43) or [28:43]
 * - Speaker labels: "Speaker 5:" or standalone lines
 * - Paragraph breaks: blank lines
 * - Headings: lines starting with #, ##, ###
 */
export function parseTranscript(raw: string): TranscriptSegment[] {
  if (!raw || !raw.trim()) {
    return []
  }

  const lines = raw.split('\n')
  const segments: TranscriptSegment[] = []
  let paragraphIndex = 0
  let currentSpeaker: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines but increase paragraph index
    if (!trimmed) {
      paragraphIndex++
      continue
    }

    // Check for timestamp - supports [HH:MM], (HH:MM), HH:MM formats
    const timestampMatch = trimmed.match(/^[\[\(]?(\d{1,2}):(\d{2})(?::(\d{2}))?[\]\)]?/)
    let timestampSeconds: number | null = null
    let timestampLabel: string | null = null
    let textContent = trimmed

    if (timestampMatch) {
      const a = parseInt(timestampMatch[1], 10)
      const b = parseInt(timestampMatch[2], 10)
      const c = timestampMatch[3] ? parseInt(timestampMatch[3], 10) : null

      // Format is either (M:SS) or (H:MM:SS)
      if (c !== null) {
        // Has 3 parts: (H:MM:SS)
        timestampSeconds = a * 3600 + b * 60 + c
        timestampLabel = `${a}:${b.toString().padStart(2, '0')}:${c.toString().padStart(2, '0')}`
      } else {
        // Has 2 parts: (M:SS)
        timestampSeconds = a * 60 + b
        timestampLabel = `${a}:${b.toString().padStart(2, '0')}`
      }

      // Remove timestamp from text
      textContent = trimmed.substring(timestampMatch[0].length).trim()
    }

    // Check for speaker label (e.g., "Speaker 5:" or "Prabhu:")
    const speakerMatch = textContent.match(/^([^:]+):\s+/)
    let speaker: string | null = currentSpeaker

    // Only treat as speaker if it looks like one (no periods, relatively short, or explicit format)
    if (speakerMatch && speakerMatch[1].length < 50 && !speakerMatch[1].includes('.')) {
      const potentialSpeaker = speakerMatch[1].trim()
      if (
        potentialSpeaker.match(/^Speaker \d+$/i) ||
        potentialSpeaker.match(/^[A-Z][a-z\s]*$/) ||
        potentialSpeaker.length < 20
      ) {
        speaker = potentialSpeaker
        currentSpeaker = speaker
        textContent = textContent.substring(speakerMatch[0].length).trim()
      }
    }

    // Check for heading syntax
    const headingMatch = textContent.match(/^(#{1,3})\s+(.+)/)
    let isHeading = false
    let headingLevel: number | null = null
    let finalText = textContent

    if (headingMatch) {
      isHeading = true
      headingLevel = headingMatch[1].length
      finalText = headingMatch[2]
    }

    // Skip if empty after processing
    if (!finalText.trim()) {
      continue
    }

    const segment: TranscriptSegment = {
      id: `segment-${paragraphIndex}-${i}`,
      timestampSeconds,
      timestampLabel,
      speaker,
      text: finalText,
      paragraphIndex,
      isHeading,
      headingLevel,
    }

    segments.push(segment)
    paragraphIndex++
  }

  return segments
}

/**
 * Extract timestamp from the start of text
 * Returns { timestampSeconds, timestampLabel, cleanText }
 */
export function extractTimestamp(text: string): { timestampSeconds: number | null; timestampLabel: string | null; cleanText: string } {
  const trimmed = text.trim()
  const timestampMatch = trimmed.match(/^[\[\(]?(\d{1,2}):(\d{2})(?::(\d{2}))?[\]\)]?/)

  if (!timestampMatch) {
    return { timestampSeconds: null, timestampLabel: null, cleanText: text }
  }

  const a = parseInt(timestampMatch[1], 10)
  const b = parseInt(timestampMatch[2], 10)
  const c = timestampMatch[3] ? parseInt(timestampMatch[3], 10) : null

  let timestampSeconds: number | null = null
  let timestampLabel: string | null = null

  if (c !== null) {
    timestampSeconds = a * 3600 + b * 60 + c
    timestampLabel = `${a}:${b.toString().padStart(2, '0')}:${c.toString().padStart(2, '0')}`
  } else {
    timestampSeconds = a * 60 + b
    timestampLabel = `${a}:${b.toString().padStart(2, '0')}`
  }

  const cleanText = trimmed.substring(timestampMatch[0].length).trim()
  return { timestampSeconds, timestampLabel, cleanText }
}

/**
 * Convert segments back to raw transcript text
 */
export function segmentsToRawTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((segment) => {
      let line = ''

      // Add timestamp if present
      if (segment.timestampLabel) {
        line += `(${segment.timestampLabel}) `
      }

      // Add speaker if present
      if (segment.speaker) {
        line += `${segment.speaker}: `
      }

      // Add heading syntax
      if (segment.isHeading && segment.headingLevel) {
        line += '#'.repeat(segment.headingLevel) + ' '
      }

      // Add text
      line += segment.text

      return line
    })
    .join('\n\n')
}

/**
 * Get segment at specific timestamp
 */
export function getSegmentAtTimestamp(
  segments: TranscriptSegment[],
  timeSeconds: number
): TranscriptSegment | null {
  // Find the closest segment where timestampSeconds <= currentTime
  let closestSegment: TranscriptSegment | null = null

  for (const segment of segments) {
    if (segment.timestampSeconds !== null && segment.timestampSeconds <= timeSeconds) {
      if (!closestSegment || segment.timestampSeconds > (closestSegment.timestampSeconds ?? -1)) {
        closestSegment = segment
      }
    }
  }

  return closestSegment
}

/**
 * Search segments for text with case-insensitive matching
 */
export function searchSegments(
  segments: TranscriptSegment[],
  query: string
): { segment: TranscriptSegment; matches: number[] }[] {
  if (!query.trim()) {
    return []
  }

  const lowerQuery = query.toLowerCase()
  const results: { segment: TranscriptSegment; matches: number[] }[] = []

  for (const segment of segments) {
    const lowerText = segment.text.toLowerCase()
    const matches: number[] = []

    let startIndex = 0
    let index: number

    while ((index = lowerText.indexOf(lowerQuery, startIndex)) !== -1) {
      matches.push(index)
      startIndex = index + 1
    }

    if (matches.length > 0) {
      results.push({ segment, matches })
    }
  }

  return results
}

/**
 * Consolidate fine-grained segments into readable paragraphs.
 *
 * Merges consecutive segments by the same speaker when the time gap
 * between them is below `maxGapSeconds` (default 45s). Headings are
 * always kept as standalone segments. The first segment's timestamp
 * is preserved as the paragraph anchor.
 */
export function consolidateSegments(
  segments: TranscriptSegment[],
  maxGapSeconds = 45
): TranscriptSegment[] {
  if (!segments.length) return []

  const consolidated: TranscriptSegment[] = []
  let current = { ...segments[0], text: segments[0].text }

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]

    // Always break on headings
    if (seg.isHeading || current.isHeading) {
      consolidated.push(current)
      current = { ...seg }
      continue
    }

    const sameSpeaker = seg.speaker === current.speaker
    const gap =
      seg.timestampSeconds !== null && current.timestampSeconds !== null
        ? seg.timestampSeconds - current.timestampSeconds
        : 0

    if (sameSpeaker && gap <= maxGapSeconds) {
      // Merge: keep inline timestamps — just join with a space
      current = { ...current, text: current.text + ' ' + seg.text }
    } else {
      consolidated.push(current)
      current = { ...seg }
    }
  }

  consolidated.push(current)
  return consolidated
}

/**
 * Apply diff-like changes to segments
 */
export function updateSegmentText(segment: TranscriptSegment, newText: string): TranscriptSegment {
  return {
    ...segment,
    text: newText,
  }
}
