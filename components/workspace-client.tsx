"use client";
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface AssignedLecture {
  id: number
  title: string
  slug: string
  status: string
  assignedCorrectorId?: number | null
  assignedProofreaderId?: number | null
}

interface ContributionDataPoint {
  week: string
  points: number
}

interface WorkspaceClientProps {
  user: { name?: string | null; email?: string | null }
  tier: string
  assignedLectures: AssignedLecture[]
  stats: Record<string, unknown> | null
  rank: number | null
  contributionData: ContributionDataPoint[]
  userId: number
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Unassigned',              color: 'bg-slate-100 text-slate-600' },
  assigned:    { label: 'Correction In Progress',  color: 'bg-blue-100 text-blue-700' },
  corrected:   { label: 'Proofreading In Progress',color: 'bg-amber-100 text-amber-700' },
  proofread:   { label: 'Ready to Publish',        color: 'bg-purple-100 text-purple-700' },
  published:   { label: 'Published',               color: 'bg-green-100 text-green-700' },
  archived:    { label: 'Archived',                color: 'bg-slate-100 text-slate-400' },
}

export default function WorkspaceClient({
  assignedLectures,
  contributionData,
  userId,
}: WorkspaceClientProps) {

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold font-heading mb-2">Your Workspace</h1>
        <p className="text-muted-foreground">Track your contributions and manage assigned lectures</p>
      </div>

      {/* Contribution Chart */}
      <div className="bg-card rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Contribution Progress
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={contributionData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="points" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Assigned Lectures */}
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">My Assigned Lectures</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">My Role</th>
                <th className="px-4 py-2 text-left">Pipeline Status</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignedLectures.length > 0 ? (
                assignedLectures.map((lecture) => {
                  const isCorrector = lecture.assignedCorrectorId === userId
                  const isProofreader = lecture.assignedProofreaderId === userId
                  const myRole = isCorrector && isProofreader ? 'Corrector & Proofreader'
                    : isCorrector ? 'Corrector'
                    : isProofreader ? 'Proofreader'
                    : '—'

                  const needsMyAction =
                    (isCorrector && lecture.status === 'assigned') ||
                    (isProofreader && lecture.status === 'corrected')

                  const waitingForPrior = isProofreader && !isCorrector && lecture.status === 'assigned'

                  // Show a more informative status label from the proofreader's perspective
                  const statusLabel = waitingForPrior
                    ? { label: 'Awaiting Correction', color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' }
                    : STATUS_META[lecture.status]

                  return (
                    <tr key={lecture.id} className={needsMyAction ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/lecture/${lecture.slug}`} className="hover:underline">
                          {lecture.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          isCorrector && isProofreader ? 'bg-indigo-100 text-indigo-700' :
                          isCorrector   ? 'bg-amber-100 text-amber-700' :
                          isProofreader ? 'bg-purple-100 text-purple-700' : ''
                        }`}>
                          {myRole}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${statusLabel?.color ?? 'bg-slate-100 text-slate-600'}`}>
                          {statusLabel?.label ?? lecture.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {needsMyAction ? (
                          <Link href={`/lecture/${lecture.slug}`} className="text-amber-600 dark:text-amber-400 hover:underline text-sm font-medium">
                            Action needed →
                          </Link>
                        ) : waitingForPrior ? (
                          <span className="text-xs text-muted-foreground italic">View only · not your turn yet</span>
                        ) : (
                          <Link href={`/lecture/${lecture.slug}`} className="text-primary hover:underline text-sm font-medium">
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No lectures assigned yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
