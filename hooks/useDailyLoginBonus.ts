'use client';

import { useEffect, useState } from 'react';

export function useDailyLoginBonus() {
  const [pointsAwarded, setPointsAwarded] = useState(0);

  useEffect(() => {
    const checkAndAwardBonus = async () => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `daily_login_${today}`;

      // Check if already awarded today
      if (localStorage.getItem(key)) {
        return;
      }

      try {
        const res = await fetch('/api/activity/daily-login', {
          method: 'POST',
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(key, 'true');
          setPointsAwarded(data.pointsAwarded);

          // Show notification (optional)
          console.log(`🎉 Daily login bonus: +${data.pointsAwarded} pts`);
        }
      } catch (error) {
        console.error('Error awarding daily login bonus:', error);
      }
    };

    checkAndAwardBonus();
  }, []);

  return { pointsAwarded };
}
