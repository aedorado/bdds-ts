import 'dotenv/config'
import { db } from '@/lib/db'
import { aiSummaries, lectures } from '@/lib/db/schema'
import { extractTeachings } from '@/lib/ai'
import { eq } from 'drizzle-orm'

/**
 * Script to extract key teachings from a lecture
 * Usage: npx tsx scripts/ai/extract-teachings.ts --lectureId=123
 */
async function main() {
  const args = process.argv.slice(2)
  const lectureIdArg = args.find((arg) => arg.startsWith('--lectureId='))

  if (!lectureIdArg) {
    console.error('Usage: npx tsx scripts/ai/extract-teachings.ts --lectureId=123')
    process.exit(1)
  }

  const lectureId = parseInt(lectureIdArg.split('=')[1], 10)

  if (!lectureId || isNaN(lectureId)) {
    console.error('Invalid lecture ID')
    process.exit(1)
  }

  try {
    console.log(`📚 Extracting teachings from lecture ${lectureId}...`)

    // Fetch the lecture
    const lecture = await db
      .select()
      .from(lectures)
      .where(eq(lectures.id, lectureId))
      .limit(1)

    if (!lecture.length) {
      console.error(`Lecture ${lectureId} not found`)
      process.exit(1)
    }

    const transcript = lecture[0].cleanedTranscript || lecture[0].rawTranscript

    if (!transcript) {
      console.error('Lecture has no transcript')
      process.exit(1)
    }

    // Extract teachings
    console.log('🤖 Calling Gemini AI...')
    const teachings = await extractTeachings(transcript)

    // Save to database
    console.log('💾 Saving to database...')

    const existing = await db
      .select()
      .from(aiSummaries)
      .where(eq(aiSummaries.lectureId, lectureId))
      .limit(1)

    if (existing.length) {
      await db
        .update(aiSummaries)
        .set({ keyTeachings: teachings, generatedAt: new Date() })
        .where(eq(aiSummaries.lectureId, lectureId))
    } else {
      await db.insert(aiSummaries).values({
        lectureId,
        keyTeachings: teachings,
      })
    }

    console.log('✅ Teachings extracted successfully!')
    console.log(`\nExtracted ${teachings.length} teachings:`)
    console.log('---')
    teachings.forEach((teaching, idx) => {
      console.log(`${idx + 1}. ${teaching}`)
    })
    console.log('---')
  } catch (error) {
    console.error('Error extracting teachings:', error)
    process.exit(1)
  }
}

main()
