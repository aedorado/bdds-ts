import { db } from '@/lib/db'
import { lectures } from '@/lib/db/schema'

async function main() {
  const rows = await db.select({
    id: lectures.id,
    title: lectures.title,
    hasRaw: lectures.rawTranscript,
    hasCleaned: lectures.cleanedTranscript,
    aiProcessedAt: lectures.aiProcessedAt,
  }).from(lectures)

  for (const r of rows) {
    console.log(`[${r.id}] ${r.title}`)
    console.log(`    transcript: raw=${!!r.hasRaw} cleaned=${!!r.hasCleaned}  ai_processed_at=${r.aiProcessedAt ?? 'null'}`)
  }
  console.log(`\nTotal: ${rows.length}`)
}

main()
