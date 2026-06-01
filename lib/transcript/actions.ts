'use server'

import { withContributorRole } from '@/lib/auth'
import { updateLecture } from '@/lib/db/queries'
import { segmentsToRawTranscript, TranscriptSegment } from '@/lib/transcript/parser'

/**
 * Server action to save transcript changes.
 *
 * Storage model (2-column, no revision history):
 *   lectures.rawTranscript     — original text set by admin, never overwritten here
 *   lectures.cleanedTranscript — working copy edited by contributors (this is what we update)
 *
 * Diff view compares these two fields directly on the lecture row — no extra table needed.
 */
export async function saveTranscriptAction(
  lectureId: number,
  segments: TranscriptSegment[],
) {
  await withContributorRole()

  try {
    const cleanedTranscript = segmentsToRawTranscript(segments)

    const lecture = await updateLecture(lectureId, { cleanedTranscript })

    return { success: true, lecture }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save transcript',
    }
  }
}
