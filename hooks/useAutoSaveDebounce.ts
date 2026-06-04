'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SaveStatus {
  timeUntilSave: number; // seconds
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export function useAutoSaveDebounce(
  onSave: () => Promise<void>,
  interval: number = 2.5 * 60 * 1000 // 2.5 minutes default
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    timeUntilSave: Math.floor(interval / 1000),
    isSaving: false,
    lastSavedAt: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intervalRef = useRef<any>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timerRef = useRef<any>(undefined);
  const hasActivityRef = useRef(false);

  const triggerSave = useCallback(async () => {
    const lastActivityTime = localStorage.getItem('lastActivityTime');
    if (!lastActivityTime) {
      return; // No activity tracked
    }

    const now = Date.now();
    const lastActivity = parseInt(lastActivityTime);

    // Check if there was activity in the last interval period
    if (now - lastActivity > interval) {
      return; // No recent activity, skip save
    }

    setSaveStatus((prev) => ({ ...prev, isSaving: true }));
    try {
      await onSave();
      setSaveStatus((prev) => ({
        ...prev,
        lastSavedAt: new Date(),
        isSaving: false,
      }));
    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus((prev) => ({ ...prev, isSaving: false }));
    }
  }, [onSave, interval]);

  useEffect(() => {
    const startTimer = () => {
      let countdown = Math.floor(interval / 1000);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        countdown--;
        setSaveStatus((prev) => ({ ...prev, timeUntilSave: countdown }));

        if (countdown <= 0) {
          triggerSave();
          countdown = Math.floor(interval / 1000);
        }
      }, 1000);
    };

    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval, triggerSave]);

  return saveStatus;
}
