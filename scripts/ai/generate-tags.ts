import 'dotenv/config'
import { db } from '@/lib/db'
import { lectures } from '@/lib/db/schema'
import { generateTags } from '@/lib/ai'
import { eq } from 'drizzle-orm'

/**
 * Script to generate tags for a lecture
 * Usage: npx tsx scripts/ai/generate-tags.ts --lectureId=123
 */
async function main() {
  const args = process.argv.slice(2)
  const lectureIdArg = args.find((arg) => arg.startsWith('--lectureId='))

  if (!lectureIdArg) {
    console.error('Usage: npx tsx scripts/ai/generate-tags.ts --lectureId=123')
    process.exit(1)
  }

  const lectureId = parseInt(lectureIdArg.split('=')[1], 10)

  if (!lectureId || isNaN(lectureId)) {
    console.error('Invalid lecture ID')
    process.exit(1)
  }

  try {
    console.log(`📚 Generating tags for lecture ${lectureId}...`)

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

    // Generate tags
    console.log('🤖 Calling Gemini AI...')
    const tags = await generateTags(transcript)

    // Save to database
    console.log('💾 Saving to database...')

    await db
      .update(lectures)
      .set({ tags, updatedAt: new Date() })
      .where(eq(lectures.id, lectureId))

    console.log('✅ Tags generated successfully!')
    console.log(`\nGenerated ${tags.length} tags:`)
    console.log('---')
    console.log(tags.join(', '))
    console.log('---')
  } catch (error) {
    console.error('Error generating tags:', error)
    process.exit(1)
  }
}

main()
