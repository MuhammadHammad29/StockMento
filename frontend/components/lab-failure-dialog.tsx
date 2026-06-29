"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle, ArrowLeft, RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { labsApi } from "@/lib/api"

type LabFailureDialogProps = {
  title?: string
  reason: string
  detail: string
  onClose: () => void
  onReset: () => void
}

export function LabFailureDialog({
  title = "Lab attempt failed",
  reason,
  detail,
  onClose,
  onReset,
}: LabFailureDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-3xl border border-red-200 bg-background p-6 text-center shadow-2xl dark:border-red-500/30 sm:p-8">
        <button
          type="button"
          aria-label="Close failure dialog"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
          <AlertTriangle className="h-10 w-10" />
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-600 dark:text-red-300">
          Try Again
        </p>
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-base font-medium text-foreground">{reason}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button onClick={onReset} className="h-12 bg-red-600 text-white hover:bg-red-700">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Lab
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link href="/labs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Labs
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

type LabTimelineFailureDialogProps = {
  isTimelineFinished: boolean
  isComplete: boolean
  completedCount: number
  totalTasks: number
  onReset: () => void
}

export function LabTimelineFailureDialog({
  isTimelineFinished,
  isComplete,
  completedCount,
  totalTasks,
  onReset,
}: LabTimelineFailureDialogProps) {
  const [dismissed, setDismissed] = useState(false)
  useLabRunReporter({
    isTimelineFinished,
    isComplete,
    completedCount,
    totalTasks,
  })

  useEffect(() => {
    if (!isTimelineFinished || isComplete) {
      setDismissed(false)
    }
  }, [isComplete, isTimelineFinished])

  if (!isTimelineFinished || isComplete || dismissed) {
    return null
  }

  return (
    <LabFailureDialog
      title="Timeline finished"
      reason="The lab timeline reached 100% before all tasks were completed."
      detail={`You completed ${completedCount}/${totalTasks} tasks. This attempt is finished because there is no more historical data left to trade through. Reset the lab to try again from the start.`}
      onClose={() => setDismissed(true)}
      onReset={() => {
        setDismissed(false)
        onReset()
      }}
    />
  )
}

function useLabRunReporter({
  isTimelineFinished,
  isComplete,
  completedCount,
  totalTasks,
}: {
  isTimelineFinished: boolean
  isComplete: boolean
  completedCount: number
  totalTasks: number
}) {
  const pathname = usePathname()
  const labLookup = pathname.split("/").filter(Boolean).at(-1)
  const startRequestedRef = useRef(false)
  const terminalReportedRef = useRef(false)

  useEffect(() => {
    if (!labLookup || startRequestedRef.current) return

    startRequestedRef.current = true
    void labsApi.start(labLookup).catch(() => {
      startRequestedRef.current = false
    })
  }, [labLookup])

  useEffect(() => {
    if (!labLookup || terminalReportedRef.current) return

    if (isComplete) {
      terminalReportedRef.current = true
      void labsApi
        .complete(labLookup, {
          passed: true,
          completedTasks: Array.from({ length: totalTasks }, (_, index) => `task-${index + 1}`),
          totalTasks,
          status: "completed",
        })
        .catch(() => {
          terminalReportedRef.current = false
        })
      return
    }

    if (isTimelineFinished) {
      terminalReportedRef.current = true
      void labsApi
        .complete(labLookup, {
          passed: false,
          completedTasks: Array.from(
            { length: completedCount },
            (_, index) => `task-${index + 1}`,
          ),
          totalTasks,
          status: "failed",
          metadata: {
            reason: "timeline_finished",
          },
        })
        .catch(() => {
          terminalReportedRef.current = false
        })
    }
  }, [completedCount, isComplete, isTimelineFinished, labLookup, totalTasks])

  useEffect(() => {
    if (!terminalReportedRef.current || isComplete || isTimelineFinished) return

    terminalReportedRef.current = false
    if (!labLookup) {
      startRequestedRef.current = false
      return
    }

    startRequestedRef.current = true
    void labsApi.start(labLookup).catch(() => {
      startRequestedRef.current = false
    })
  }, [isComplete, isTimelineFinished, labLookup])
}
