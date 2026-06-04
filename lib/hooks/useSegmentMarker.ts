import { useState, useEffect } from 'react'

export function useSegmentMarker(lectureId: number) {
  const [markedIndex, setMarkedIndex] = useState<number | null>(null)
  const key = `lecture_marker_${lectureId}`

  useEffect(() => {
    const saved = localStorage.getItem(key)
    if (saved) setMarkedIndex(parseInt(saved, 10))
  }, [key])

  const setMarker = (index: number | null) => {
    if (index === null) {
      localStorage.removeItem(key)
      setMarkedIndex(null)
    } else {
      localStorage.setItem(key, String(index))
      setMarkedIndex(index)
    }
  }

  return { markedIndex, setMarker }
}
