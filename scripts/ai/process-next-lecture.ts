import { db } from '@/lib/db'
import { lectures } from '@/lib/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function processNextLecture() {
  console.log(`[${new Date().toISOString()}] Starting AI generation cycle...`)

  try {
    // 1. Find first lecture with no AI generation status
    const pendingLectures = await db
      .select()
      .from(lectures)
      .where(isNull(lectures.aiGenerationStatus))
      .limit(1)

    if (pendingLectures.length === 0) {
      console.log('[INFO] No pending lectures for AI generation')
      return
    }

    const lecture = pendingLectures[0]
    const lectureId = lecture.id

    console.log(`[${new Date().toISOString()}] Processing lecture #${lectureId}: "${lecture.title}"`)

    // 2. Mark as processing
    await db
      .update(lectures)
      .set({
        aiGenerationStatus: 'pending',
        aiGenerationStartedAt: new Date(),
      })
      .where(eq(lectures.id, lectureId))

    console.log(`[${new Date().toISOString()}] ✓ Marked as pending`)

    // 3. Run all 4 AI scripts sequentially
    const scripts = [
      { name: 'Summary', cmd: `npx tsx scripts/ai/summarize.ts --lectureId=${lectureId}` },
      { name: 'Teachings', cmd: `npx tsx scripts/ai/extract-teachings.ts --lectureId=${lectureId}` },
      { name: 'Tags', cmd: `npx tsx scripts/ai/generate-tags.ts --lectureId=${lectureId}` },
      { name: 'Themes', cmd: `npx tsx scripts/ai/extract-themes.ts --lectureId=${lectureId}` },
    ]

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
        break // Stop on first error
      }
    }

    // 4. Mark as completed or failed
    if (hasError) {
      await db
        .update(lectures)
        .set({
          aiGenerationStatus: 'failed',
          aiGenerationCompletedAt: new Date(),
          aiGenerationError: 'One or more AI scripts failed. Check logs for details.',
        })
        .where(eq(lectures.id, lectureId))
      console.log(`[${new Date().toISOString()}] ✗ Marked as failed`)
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
