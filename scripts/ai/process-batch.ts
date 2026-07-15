import { db } from '@/lib/db'
import { aiSummaries, lectures } from '@/lib/db/schema'
import {
  generateSummary,
  extractTeachings,
  extractThemes,
  generateTags,
  extractAnecdotes,
  extractVerses,
  extractPersonalities,
  extractSadhanaTips,
  extractQuotes,
  extractQA
} from '@/lib/ai'
import { eq, isNull } from 'drizzle-orm'

/**
 * Batch AI processing pipeline — runs all 4 tasks in parallel per lecture.
 *
 * Usage:
 *   npx tsx scripts/ai/process-batch.ts              # process unprocessed lectures
 *   npx tsx scripts/ai/process-batch.ts --force      # reprocess all lectures
 *   npx tsx scripts/ai/process-batch.ts --id=5       # process single lecture
 */

const args = process.argv.slice(2)
const force = args.includes('--force')
const idArg = args.find((a) => a.startsWith('--id='))
const targetId = idArg ? parseInt(idArg.split('=')[1], 10) : null

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const RPM_DELAY_MS = 45_000 // 1 RPM — wait 61s between each API call

async function processLecture(lecture: typeof lectures.$inferSelect) {
  const transcript = lecture.cleanedTranscript || lecture.rawTranscript
  if (!transcript) {
    console.log(`  [${lecture.id}] skipped — no transcript`)
    return
  }

  console.log(`  [${lecture.id}] "${lecture.title}" — 5 sequential AI calls (~5 min due to 1 RPM limit)`)

  console.log(`    [1/5] summary...`)
  const summary = await generateSummary(transcript, 200)
  await sleep(RPM_DELAY_MS)

  console.log(`    [2/5] teachings...`)
  const keyTeachings = await extractTeachings(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [3/5] themes...`)
  const themes = await extractThemes(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [4/5] tags...`)
  const tags = await generateTags(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [5/10] anecdotes...`)
  const anecdotes = await extractAnecdotes(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [6/10] verses...`)
  const verses = await extractVerses(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [7/10] personalities...`)
  const personalities = await extractPersonalities(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [8/10] sadhana tips...`)
  const sadhanaTips = await extractSadhanaTips(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [9/10] quotes...`)
  const quotes = await extractQuotes(transcript)
  await sleep(RPM_DELAY_MS)

  console.log(`    [10/10] qa...`)
  const qa = await extractQA(transcript)

  // Upsert ai_summaries
  const existing = await db
    .select({ id: aiSummaries.id })
    .from(aiSummaries)
    .where(eq(aiSummaries.lectureId, lecture.id))
    .limit(1)

  if (existing.length) {
    await db
      .update(aiSummaries)
      .set({
        summary,
        keyTeachings,
        themes,
        anecdotes,
        verses,
        personalities,
        sadhanaTips,
        quotes,
        qa,
        generatedAt: new Date()
      })
      .where(eq(aiSummaries.lectureId, lecture.id))
  } else {
    await db.insert(aiSummaries).values({
      lectureId: lecture.id,
      summary,
      keyTeachings,
      themes,
      anecdotes,
      verses,
      personalities,
      sadhanaTips,
      quotes,
      qa
    })
  }

  // Save tags + mark as processed
  await db
    .update(lectures)
    .set({ tags, aiProcessedAt: new Date(), updatedAt: new Date() })
    .where(eq(lectures.id, lecture.id))

  console.log(`  [${lecture.id}] done — summary, ${keyTeachings.length} teachings, ${themes.length} themes, ${tags.length} tags, ${anecdotes.length} anecdotes, ${verses.length} verses, ${personalities.length} personalities, ${sadhanaTips.length} sadhana tips, ${quotes.length} quotes, ${qa.length} qa`)
}

async function main() {
  console.log(`AI batch pipeline — force=${force}${targetId ? ` id=${targetId}` : ''}`)

  let rows: (typeof lectures.$inferSelect)[]

  if (targetId) {
    rows = await db.select().from(lectures).where(eq(lectures.id, targetId))
    if (!rows.length) {
      console.error(`Lecture ${targetId} not found`)
      process.exit(1)
    }
  } else if (force) {
    rows = await db.select().from(lectures)
  } else {
    rows = await db.select().from(lectures).where(isNull(lectures.aiProcessedAt))
  }

  const eligible = rows.filter((l) => l.rawTranscript || l.cleanedTranscript)
  console.log(`Found ${eligible.length} lecture(s) to process`)

  if (!eligible.length) {
    console.log('Nothing to do.')
    return
  }

  let succeeded = 0
  let failed = 0

  for (let i = 0; i < eligible.length; i++) {
    const lecture = eligible[i]
    try {
      await processLecture(lecture)
      succeeded++
    } catch (err) {
      console.error(`  [${lecture.id}] FAILED:`, err instanceof Error ? err.message : err)
      failed++
    }
    if (i < eligible.length - 1) await sleep(RPM_DELAY_MS)
  }

  console.log(`\nDone: ${succeeded} succeeded, ${failed} failed`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
