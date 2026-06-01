'use server'

import { withAdminRole, getSession } from '@/lib/auth'
import { awardCorrectionBonus, awardProofreadBonus } from '@/lib/points'
import {
  createLecture,
  updateLecture,
  deleteLecture,
  getLecture,
  CreateLectureSchema,
  getAllCorrectors,
  getAllProofreaders,
  getLectures,
  getAllUsers,
  updateUserRole,
  deactivateUser,
  reactivateUser,
} from '@/lib/db/queries'
import { z } from 'zod'

/**
 * Server action to create a new lecture
 */
export async function createLectureAction(formData: z.infer<typeof CreateLectureSchema> & { rawTranscript?: string }) {
  const session = await withAdminRole()

  try {
    const lecture = await createLecture(formData, session.userId)
    return { success: true, lecture }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create lecture' }
  }
}

/**
 * Server action to update a lecture
 */
export async function updateLectureAction(
  id: number,
  data: Partial<z.infer<typeof CreateLectureSchema>> & {
    cleanedTranscript?: string
    status?: string
    completionPercentage?: number
    assignedCorrectorId?: number | null
    assignedProofreaderId?: number | null
  }
) {
  const _session = await withAdminRole()

  try {
    const lecture = await updateLecture(id, data)
    return { success: true, lecture }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update lecture' }
  }
}

/**
 * Server action to delete a lecture — only the admin who created it may delete it
 */
export async function deleteLectureAction(id: number) {
  const session = await withAdminRole()

  try {
    // Fetch the lecture to check ownership
    const existing = await getLecture(id)
    if (!existing) return { success: false, error: 'Lecture not found' }
    if (existing.createdBy !== session.userId) {
      return { success: false, error: 'Only the admin who added this lecture can delete it' }
    }

    await deleteLecture(id)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete lecture' }
  }
}

/**
 * Server action to get all correctors
 */
export async function getAllCorrectorsAction() {
  const _session = await withAdminRole()

  try {
    const correctors = await getAllCorrectors()
    return { success: true, correctors }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch correctors' }
  }
}

/**
 * Server action to get all proofreaders
 */
export async function getAllProofreaderAction() {
  const _session = await withAdminRole()

  try {
    const proofreaders = await getAllProofreaders()
    return { success: true, proofreaders }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch proofreaders' }
  }
}

/**
 * Server action to get all lectures (with pagination)
 */
export async function getAllLecturesAction(page: number = 1, limit: number = 20) {
  const _session = await withAdminRole()

  try {
    const result = await getLectures(page, limit)
    return { success: true, ...result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch lectures' }
  }
}

/**
 * Server action to assign corrector to lecture
 */
export async function assignCorrectorAction(lectureId: number, correctorId: number | null) {
  const _session = await withAdminRole()

  try {
    const existing = await getLecture(lectureId)
    const newStatus = correctorId
      ? 'assigned'
      : (existing?.status === 'assigned' ? 'not_started' : existing?.status ?? 'not_started')
    const lecture = await updateLecture(lectureId, { assignedCorrectorId: correctorId, status: newStatus })
    return { success: true, lecture }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign corrector' }
  }
}

/**
 * Server action to assign proofreader to lecture
 */
export async function assignProofreaderAction(lectureId: number, proofreaderId: number | null) {
  const _session = await withAdminRole()

  try {
    const lecture = await updateLecture(lectureId, { assignedProofreaderId: proofreaderId })
    return { success: true, lecture }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to assign proofreader' }
  }
}

/**
 * Server action to get all users with pagination
 */
export async function getAllUsersAction(page: number = 1, limit: number = 20) {
  const _session = await withAdminRole()

  try {
    const result = await getAllUsers(page, limit)
    return { success: true, ...result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch users' }
  }
}

/**
 * Server action to update user role
 */
export async function updateUserRoleAction(userId: number, newRole: string) {
  const session = await withAdminRole()

  if (session.userId === userId) {
    return { success: false, error: 'Cannot modify your own role' }
  }

  try {
    const user = await updateUserRole(userId, newRole)
    return { success: true, user }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update user role' }
  }
}

/**
 * Server action to deactivate user
 */
export async function deactivateUserAction(userId: number) {
  const session = await withAdminRole()

  if (session.userId === userId) {
    return { success: false, error: 'Cannot deactivate yourself' }
  }

  try {
    const user = await deactivateUser(userId)
    return { success: true, user }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to deactivate user' }
  }
}

/**
 * Server action to reactivate user
 */
export async function reactivateUserAction(userId: number) {
  const _session = await withAdminRole()

  try {
    const user = await reactivateUser(userId)
    return { success: true, user }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reactivate user' }
  }
}

/**
 * Corrector marks their work done: assigned → corrected
 */
export async function markCorrectedAction(lectureId: number) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const lecture = await getLecture(lectureId)
  if (!lecture) return { success: false, error: 'Lecture not found' }

  if (lecture.status !== 'assigned') {
    return { success: false, error: 'Lecture is not in the assigned stage' }
  }
  if (session.role !== 'admin' && lecture.assignedCorrectorId !== session.userId) {
    return { success: false, error: 'Only the assigned corrector can mark this as corrected' }
  }

  const updated = await updateLecture(lectureId, { status: 'corrected' })
  await awardCorrectionBonus(session.userId, lectureId)
  return { success: true, lecture: updated }
}

/**
 * Proofreader marks their work done: corrected → proofread
 */
export async function markProofreadAction(lectureId: number) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const lecture = await getLecture(lectureId)
  if (!lecture) return { success: false, error: 'Lecture not found' }

  if (lecture.status !== 'corrected') {
    return { success: false, error: 'Lecture has not been corrected yet' }
  }
  if (session.role !== 'admin' && lecture.assignedProofreaderId !== session.userId) {
    return { success: false, error: 'Only the assigned proofreader can mark this as proofread' }
  }

  const updated = await updateLecture(lectureId, { status: 'proofread' })
  await awardProofreadBonus(session.userId, lectureId)
  return { success: true, lecture: updated }
}

/**
 * Admin publishes a lecture: proofread → published
 */
export async function publishLectureAction(lectureId: number) {
  const _session = await withAdminRole()

  const lecture = await getLecture(lectureId)
  if (!lecture) return { success: false, error: 'Lecture not found' }

  if (lecture.status !== 'proofread') {
    return { success: false, error: 'Lecture must be proofread before publishing' }
  }

  const updated = await updateLecture(lectureId, { status: 'published' })
  return { success: true, lecture: updated }
}
