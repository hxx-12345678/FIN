"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"

export function PresentationMode({ children }: { children: React.ReactNode }) {
  const [isPresentationMode, setIsPresentationMode] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPresentationMode) {
        setIsPresentationMode(false)
      }
    }

    if (isPresentationMode) {
      document.addEventListener("keydown", handleKeyPress)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress)
      document.body.style.overflow = ""
    }
  }, [isPresentationMode])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsPresentationMode(!isPresentationMode)}
        className="fixed top-4 right-4 z-50"
      >
        {isPresentationMode ? (
          <>
            <Minimize2 className="h-4 w-4 mr-2" />
            Exit Presentation
          </>
        ) : (
          <>
            <Maximize2 className="h-4 w-4 mr-2" />
            Presentation Mode
          </>
        )}
      </Button>
      <div
        className={isPresentationMode ? "fixed inset-0 z-40 bg-background overflow-auto" : ""}
        style={isPresentationMode ? { padding: 0 } : {}}
      >
        {children}
      </div>
    </>
  )
}


