"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { X, ChevronLeft, ChevronRight, SkipForward, Play, Pause } from "lucide-react"

interface ScriptStep {
  id: string
  title: string
  description: string
  highlight?: string
}

interface DemoScriptOverlayProps {
  script: ScriptStep[]
  onComplete: () => void
  autoAdvance?: boolean
}

export function DemoScriptOverlay({ script, onComplete, autoAdvance = false }: DemoScriptOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (autoAdvance && !isPaused && currentStep < script.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [currentStep, autoAdvance, isPaused, script.length])

  const handleNext = () => {
    if (currentStep < script.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  if (script.length === 0) return null

  const step = script[currentStep]
  const progress = ((currentStep + 1) / script.length) * 100

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-2xl mx-auto">
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {currentStep + 1} of {script.length}
                </span>
                <Progress value={progress} className="flex-1 h-2" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentStep === 0}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {autoAdvance && (
                <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSkip}>
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
              <Button size="sm" onClick={handleNext}>
                {currentStep === script.length - 1 ? "Complete" : "Next"}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


