"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Trophy } from "lucide-react"

interface ProgressTrackerProps {
  courseId: string
  lessonId?: string
  type: "course" | "lesson" | "quiz"
  onProgressUpdate?: (progress: number) => void
}

export function ProgressTracker({ courseId, lessonId, type, onProgressUpdate }: ProgressTrackerProps) {
  const [progress, setProgress] = useState(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    const savedProgress = localStorage.getItem(`progress_${courseId}_${lessonId || "course"}`)
    if (savedProgress) {
      const data = JSON.parse(savedProgress)
      setProgress(data.progress || 0)
      setTimeSpent(data.timeSpent || 0)
      setIsCompleted(data.completed || false)
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      setTimeSpent((prev) => {
        const newTime = prev + 1
        if (newTime % 60 === 0) {
          saveProgress(progress, newTime, isCompleted)
        }
        return newTime
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      saveProgress(progress, timeSpent, isCompleted)
    }
  }, [courseId, lessonId])

  const saveProgress = (currentProgress: number, currentTime: number, completed: boolean) => {
    const progressData = {
      progress: currentProgress,
      timeSpent: currentTime,
      completed,
      lastUpdated: Date.now(),
    }
    localStorage.setItem(`progress_${courseId}_${lessonId || "course"}`, JSON.stringify(progressData))
    onProgressUpdate?.(currentProgress)
  }

  const updateProgress = (newProgress: number) => {
    setProgress(newProgress)
    const completed = newProgress >= 100
    setIsCompleted(completed)
    saveProgress(newProgress, timeSpent, completed)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/90 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">
          {type === "course" ? "Course Progress" : type === "lesson" ? "Lesson Progress" : "Quiz Progress"}
        </h3>
        {isCompleted && (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>Time: {formatTime(timeSpent)}</span>
        </div>
        {type === "quiz" && (
          <div className="flex items-center space-x-1">
            <Trophy className="h-4 w-4" />
            <span>Best: 85%</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2 border-t pt-2">
        <button
          onClick={() => updateProgress(Math.min(progress + 25, 100))}
          className="rounded px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
        >
          +25%
        </button>
        <button
          onClick={() => updateProgress(100)}
          className="rounded px-3 py-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
        >
          Complete
        </button>
        <button
          onClick={() => updateProgress(0)}
          className="rounded px-3 py-1 text-xs bg-muted/60 text-foreground dark:bg-muted/40"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
