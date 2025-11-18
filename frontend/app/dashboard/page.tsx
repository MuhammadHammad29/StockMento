/**
 * User Dashboard Page
 * 
 * Personal dashboard for logged-in users showing their learning progress,
 * enrolled courses, and recent activity. Includes navigation
 * to continue learning and manage profile settings.
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  Clock,
  Play,
  Target,
  BarChart3,
  ChevronRight,
  Loader2,
  Layers,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { formatDuration, formatTimeAgo } from "@/lib/data-utils"
import { UserNavbar } from "@/components/navigation"
import { useEffect, useMemo, useState } from "react"
import { publicCoursesApi, studentCoursesApi } from "@/lib/api"
import type {
  CourseEnrollmentSummary,
  PublicCourseSummary,
  LearningStreakSummary,
} from "@/lib/types"

type RecentActivityItem = {
  id: string
  title: string
  course: string
  time: string
  type: "course_complete" | "course_progress" | "course_enrolled"
}

type UpcomingLesson = {
  id: string
  title: string
  courseId: string
  courseTitle: string
  duration: number
  type: "text" | "video"
  href: string
}

type ActivitySummary = {
  totalCourses: number
  completedCourses: number
  completedLessons: number
  averageProgress: number
}

const getLevelBadgeVariant = () => "secondary"

export default function DashboardPage() {
  const { user } = useAuth()

  const [enrollments, setEnrollments] = useState<CourseEnrollmentSummary[]>([])
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false)
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<PublicCourseSummary[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [learningStreak, setLearningStreak] = useState<LearningStreakSummary | null>(null)
  const [isLoadingStreak, setIsLoadingStreak] = useState(false)
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([])
  const [isLoadingNextLessons, setIsLoadingNextLessons] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      setIsLoadingCatalog(true)
      try {
        const data = await publicCoursesApi.list()
        if (!cancelled) {
          setCatalog(data)
          setCatalogError(null)
        }
      } catch (error) {
        console.error("Failed to load course catalog", error)
        if (!cancelled) {
          setCatalogError("Unable to load available courses right now.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false)
        }
      }
    }

    void loadCatalog()
    return () => {
      cancelled = true
    }
  }, [])

useEffect(() => {
  if (!user) {
    setEnrollments([])
    return
  }

    let cancelled = false
    const loadEnrollments = async () => {
      setIsLoadingEnrollments(true)
      try {
        const data = await studentCoursesApi.list()
        if (!cancelled) {
          setEnrollments(data.filter((enrollment) => enrollment.status !== "dropped"))
          setEnrollmentError(null)
        }
      } catch (error) {
        console.error("Failed to load enrollments", error)
        if (!cancelled) {
          setEnrollmentError("Unable to load your courses right now.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEnrollments(false)
        }
      }
    }

    void loadEnrollments()
    return () => {
      cancelled = true
    }
  }, [user])

useEffect(() => {
  if (!user) {
    setLearningStreak(null)
    return
  }

  let cancelled = false
  const fetchStreak = async () => {
    setIsLoadingStreak(true)
    try {
      const data = await studentCoursesApi.getLearningStreak()
      if (!cancelled) {
        setLearningStreak(data)
      }
    } catch (error) {
      console.error("Failed to load learning streak", error)
      if (!cancelled) {
        setLearningStreak(null)
      }
    } finally {
      if (!cancelled) {
        setIsLoadingStreak(false)
      }
    }
  }

  void fetchStreak()
  return () => {
    cancelled = true
  }
}, [user])

  const activeEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.status !== "dropped"),
    [enrollments],
  )

  const enrollmentCourseIds = useMemo(
    () => new Set(activeEnrollments.map((enrollment) => enrollment.course.id)),
    [activeEnrollments],
  )

  const availableCourses = useMemo(
    () =>
      catalog
        .filter((course) => !enrollmentCourseIds.has(course.id) && course.isPublished)
        .slice(0, 3),
    [catalog, enrollmentCourseIds],
  )

  const activitySummary: ActivitySummary = useMemo(() => {
    if (activeEnrollments.length === 0) {
      return {
        totalCourses: 0,
        completedCourses: 0,
        completedLessons: 0,
        averageProgress: 0,
      }
    }

    const totalCourses = activeEnrollments.length
    const completedCourses = activeEnrollments.filter(
      (enrollment) => enrollment.status === "completed",
    ).length
    const completedLessons = activeEnrollments.reduce((sum, enrollment) => {
      const percent = enrollment.progressPercent ?? 0
      const completedForCourse = Math.round(
        (percent / 100) * enrollment.course.totalLessons,
      )
      return sum + completedForCourse
    }, 0)
    const averageProgress = Math.round(
      activeEnrollments.reduce(
        (sum, enrollment) => sum + (enrollment.progressPercent ?? 0),
        0,
      ) / totalCourses,
    )

    return {
      totalCourses,
      completedCourses,
      completedLessons,
      averageProgress,
    }
  }, [activeEnrollments])

  const recentActivity: RecentActivityItem[] = useMemo(() => {
    if (activeEnrollments.length === 0) {
      return []
    }

    return activeEnrollments
      .map((enrollment) => {
        const isCompleted = enrollment.status === "completed"
        const percent = enrollment.progressPercent ?? 0
        const hasProgress = percent > 0
        const courseTitle = enrollment.course.title
        const defaultTimestamp =
          enrollment.course.updatedAt ?? new Date().toISOString()

        if (isCompleted) {
          return {
            id: `${enrollment.id}-completed`,
            course: courseTitle,
            time: enrollment.completedAt ?? defaultTimestamp,
            type: "course_complete" as const,
            title: `Completed "${courseTitle}"`,
          }
        }

        if (hasProgress) {
          return {
            id: `${enrollment.id}-progress`,
            course: courseTitle,
            time: enrollment.course.updatedAt ?? enrollment.startedAt ?? defaultTimestamp,
            type: "course_progress" as const,
            title: `Progressed in "${courseTitle}"`,
          }
        }

        return {
          id: `${enrollment.id}-enrolled`,
          course: courseTitle,
          time: enrollment.startedAt ?? enrollment.course.createdAt ?? defaultTimestamp,
          type: "course_enrolled" as const,
          title: `Enrolled in "${courseTitle}"`,
        }
      })
      .sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      )
      .slice(0, 3)
  }, [activeEnrollments])

  useEffect(() => {
    let cancelled = false

    const loadNextLessons = async () => {
      if (activeEnrollments.length === 0) {
        const fallback = availableCourses.slice(0, 2).map((course) => ({
          id: course.id,
          title: course.title,
          courseId: course.id,
          courseTitle: course.title,
          duration: Math.max(
            Math.round(course.durationMinutes / Math.max(course.totalLessons || 1, 1)),
            10,
          ),
          type: "text" as const,
          href: `/courses/${course.id}`,
        }))
        setUpcomingLessons(fallback)
        setIsLoadingNextLessons(false)
        return
      }

      setIsLoadingNextLessons(true)
      try {
        const results: UpcomingLesson[] = []
        const targets = activeEnrollments.slice(0, 3)

        for (const enrollment of targets) {
          try {
            const [progress, detail] = await Promise.all([
              studentCoursesApi.getProgress(enrollment.course.id),
              publicCoursesApi.detail(enrollment.course.id),
            ])

            const nextLessonProgress = progress.sections
              .flatMap((section) => section.lessons)
              .find((lesson) => lesson.status !== "completed")
            const nextLessonId = nextLessonProgress?.id
            if (!nextLessonId) {
              continue
            }

            let lessonTitle = nextLessonProgress.title
            let lessonDuration = 15
            let lessonType: UpcomingLesson["type"] = "text"

            detail.sections.some((section) => {
              const lesson = section.lessons.find((item) => item.id === nextLessonId)
              if (lesson) {
                lessonTitle = lesson.title
                lessonDuration = lesson.durationMinutes
                lessonType = lesson.contentType === "video" ? "video" : "text"
                return true
              }
              return false
            })

            results.push({
              id: nextLessonId,
              title: lessonTitle,
              courseId: enrollment.course.id,
              courseTitle: enrollment.course.title,
              duration: lessonDuration,
              type: lessonType,
              href: `/courses/${enrollment.course.id}/lessons/${nextLessonId}`,
            })
          } catch (error) {
            console.error("Failed to load next lesson for course", enrollment.course.id, error)
          }

          if (cancelled) {
            return
          }
        }

        if (!cancelled) {
          setUpcomingLessons(results)
        }
      } catch (error) {
        console.error("Failed to load upcoming lessons", error)
        if (!cancelled) {
          setUpcomingLessons([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingNextLessons(false)
        }
      }
    }

    void loadNextLessons()

    return () => {
      cancelled = true
    }
  }, [activeEnrollments, availableCourses])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Please sign in to access your dashboard</h1>
          <Link href="/signin">
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <UserNavbar />

      <div className="mx-auto grid max-w-7xl gap-4 sm:gap-6 px-3 sm:px-6 py-6 sm:py-10 grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Welcome Card with Quick Actions */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 ">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">Welcome, {user.firstName}</CardTitle>
                <CardDescription className="text-sm sm:text-base text-muted-foreground">
                  Track your progress and continue learning about the Pakistan Stock Exchange.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                {/* Improved pill-style badge for active courses */}
                {activitySummary.totalCourses > 0 ? (
                  <Link href="/courses" className="inline-block">
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1.5 text-sm sm:text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-700/20 dark:text-emerald-200 shadow-sm hover:opacity-95"
                    >
                      {activitySummary.totalCourses} active
                    </Badge>
                  </Link>
                ) : (
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1.5 text-sm sm:text-sm bg-muted/40 text-muted-foreground dark:bg-muted/20 dark:text-muted-foreground/80"
                  >
                    No active courses
                  </Badge>
                )}

                <Link href="/courses">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm w-full sm:w-auto">
                    <BookOpen className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Browse All Courses
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    <BarChart3 className="h-3 w-3 text-emerald-500" />
                    Overall Progress
                  </div>
                  <div className="mt-2 flex items-center gap-2 sm:gap-3">
                    <div className="text-2xl sm:text-3xl font-semibold text-foreground">{activitySummary.averageProgress}%</div>
                    <Progress value={activitySummary.averageProgress} className="h-1.5 sm:h-2 flex-1" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    <Target className="h-3 w-3 text-amber-500" />
                    Lessons Completed
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {activitySummary.completedLessons}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Courses Completed
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {activitySummary.completedCourses}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Courses */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                  Current Courses
                </CardTitle>
                <CardDescription className="text-sm">Your ongoing learning journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                {isLoadingEnrollments ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                ) : activeEnrollments.length > 0 ? (
                  activeEnrollments.map((enrollment) => {
                    const { course } = enrollment
                    const progressPercent = enrollment.progressPercent ?? 0
                    const lessonsCompletedEstimate = Math.min(
                      course.totalLessons,
                      Math.round((progressPercent / 100) * course.totalLessons),
                    )

                    return (
                      <div
                        key={enrollment.id}
                        className="rounded-lg border border-border/40 bg-background/70 p-3 sm:p-4 backdrop-blur-sm transition-colors hover:bg-background/90"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground line-clamp-2">
                              {course.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                              {course.description}
                            </p>
                          </div>
                          <Badge
                            variant={getLevelBadgeVariant(course.level)}
                            className="text-xs uppercase tracking-wide self-start sm:self-center flex-shrink-0"
                          >
                            {(course.level ?? "LEVEL").toUpperCase()}
                          </Badge>
                        </div>
                        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={progressPercent} className="h-1.5 sm:h-2 flex-1 max-w-24 sm:max-w-32" />
                              <span className="text-xs sm:text-sm font-medium text-foreground">{progressPercent}%</span>
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {lessonsCompletedEstimate} / {course.totalLessons} lessons
                          </div>
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center justify-end">
                          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                            <Link href={`/courses/${course.id}`} className="flex-1 sm:flex-none">
                              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-4 w-full sm:w-auto">
                                View Course
                              </Button>
                            </Link>
                            <Link href={`/courses/${course.id}`} className="flex-1 sm:flex-none">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm px-2 sm:px-4 w-full sm:w-auto">
                                <Play className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                Continue
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 bg-gradient-to-br from-emerald-50/50 to-blue-50/50 dark:from-emerald-950/20 dark:to-blue-950/20 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                      <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-foreground">Start Your Learning Journey</h3>
                    <p className="mb-6 text-sm text-muted-foreground">
                      Discover our comprehensive courses designed specifically for Pakistani investors
                    </p>
                    <div className="flex flex-col gap-3 lg:flex-col xl:flex-row xl:justify-center">
                      <Link href="/courses?filter=beginner" className="flex-1">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 w-full justify-center">
                          <Target className="mr-2 h-4 w-4" />
                          Start with Basics
                        </Button>
                      </Link>
                      <Link href="/courses" className="flex-1">
                        <Button variant="outline" className="w-full justify-center">
                          <BookOpen className="mr-2 h-4 w-4" />
                          Browse All Courses
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
                {enrollmentError && (
                  <p className="text-xs sm:text-sm text-destructive">{enrollmentError}</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-sm">Your learning progress over time</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {isLoadingEnrollments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="mt-2 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{activity.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{activity.course}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatTimeAgo(activity.time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No course activity yet. Start learning to see your journey here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Available Courses Section */}
          {(availableCourses.length > 0 || isLoadingCatalog || catalogError) && (
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-4 sm:p-6">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    Explore More Courses
                  </CardTitle>
                  <CardDescription>Continue building your trading expertise</CardDescription>
                </div>
                <Link href="/courses">
                  <Button variant="outline" size="sm">
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {catalogError && (
                  <p className="text-xs sm:text-sm text-destructive mb-4">{catalogError}</p>
                )}
                {isLoadingCatalog ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                ) : availableCourses.length > 0 ? (
                  <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {availableCourses.map((course) => {
                      const durationLabel = formatDuration(course.durationMinutes)

                      return (
                        <div
                          key={course.id}
                          className="group rounded-xl border border-border/50 bg-background/70 p-4 md:p-5 backdrop-blur-sm transition-all hover:border-emerald-200 hover:bg-background/90 hover:shadow-md flex flex-col h-full"
                        >
                          <div className="mb-3 md:mb-4 flex items-start justify-between">
                            <Badge
                              variant={getLevelBadgeVariant(course.level)}
                              className="text-xs md:text-sm uppercase tracking-wide"
                            >
                              {(course.level ?? "LEVEL").toUpperCase()}
                            </Badge>
                          </div>

                          <h3 className="mb-2 md:mb-3 line-clamp-2 text-lg md:text-xl font-semibold text-foreground group-hover:text-emerald-600">
                            {course.title}
                          </h3>
                          <p className="mb-3 md:mb-4 line-clamp-2 text-sm md:text-base text-muted-foreground flex-grow">
                            {course.description}
                          </p>

                          <div className="mb-3 md:mb-4 flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3 md:h-4 md:w-4" />
                              {course.sectionsCount} sections
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
                              {course.totalLessons} lessons
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 md:h-4 md:w-4" />
                              {durationLabel}
                            </span>
                          </div>

                          <div className="flex flex-col xl:flex-row gap-2 mt-auto">
                            <Link href={`/courses/${course.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full h-9 text-xs sm:text-sm font-medium">
                                Preview
                              </Button>
                            </Link>
                            <Link href={`/courses/${course.id}`} className="flex-1">
                              <Button size="sm" className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm font-medium">
                                Start Learning
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You&apos;re all caught up! Check back soon for new courses to explore.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Lessons */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Next Lessons</CardTitle>
              <CardDescription>Continue your learning path</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {isLoadingNextLessons ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading your next lessons...
                  </div>
                ) : upcomingLessons.length > 0 ? (
                  upcomingLessons.map((lesson) => (
                    <Link key={lesson.id} href={lesson.href} className="block">
                      <div className="flex items-start space-x-3 rounded-lg border border-border/50 bg-background/70 p-3 backdrop-blur-sm transition-all hover:border-emerald-200 hover:bg-background/90 hover:shadow-sm cursor-pointer group">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 dark:bg-emerald-500/15 dark:group-hover:bg-emerald-500/25 transition-colors">
                          {lesson.type === "video" ? (
                            <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-emerald-600">
                            {lesson.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">{lesson.courseTitle}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{lesson.duration} min</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center">No upcoming lessons scheduled yet.</p>
                )}
              </div>

              <div className="grid gap-2">
                <Link href="/courses">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse All Courses
                  </Button>
                </Link>
                <Link href="/progress">
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Progress
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Learning Streak */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Target className="h-5 w-5 text-amber-500" />
                Learning Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              {isLoadingStreak ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-foreground">
                    {learningStreak?.currentStreak ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {learningStreak?.currentStreak === 1 ? "Day in a row" : "Days in a row"}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Best streak: {learningStreak?.bestStreak ?? 0} days
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                  >
                    {learningStreak && learningStreak.currentStreak > 0
                      ? "Great job!"
                      : "Let’s start learning"}
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

