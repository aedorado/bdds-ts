import { withAdminRole } from '@/lib/auth/middleware'
import { NewLectureClient } from './client'

export const metadata = { title: 'Add New Lecture' }

export default async function NewLecturePage() {
  await withAdminRole()
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold font-heading mb-6">Add New Lecture</h1>
      <NewLectureClient />
    </div>
  )
}
