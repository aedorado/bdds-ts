import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Community Leaderboard | Devotional Transcripts',
  description: 'Join the community of devotional lecture transcribers. View the leaderboard, earn seva points, and unlock badges through contributions.',
  openGraph: {
    title: 'Community Leaderboard | Devotional Transcripts',
    description: 'Connect with fellow contributors and track your progress through our gamified contribution system.',
    type: 'website',
  },
}

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
