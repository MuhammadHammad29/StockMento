"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { UserNavbar } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { studentCoursesApi } from "@/lib/api"
import { formatDuration } from "@/lib/data-utils"
import type {
  CourseEnrollmentStatus,
  CourseEnrollmentSummary,
  CourseProgressSummary,
} from "@/lib/types"
import {
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock,
  Layers,
  Loader2,
  PlayCircle,
  Target,
  ListOrdered,
} from "lucide-react"

type ProgressMap = Record<string, CourseProgressSummary>

type ProgressStats = {
  totalCourses: number
  completedCourses: number
  activeCourses: number
  completedLessons: number
  totalLessons: number
  averageProgress: number
  totalDurationMinutes: number
}

const initialStats: ProgressStats = {
  totalCourses: 0,
  completedCourses: 0,
  activeCourses: 0,
  completedLessons: 0,
  totalLessons: 0,
  averageProgress: 0,
  totalDurationMinutes: 0,
}

const getStatusIcon = (status: CourseEnrollmentStatus) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
    case "active":
      return <PlayCircle className="h-5 w-5 text-sky-600 dark:text-sky-300" />
    default:
      return <PlayCircle className="h-5 w-5 text-muted-foreground" />
  }
}

const getStatusBadgeClasses = (status: CourseEnrollmentStatus) => {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
    case "active":
      return "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200"
    default:
      return "bg-muted/60 text-muted-foreground"
  }
}

const getStatusLabel = (status: CourseEnrollmentStatus) => {
  switch (status) {
    case "completed":
      return "Completed"
    case "active":
      return "In progress"
    default:
      return "Unavailable"
  }
}

const resolveCourseProgress = (
  enrollment: CourseEnrollmentSummary,
  progressMap: ProgressMap,
) => {
  const summary = progressMap[enrollment.courseId]
  const totalLessons = summary?.totalLessons ?? enrollment.course.totalLessons ?? 0
  const completedLessons = summary?.completedLessons ??
    Math.round(((enrollment.progressPercent ?? 0) / 100) * totalLessons)
  const percentComplete = summary?.percentComplete ??
    (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : enrollment.progressPercent ?? 0)

  return {
    totalLessons,
    completedLessons,
    percentComplete: Math.min(100, Math.max(0, percentComplete ?? 0)),
  }
}

export default function ProgressPage() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<CourseEnrollmentSummary[]>([])
  const [progressMap, setProgressMap] = useState<ProgressMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadProgress = async () => {
      if (!user) {
        setEnrollments([])
        setProgressMap({})
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const enrollmentData = await studentCoursesApi.list()
        if (cancelled) return

        const activeEnrollments = enrollmentData.filter(
          (enrollment) => enrollment.status !== "dropped",
        )
        setEnrollments(activeEnrollments)

        if (activeEnrollments.length === 0) {
          setProgressMap({})
          return
        }

        const progressEntries = await Promise.all(
          activeEnrollments.map(async (enrollment) => {
            try {
              const summary = await studentCoursesApi.getProgress(enrollment.courseId)
              return { courseId: enrollment.courseId, summary }
            } catch (err) {
              console.error(`Failed to load progress for course ${enrollment.courseId}`, err)
              return null
            }
          }),
        )

        if (cancelled) return

        const nextMap: ProgressMap = {}
        progressEntries.forEach((entry) => {
          if (entry) {
            nextMap[entry.courseId] = entry.summary
          }
        })
        setProgressMap(nextMap)
      } catch (err) {
        console.error("Failed to load course progress", err)
        if (!cancelled) {
          setError("Unable to load your progress right now.")
          setEnrollments([])
          setProgressMap({})
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadProgress()

    return () => {
      cancelled = true
    }
  }, [user])

  const stats = useMemo<ProgressStats>(() => {
    if (enrollments.length === 0) {
      return initialStats
    }

    const completedCourses = enrollments.filter((enrollment) => enrollment.status === "completed").length
    const totalLessons = enrollments.reduce((sum, enrollment) => {
      const summary = progressMap[enrollment.courseId]
      return sum + (summary?.totalLessons ?? enrollment.course.totalLessons ?? 0)
    }, 0)
    const completedLessons = enrollments.reduce((sum, enrollment) => {
      const summary = progressMap[enrollment.courseId]
      if (summary) {
        return sum + summary.completedLessons
      }

      const courseTotal = enrollment.course.totalLessons ?? 0
      return sum + Math.round(((enrollment.progressPercent ?? 0) / 100) * courseTotal)
    }, 0)

    const totalProgress = enrollments.reduce((sum, enrollment) => {
      const summary = progressMap[enrollment.courseId]
      if (summary) {
        return sum + summary.percentComplete
      }
      return sum + (enrollment.progressPercent ?? 0)
    }, 0)

    const totalDurationMinutes = enrollments.reduce(
      (sum, enrollment) => sum + (enrollment.course.durationMinutes ?? 0),
      0,
    )

    return {
      totalCourses: enrollments.length,
      completedCourses,
      activeCourses: Math.max(enrollments.length - completedCourses, 0),
      completedLessons,
      totalLessons,
      averageProgress: enrollments.length > 0 ? Math.round(totalProgress / enrollments.length) : 0,
      totalDurationMinutes,
    }
  }, [enrollments, progressMap])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Sign in to view your progress</h1>
          <Link href="/signin">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <UserNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Learning Progress</h1>
          <p className="text-muted-foreground">Track real-time progress for every course you are enrolled in.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Courses Completed
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{stats.completedCourses}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                <BookOpen className="h-4 w-4 text-sky-500" />
                Active Courses
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{stats.activeCourses}</p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                <Target className="h-4 w-4 text-amber-500" />
                Lessons Completed
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {stats.completedLessons}
                <span className="text-base font-normal text-muted-foreground"> / {stats.totalLessons}</span>
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6 space-y-3">
              <div className="text-sm text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                Average Progress
              </div>
              <p className="text-3xl font-semibold text-foreground">{stats.averageProgress}%</p>
              <Progress value={stats.averageProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">Estimated learning time: {formatDuration(stats.totalDurationMinutes)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl text-foreground">Course Progress</CardTitle>
              <CardDescription>Up-to-date progress pulled from your actual course activity.</CardDescription>
            </div>
            <Link href="/courses">
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
                <BookOpen className="h-4 w-4" /> Browse Courses
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              </div>
            ) : enrollments.length > 0 ? (
              enrollments.map((enrollment) => {
                const { totalLessons, completedLessons, percentComplete } = resolveCourseProgress(enrollment, progressMap)
                const durationLabel = formatDuration(enrollment.course.durationMinutes ?? 0)

                return (
                  <div
                    key={enrollment.id}
                    className="rounded-xl border border-border/50 bg-background/70 p-4 sm:p-5 flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        {getStatusIcon(enrollment.status)}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground line-clamp-2">{enrollment.course.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{enrollment.course.description}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {enrollment.course.sectionsCount} sections
                            </span>
                            <span className="flex items-center gap-1">
                              <ListOrdered className="h-3 w-3" />
                              {enrollment.course.totalLessons} lessons
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {durationLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getStatusBadgeClasses(enrollment.status)} uppercase text-xs tracking-wide`}>
                        {getStatusLabel(enrollment.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
                        <div className="mt-2 flex items-center gap-3">
                          <Progress value={percentComplete} className="h-2 flex-1" />
                          <span className="text-sm font-semibold text-foreground">{percentComplete}%</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {completedLessons} / {totalLessons} lessons completed
                        </p>
                      </div>
                      <Link href={`/courses/${enrollment.courseId}`} className="w-full sm:w-auto">
                        <Button size="sm" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                          {enrollment.status === "completed" ? "Review Course" : "Resume Course"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 space-y-3">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="text-base font-semibold text-foreground">No course progress yet</p>
                <p className="text-sm text-muted-foreground">
                  Enroll in a course to see your real-time progress metrics here.
                </p>
                <Link href="/courses">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Browse Courses</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
