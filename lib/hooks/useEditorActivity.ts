'use client'

import { useEffect, useRef, useCallback } from 'react'
import posthog from '@/lib/posthog'

interface ActivityMetrics {
  totalSeconds: number
  activeSeconds: number
  idleSeconds: number
  tabVisibleSeconds: number
  tabHiddenSeconds: number
  charactersChanged: number
  savesCount: number
  autosavesCount: number
}

interface UseEditorActivityTrackerProps {
  lectureId: number
  lectureSlug: string
  onMetricsUpdate?: (metrics: ActivityMetrics) => void
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30 * 1000 // 30 seconds

/**
 * Tracks user activity on the transcript editor
 * - Records time spent (active vs idle)
 * - Detects keyboard/mouse/scroll activity
 * - Tracks tab visibility
 * - Sends periodic heartbeats to PostHog
 * - Sends final session summary on unmount
 */
export function useEditorActivity({
  lectureId,
  lectureSlug,
  onMetricsUpdate,
}: UseEditorActivityTrackerProps) {
  const metricsRef = useRef<ActivityMetrics>({
    totalSeconds: 0,
    activeSeconds: 0,
    idleSeconds: 0,
    tabVisibleSeconds: 0,
    tabHiddenSeconds: 0,
    charactersChanged: 0,
    savesCount: 0,
    autosavesCount: 0,
  })

  const stateRef = useRef({
    sessionStartTime: Date.now(),
    lastActivityTime: Date.now(),
    isTabVisible: !document.hidden,
    lastHeartbeatTime: Date.now(),
    isIdle: false,
  })

  // Update character count (called from editor)
  const recordCharacterChange = useCallback((delta: number) => {
    metricsRef.current.charactersChanged += Math.abs(delta)
  }, [])

  // Record a save event
  const recordSave = useCallback((isAutosave = false) => {
    if (isAutosave) {
      metricsRef.current.autosavesCount++
    } else {
      metricsRef.current.savesCount++
    }
  }, [])

  // Record activity (mouse, keyboard, scroll)
  const recordActivity = useCallback(() => {
    const now = Date.now()
    const lastActivity = stateRef.current.lastActivityTime
    const timeSinceLastActivity = now - lastActivity

    // Only update if more than 1 second since last activity
    if (timeSinceLastActivity > 1000) {
      stateRef.current.lastActivityTime = now
      stateRef.current.isIdle = false
    }
  }, [])

  // Handle visibility change (tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      stateRef.current.isTabVisible = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Track mouse/keyboard/scroll activity
  useEffect(() => {
    const handleActivity = () => recordActivity()

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'touchmove']
    events.forEach(event => document.addEventListener(event, handleActivity))

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity))
    }
  }, [recordActivity])

  // Periodic heartbeat and metrics calculation
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const metrics = metricsRef.current
      const state = stateRef.current

      // Calculate elapsed time since session start
      const totalElapsedMs = now - state.sessionStartTime
      const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000)

      // Calculate active vs idle
      const timeSinceLastActivity = now - state.lastActivityTime
      const isCurrentlyIdle = timeSinceLastActivity > IDLE_TIMEOUT_MS

      if (isCurrentlyIdle && !state.isIdle) {
        state.isIdle = true
      } else if (!isCurrentlyIdle && state.isIdle) {
        state.isIdle = false
      }

      // Calculate time buckets
      const isTabVisible = state.isTabVisible
      const idleElapsedMs = isCurrentlyIdle ? IDLE_TIMEOUT_MS : timeSinceLastActivity
      const activeElapsedMs = totalElapsedMs - idleElapsedMs

      metrics.totalSeconds = totalElapsedSeconds
      metrics.activeSeconds = Math.floor(activeElapsedMs / 1000)
      metrics.idleSeconds = Math.floor(idleElapsedMs / 1000)
      metrics.tabVisibleSeconds = isTabVisible ? totalElapsedSeconds : Math.floor((totalElapsedMs - (now - state.sessionStartTime)) / 1000)
      metrics.tabHiddenSeconds = !isTabVisible ? totalElapsedSeconds : 0

      // Send heartbeat to PostHog
      posthog.capture('editor_activity_heartbeat', {
        lectureId,
        lectureSlug,
        totalSeconds: metrics.totalSeconds,
        activeSeconds: metrics.activeSeconds,
        idleSeconds: metrics.idleSeconds,
        isCurrentlyIdle,
        isTabVisible,
        charactersChanged: metrics.charactersChanged,
        savesCount: metrics.savesCount,
        autosavesCount: metrics.autosavesCount,
      })

      if (onMetricsUpdate) {
        onMetricsUpdate({ ...metrics })
      }
    }, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(heartbeatInterval)
  }, [lectureId, lectureSlug, onMetricsUpdate])

  // Send final summary on unmount
  useEffect(() => {
    return () => {
      const metrics = metricsRef.current
      const state = stateRef.current

      // Calculate final metrics
      const sessionEndTime = Date.now()
      const totalSessionMs = sessionEndTime - state.sessionStartTime
      const totalSessionSeconds = Math.floor(totalSessionMs / 1000)

      const timeSinceLastActivity = sessionEndTime - state.lastActivityTime
      const wasIdle = timeSinceLastActivity > IDLE_TIMEOUT_MS

      const activeSeconds = wasIdle
        ? Math.max(0, metrics.activeSeconds - timeSinceLastActivity / 1000)
        : metrics.activeSeconds + (totalSessionSeconds - metrics.activeSeconds)

      const idleSeconds = totalSessionSeconds - activeSeconds

      // Send final session event
      posthog.capture('transcript_editor_session_end', {
        lectureId,
        lectureSlug,
        totalSeconds: totalSessionSeconds,
        activeSeconds: Math.floor(activeSeconds),
        idleSeconds: Math.floor(idleSeconds),
        charactersChanged: metrics.charactersChanged,
        savesCount: metrics.savesCount,
        autosavesCount: metrics.autosavesCount,
        totalSaves: metrics.savesCount + metrics.autosavesCount,
        idleThresholdSeconds: IDLE_TIMEOUT_MS / 1000,
      })
    }
  }, [lectureId, lectureSlug])

  return {
    recordActivity,
    recordCharacterChange,
    recordSave,
    getMetrics: () => ({ ...metricsRef.current }),
  }
}
