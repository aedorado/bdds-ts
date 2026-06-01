import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getLectureBySlug } from '@/lib/db/queries'
import { parseTranscript } from '@/lib/transcript'
import { TranscriptEditClient } from './edit-client'
import { TranscriptViewClient } from './view-client'

export default async function LectureEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const lecture = await getLectureBySlug(slug)

  if (!lecture) {
    redirect('/search')
  }

  const segments = parseTranscript(lecture.cleanedTranscript || lecture.rawTranscript || '')

  const lectureData = {
    id: lecture.id,
    slug: lecture.slug,
    title: lecture.title,
    speaker: lecture.speaker,
    place: lecture.place ?? undefined,
    lectureDate: lecture.lectureDate ? lecture.lectureDate.toISOString() : undefined,
    category: lecture.category ?? undefined,
    status: lecture.status,
    youtubeUrl: lecture.youtubeUrl ?? undefined,
    audioUrl: lecture.audioUrl ?? undefined,
  }

  const canEdit = ['admin', 'contributor'].includes(session.role)

  if (!canEdit) {
    return (
      <TranscriptViewClient
        lecture={lectureData}
        segments={segments}
        userRole={session.role}
      />
    )
  }

  return (
    <TranscriptEditClient
      lecture={lectureData}
      segments={segments}
      userRole={session.role}
      userName={session.name}
    />
  )
}
