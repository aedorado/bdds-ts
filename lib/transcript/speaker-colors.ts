/**
 * Stable per-speaker color palette.
 * Hash the speaker name → consistent color across the whole editor session.
 */

export const SPEAKER_PALETTE = [
  { pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',    border: 'border-l-blue-400'    },
  { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', border: 'border-l-emerald-400' },
  { pill: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', border: 'border-l-violet-400'  },
  { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', border: 'border-l-amber-400'   },
  { pill: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',    border: 'border-l-rose-400'    },
  { pill: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',    border: 'border-l-cyan-400'    },
  { pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', border: 'border-l-orange-400' },
  { pill: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',    border: 'border-l-pink-400'    },
] as const

export function getSpeakerColor(speaker: string | null) {
  if (!speaker) return SPEAKER_PALETTE[0]
  let hash = 0
  for (let i = 0; i < speaker.length; i++) {
    hash = ((hash << 5) - hash) + speaker.charCodeAt(i)
    hash |= 0
  }
  return SPEAKER_PALETTE[Math.abs(hash) % SPEAKER_PALETTE.length]
}
