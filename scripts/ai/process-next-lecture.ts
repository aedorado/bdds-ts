import { db } from '@/lib/db'
import { lectures, aiSummaries } from '@/lib/db/schema'
import { eq, isNull, or, ne } from 'drizzle-orm'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function processNextLecture() {
  console.log(`[${new Date().toISOString()}] Starting AI generation cycle...`)

  try {
    // 1. Find first lecture with no AI generation status, OR is in pending/failed status
    const pendingLectures = await db
      .select()
      .from(lectures)
      .where(
        or(
          isNull(lectures.aiGenerationStatus),
          ne(lectures.aiGenerationStatus, 'completed')
        )
      )
      .limit(1)

    if (pendingLectures.length === 0) {
      console.log('[INFO] No pending lectures for AI generation')
      return
    }

    const lecture = pendingLectures[0]
    const lectureId = lecture.id

    console.log(`[${new Date().toISOString()}] Processing lecture #${lectureId}: "${lecture.title}"`)

    // 2. Mark as pending
    await db
      .update(lectures)
      .set({
        aiGenerationStatus: 'pending',
        aiGenerationStartedAt: new Date(),
      })
      .where(eq(lectures.id, lectureId))

    console.log(`[${new Date().toISOString()}] ✓ Marked as pending`)

    // 3. Fetch existing AI generation results to skip already-completed parts
    const existingAi = await db
      .select()
      .from(aiSummaries)
      .where(eq(aiSummaries.lectureId, lectureId))
      .limit(1)

    const aiSummary = existingAi[0]
    const runSummary = !aiSummary || !aiSummary.summary
    const runTeachings = !aiSummary || !aiSummary.keyTeachings || aiSummary.keyTeachings.length === 0
    const runTags = !lecture.tags || lecture.tags.length === 0
    const runThemes = !aiSummary || !aiSummary.themes || aiSummary.themes.length === 0
    const runAnecdotes = !aiSummary || !aiSummary.anecdotes || aiSummary.anecdotes.length === 0

    // 4. Build only the scripts that need to be run
    const scripts = []
    if (runSummary) {
      scripts.push({ name: 'Summary', cmd: `npx tsx scripts/ai/summarize.ts --lectureId=${lectureId}` })
    }
    if (runTeachings) {
      scripts.push({ name: 'Teachings', cmd: `npx tsx scripts/ai/extract-teachings.ts --lectureId=${lectureId}` })
    }
    if (runTags) {
      scripts.push({ name: 'Tags', cmd: `npx tsx scripts/ai/generate-tags.ts --lectureId=${lectureId}` })
    }
    if (runThemes) {
      scripts.push({ name: 'Themes', cmd: `npx tsx scripts/ai/extract-themes.ts --lectureId=${lectureId}` })
    }
    if (runAnecdotes) {
      scripts.push({ name: 'Anecdotes', cmd: `npx tsx scripts/ai/extract-anecdotes.ts --lectureId=${lectureId}` })
    }

    if (scripts.length === 0) {
      console.log(`[${new Date().toISOString()}] All AI parts are already generated for lecture #${lectureId}. Marking as completed.`)
      await db
        .update(lectures)
        .set({
          aiGenerationStatus: 'completed',
          aiGenerationCompletedAt: new Date(),
          aiGenerationError: null,
        })
        .where(eq(lectures.id, lectureId))
      return
    }

    let hasError = false
    for (const script of scripts) {
      try {
        console.log(`[${new Date().toISOString()}] Running ${script.name}...`)
        await execAsync(script.cmd)
        console.log(`[${new Date().toISOString()}] ✓ ${script.name} complete`)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`[${new Date().toISOString()}] ✗ ${script.name} failed: ${errorMsg}`)
        hasError = true
        break // Stop on first error, saving already succeeded parts
      }
    }

    // 5. Fetch fresh state to determine if at least one part is successfully saved
    const updatedLecture = await db
      .select({ tags: lectures.tags })
      .from(lectures)
      .where(eq(lectures.id, lectureId))
      .limit(1)

    const updatedAi = await db
      .select()
      .from(aiSummaries)
      .where(eq(aiSummaries.lectureId, lectureId))
      .limit(1)

    const freshLecture = updatedLecture[0]
    const freshAi = updatedAi[0]

    const hasAnySuccess =
      (freshAi?.summary && freshAi.summary.length > 0) ||
      (freshAi?.keyTeachings && freshAi.keyTeachings.length > 0) ||
      (freshAi?.themes && freshAi.themes.length > 0) ||
      (freshAi?.anecdotes && freshAi.anecdotes.length > 0) ||
      (freshLecture?.tags && freshLecture.tags.length > 0)

    // 6. Update final status
    if (hasError) {
      const newStatus = hasAnySuccess ? 'pending' : 'failed'
      await db
        .update(lectures)
        .set({
          aiGenerationStatus: newStatus,
          aiGenerationCompletedAt: new Date(),
          aiGenerationError: 'One or more AI scripts failed. Check logs for details.',
        })
        .where(eq(lectures.id, lectureId))
      console.log(`[${new Date().toISOString()}] ✗ Pipeline failed. Status updated to: ${newStatus}`)
    } else {
      await db
        .update(lectures)
        .set({
          aiGenerationStatus: 'completed',
          aiGenerationCompletedAt: new Date(),
          aiGenerationError: null,
        })
        .where(eq(lectures.id, lectureId))
      console.log(`[${new Date().toISOString()}] ✓ Marked as completed`)
    }

    console.log(`[${new Date().toISOString()}] AI generation cycle finished`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Fatal error:`, error)
    process.exit(1)
  }
}

processNextLecture()
