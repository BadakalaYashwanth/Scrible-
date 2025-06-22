"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Laptop } from "lucide-react"

/**
 * Cycles through: system → light → dark → system …
 */
export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const current = theme === "system" ? resolvedTheme : theme

  function nextTheme() {
    switch (theme) {
      case "system":
        setTheme("light")
        break
      case "light":
        setTheme("dark")
        break
      default:
        setTheme("system")
    }
  }

  const icon =
    current === "light" ? (
      <Sun className="h-5 w-5" />
    ) : current === "dark" ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Laptop className="h-5 w-5" />
    )

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={nextTheme}>
      {icon}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
