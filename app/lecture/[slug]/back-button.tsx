'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className={cn(buttonVariants({ variant: 'ghost' }), 'mb-6 -ml-2')}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </button>
  )
}
