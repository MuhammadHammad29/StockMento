"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle, ArrowLeft, Lock, RotateCcw, X } from "lucide-react"

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
  completedTasks?: string[]
  stateSnapshot?: Record<string, unknown>
  onResume?: (snapshot: Record<string, unknown>) => void
  onFreshStart?: () => void
  onReset: () => void
}

export function LabTimelineFailureDialog({
  isTimelineFinished,
  isComplete,
  completedCount,
  totalTasks,
  completedTasks,
  stateSnapshot,
  onResume,
  onFreshStart,
  onReset,
}: LabTimelineFailureDialogProps) {
  const [dismissed, setDismissed] = useState(false)
  const { unavailable } = useLabRunReporter({
    isTimelineFinished,
    isComplete,
    completedCount,
    totalTasks,
    completedTasks,
    stateSnapshot,
    onResume,
    onFreshStart,
  })

  useEffect(() => {
    if (!isTimelineFinished || isComplete) {
      setDismissed(false)
    }
  }, [isComplete, isTimelineFinished])

  if (unavailable) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 py-6 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 text-center shadow-2xl sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="h-8 w-8" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Lab unavailable
          </p>
          <h2 className="text-2xl font-bold text-foreground">This lab is not published</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            The lab may be unpublished, removed, or not available for students yet.
          </p>
          <Button asChild className="mt-7 h-12">
            <Link href="/labs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Labs
            </Link>
          </Button>
        </div>
      </div>
    )
  }

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
  completedTasks,
  stateSnapshot,
  onResume,
  onFreshStart,
}: {
  isTimelineFinished: boolean
  isComplete: boolean
  completedCount: number
  totalTasks: number
  completedTasks?: string[]
  stateSnapshot?: Record<string, unknown>
  onResume?: (snapshot: Record<string, unknown>) => void
  onFreshStart?: () => void
}) {
  const pathname = usePathname()
  const labLookup = pathname.split("/").filter(Boolean).at(-1)
  const [startReady, setStartReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const startRequestedRef = useRef(false)
  const terminalReportedRef = useRef(false)
  const resumeAppliedRef = useRef(false)
  const lastSavedPayloadRef = useRef<string | null>(null)

  const taskKeys = useMemo(
    () =>
      completedTasks ??
      Array.from({ length: completedCount }, (_, index) => `task-${index + 1}`),
    [completedCount, completedTasks],
  )

  useEffect(() => {
    if (!labLookup || startRequestedRef.current) return

    startRequestedRef.current = true
    setUnavailable(false)
    void labsApi
      .start(labLookup)
      .then((run) => {
        setStartReady(true)
        if (run.status === "started" && !resumeAppliedRef.current) {
          if (onResume && isPlainRecord(run.stateSnapshot)) {
            resumeAppliedRef.current = true
            onResume(run.stateSnapshot)
          } else {
            onFreshStart?.()
          }
        }
      })
      .catch(() => {
        setStartReady(false)
        setUnavailable(true)
        startRequestedRef.current = false
      })
  }, [labLookup, onFreshStart, onResume])

  useEffect(() => {
    if (!startReady) return
    if (!labLookup || terminalReportedRef.current || isComplete || isTimelineFinished) return
    if (totalTasks <= 0) return

    const payload = {
      completedTasks: taskKeys,
      totalTasks,
      stateSnapshot: stateSnapshot ?? {
        completedCount,
        totalTasks,
      },
      metadata: {
        progressPercent: Math.round((completedCount / Math.max(totalTasks, 1)) * 100),
      },
      clientVersion: "lab-run-snapshot-v1",
    }
    const serialized = JSON.stringify(payload)
    if (serialized === lastSavedPayloadRef.current) return

    const timeout = window.setTimeout(() => {
      lastSavedPayloadRef.current = serialized
      void labsApi.saveProgress(labLookup, payload).catch(() => {
        lastSavedPayloadRef.current = null
      })
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [
    completedCount,
    isComplete,
    isTimelineFinished,
    labLookup,
    startReady,
    stateSnapshot,
    taskKeys,
    totalTasks,
  ])

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
          metadata: stateSnapshot ? { stateSnapshot } : undefined,
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
          completedTasks: taskKeys,
          totalTasks,
          status: "failed",
          metadata: {
            reason: "timeline_finished",
            ...(stateSnapshot ? { stateSnapshot } : {}),
          },
        })
        .catch(() => {
          terminalReportedRef.current = false
        })
    }
  }, [completedCount, isComplete, isTimelineFinished, labLookup, stateSnapshot, taskKeys, totalTasks])

  useEffect(() => {
    if (!terminalReportedRef.current || isComplete || isTimelineFinished) return

    terminalReportedRef.current = false
    if (!labLookup) {
      startRequestedRef.current = false
      return
    }

    startRequestedRef.current = true
    setStartReady(false)
    void labsApi
      .start(labLookup)
      .then(() => {
        setStartReady(true)
      })
      .catch(() => {
        setUnavailable(true)
        startRequestedRef.current = false
      })
  }, [isComplete, isTimelineFinished, labLookup])

  return { unavailable }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}
