import { getSession } from '@/lib/auth/session'
import { hasRole } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { getLecturesAssignedToUser } from '@/lib/db/queries'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BookOpen, Pencil, Eye } from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string }> = {
  not_started:  { label: 'Not started',  color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  assigned:     { label: 'Assigned',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
  correcting:   { label: 'Correcting',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200' },
  proofreading: { label: 'Proofreading', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
  archived:     { label: 'Archived',     color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MyLecturesPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/dev-login')
  if (!hasRole(session.role, 'contributor')) redirect('/')

  const assigned = await getLecturesAssignedToUser(
    session.userId,
    session.role as 'contributor' | 'admin'
  )

  const userId = session.userId

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-heading mb-2">My Assigned Lectures</h1>
        <p className="text-muted-foreground">
          Lectures assigned to you for correction or proofreading
        </p>
      </div>

      {assigned.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No lectures assigned yet</p>
          <p className="text-sm mt-1">Check back later or contact your admin</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Lecture</th>
                <th className="px-4 py-3 text-left font-medium w-32">Your Role</th>
                <th className="px-4 py-3 text-left font-medium w-32">Status</th>
                <th className="px-4 py-3 text-left font-medium w-32">Lecture Date</th>
                <th className="px-4 py-3 text-left font-medium w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((lecture, i) => {
                const isCorrector   = lecture.assignedCorrectorId   === userId
                const isProofreader = lecture.assignedProofreaderId === userId
                const sm = STATUS_META[lecture.status] ?? STATUS_META.not_started
                // Can edit if assigned as corrector (correcting) or proofreader (proofreading)
                const canEdit = (isCorrector && ['assigned', 'correcting'].includes(lecture.status))
                             || (isProofreader && lecture.status === 'proofreading')

                return (
                  <tr key={lecture.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : ''}`}>
                    {/* Lecture */}
                    <td className="px-4 py-3">
                      <Link href={`/lecture/${lecture.slug}`} className="font-medium hover:underline line-clamp-2 leading-snug">
                        {lecture.title}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {lecture.speaker}{lecture.category ? ` · ${lecture.category}` : ''}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {isCorrector   && <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 w-fit">Corrector</Badge>}
                        {isProofreader && <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 w-fit">Proofreader</Badge>}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${sm.color}`}>{sm.label}</Badge>
                    </td>

                    {/* Lecture Date */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(lecture.lectureDate)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canEdit ? (
                          <Link href={`/lecture/${lecture.slug}/edit`}
                            className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium',
                              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors')}>
                            <Pencil className="w-3 h-3" /> Edit
                          </Link>
                        ) : (
                          <Link href={`/lecture/${lecture.slug}`}
                            className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium',
                              'border border-border hover:bg-muted transition-colors')}>
                            <Eye className="w-3 h-3" /> View
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        {assigned.length} lecture{assigned.length !== 1 ? 's' : ''} assigned to you
      </p>
    </div>
  )
}
