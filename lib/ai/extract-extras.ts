import 'dotenv/config'
import { db } from '@/lib/db'
import { aiSummaries, lectures } from '@/lib/db/schema'
import {
  extractVerses,
  extractPersonalities,
  extractSadhanaTips,
  extractQuotes,
  extractQA
} from '@/lib/ai'
import { eq } from 'drizzle-orm'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const RPM_DELAY_MS = 45_000 // 1 RPM limit delay

async function main() {
  const args = process.argv.slice(2)
  const lectureIdArg = args.find((arg) => arg.startsWith('--lectureId='))

  if (!lectureIdArg) {
    console.error('Usage: npx tsx scripts/ai/extract-extras.ts --lectureId=123 [options]')
    process.exit(1)
  }

  const lectureId = parseInt(lectureIdArg.split('=')[1], 10)

  if (!lectureId || isNaN(lectureId)) {
    console.error('Invalid lecture ID')
    process.exit(1)
  }

  // Parse specific run flags. If no specific flags are provided, run all of them.
  const hasRunFlags = args.some(arg =>
    ['--runVerses', '--runPersonalities', '--runSadhana', '--runQuotes', '--runQA'].includes(arg)
  )

  const runVerses = !hasRunFlags || args.includes('--runVerses')
  const runPersonalities = !hasRunFlags || args.includes('--runPersonalities')
  const runSadhana = !hasRunFlags || args.includes('--runSadhana')
  const runQuotes = !hasRunFlags || args.includes('--runQuotes')
  const runQA = !hasRunFlags || args.includes('--runQA')

  try {
    console.log(`📚 Processing additional AI metadata for lecture #${lectureId}...`)
    console.log(`Flags: verses=${runVerses}, personalities=${runPersonalities}, sadhana=${runSadhana}, quotes=${runQuotes}, qa=${runQA}`)

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

    const updates: Record<string, any> = {}
    let needsSleep = false

    if (runVerses) {
      if (needsSleep) await sleep(RPM_DELAY_MS)
      console.log('🤖 Extracting scriptural verses...')
      updates.verses = await extractVerses(transcript)
      console.log(`   Found ${updates.verses.length} verses.`)
      needsSleep = true
    }

    if (runPersonalities) {
      if (needsSleep) await sleep(RPM_DELAY_MS)
      console.log('🤖 Extracting scriptural personalities...')
      updates.personalities = await extractPersonalities(transcript)
      console.log(`   Found ${updates.personalities.length} personalities.`)
      needsSleep = true
    }

    if (runSadhana) {
      if (needsSleep) await sleep(RPM_DELAY_MS)
      console.log('🤖 Extracting sadhana tips...')
      updates.sadhanaTips = await extractSadhanaTips(transcript)
      console.log(`   Found ${updates.sadhanaTips.length} sadhana tips.`)
      needsSleep = true
    }

    if (runQuotes) {
      if (needsSleep) await sleep(RPM_DELAY_MS)
      console.log('🤖 Extracting quotes...')
      updates.quotes = await extractQuotes(transcript)
      console.log(`   Found ${updates.quotes.length} quotes.`)
      needsSleep = true
    }

    if (runQA) {
      if (needsSleep) await sleep(RPM_DELAY_MS)
      console.log('🤖 Extracting Q&A...')
      updates.qa = await extractQA(transcript)
      console.log(`   Found ${updates.qa.length} Q&A items.`)
      needsSleep = true
    }

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
        .set({ ...updates, generatedAt: new Date() })
        .where(eq(aiSummaries.lectureId, lectureId))
    } else {
      await db.insert(aiSummaries).values({
        lectureId,
        ...updates,
      })
    }

    console.log('✅ Additional AI metadata processing complete!')
  } catch (error) {
    console.error('Error processing additional AI metadata:', error)
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
