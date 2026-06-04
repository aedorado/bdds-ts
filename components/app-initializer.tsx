'use client';

import { useDailyLoginBonus } from '@/hooks/useDailyLoginBonus';
import { ReactNode } from 'react';

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  // Only daily login bonus on app load (once per day per device via localStorage)
  useDailyLoginBonus();

  return <>{children}</>;
}
