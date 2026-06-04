'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface PointsAwardResult {
  pointsAwarded: number;
  totalPoints: number;
}

export function usePointsAward() {
  const [pointsAwarded, setPointsAwarded] = useState<PointsAwardResult | null>(
    null
  );
  const [isAwarding, setIsAwarding] = useState(false);
  const lastAwardTimeRef = useRef<number>(Date.now());
  const FIVE_MINUTES = 5 * 60 * 1000;

  const checkAndAwardPoints = useCallback(async () => {
    console.log('Checking for points award eligibility...');
    const lastActivityTime = localStorage.getItem('lastActivityTime');
    if (!lastActivityTime) return;

    const now = Date.now();
    const lastActivity = parseInt(lastActivityTime);

    // Check if there was activity in the last 5 minutes
    if (now - lastActivity > FIVE_MINUTES) {
      return; // No activity in last 5 mins
    }

    setIsAwarding(true);
    try {
      const res = await fetch('/api/activity/heartbeat', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.pointsAwarded > 0) {
          const now = new Date();
          console.log(
            `✅ [${now.toLocaleTimeString()}] Points committed: +${data.pointsAwarded} pts (Total: ${data.totalPoints})`
          );
          lastAwardTimeRef.current = Date.now();
          setPointsAwarded(data);
          // Clear notification after 3 seconds
          setTimeout(() => setPointsAwarded(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    } finally {
      setIsAwarding(false);
    }
  }, []);

  useEffect(() => {
    // Check every 5 minutes (300000ms)
    const interval = setInterval(checkAndAwardPoints, FIVE_MINUTES);

    // Also check on mount
    checkAndAwardPoints();

    return () => clearInterval(interval);
  }, [checkAndAwardPoints]);

  return { pointsAwarded, isAwarding };
}
