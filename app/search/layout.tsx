import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Lectures | Devotional Transcripts',
  description: 'Search and discover devotional lectures by keyword, speaker, category, and place. Full-text search across thousands of transcribed lectures.',
  openGraph: {
    title: 'Search Lectures | Devotional Transcripts',
    description: 'Search and discover devotional lectures with advanced filtering and full-text search capabilities.',
    type: 'website',
  },
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
