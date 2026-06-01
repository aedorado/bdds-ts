'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type FontSize = 'normal' | 'large'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}>({
  theme: 'dark',
  setTheme: () => {},
  fontSize: 'normal',
  setFontSize: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [fontSize, setFontSize] = useState<FontSize>('normal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedTheme = localStorage.getItem('theme') as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
      document.documentElement.classList.toggle('dark', storedTheme === 'dark')
    } else {
      document.documentElement.classList.add('dark')
    }

    const storedFont = localStorage.getItem('fontSize') as FontSize | null
    if (storedFont) {
      setFontSize(storedFont)
      document.documentElement.classList.toggle('font-large', storedFont === 'large')
    }
  }, [])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize)
    localStorage.setItem('fontSize', newSize)
    document.documentElement.classList.toggle('font-large', newSize === 'large')
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange, fontSize, setFontSize: handleFontSizeChange }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
