'use client';

import { useEffect } from 'react';

export function useActivityTracker(elementRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const recordActivity = () => {
      // Just record that user is active - don't track every keystroke
      localStorage.setItem('lastActivityTime', Date.now().toString());
    };

    // Only track keystrokes - simple indicator of activity
    element.addEventListener('keydown', recordActivity);

    return () => {
      element.removeEventListener('keydown', recordActivity);
    };
  }, [elementRef]);
}
