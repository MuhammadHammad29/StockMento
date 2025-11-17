"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock, Lock, FileText, Video, Play, Loader2, CheckCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { formatDuration } from "@/lib/data-utils"
import { toast } from "sonner"
import { useCallback, useEffect, useMemo, useState } from "react"
import CourseCompletionDialog from "@/components/course-completion-dialog"
import { UserNavbar } from "@/components/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { publicCoursesApi, studentCoursesApi } from "@/lib/api"
import { AdminLessonContentType, CourseEnrollmentSummary, CourseProgressSummary, PublicCourseDetail, PublicCourseSummary } from "@/lib/types"

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [hasShownCompletionDialog, setHasShownCompletionDialog] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [course, setCourse] = useState<PublicCourseDetail | null>(null)
  const [relatedCourses, setRelatedCourses] = useState<PublicCourseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [enrollment, setEnrollment] = useState<CourseEnrollmentSummary | null>(null)
  const [isEnrollmentActionPending, setIsEnrollmentActionPending] = useState(false)
  const [progressSummary, setProgressSummary] = useState<CourseProgressSummary | null>(null)
  const [isProgressLoading, setIsProgressLoading] = useState(false)
  const courseId = params.id

  const loadCourse = useCallback(async () => {
    setFetchError(null)
    setIsLoading(true)
    try {
      const [detail, summaries] = await Promise.all([
        publicCoursesApi.detail(courseId),
        publicCoursesApi.list(),
      ])
      setCourse(detail)
      const related = summaries
        .filter(
          (summary) =>
            summary.id !== courseId &&
            summary.level === detail.level &&
            summary.isPublished,
        )
        .slice(0, 2)
      setRelatedCourses(related)
    } catch (error) {
      console.error("Failed to load course details", error)
      setFetchError("Unable to load this course right now.")
      toast.error("Unable to load this course right now.")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

useEffect(() => {
  loadCourse()
}, [loadCourse])

useEffect(() => {
  setHasShownCompletionDialog(false)
  setShowCompletionDialog(false)
}, [courseId])

useEffect(() => {
    if (!user) {
      setEnrollment(null)
      return
    }

    let cancelled = false
    const fetchEnrollment = async () => {
      try {
        const data = await studentCoursesApi.get(courseId)
        if (!cancelled) {
          setEnrollment(data)
        }
      } catch (error) {
        console.error("Failed to load enrollment", error)
        if (!cancelled) {
          setEnrollment(null)
        }
      }
    }

    fetchEnrollment()
    return () => {
      cancelled = true
    }
  }, [user, courseId])

  useEffect(() => {
    if (!user || !enrollment || enrollment.status === "dropped") {
      setProgressSummary(null)
      return
    }

    let cancelled = false
    const fetchProgress = async () => {
      setIsProgressLoading(true)
      try {
        const data = await studentCoursesApi.getProgress(courseId)
        if (!cancelled) {
          setProgressSummary(data)
        }
      } catch (error) {
        console.error("Failed to load progress", error)
        if (!cancelled) {
          toast.error("Unable to load your progress right now.")
        }
      } finally {
        if (!cancelled) {
          setIsProgressLoading(false)
        }
      }
    }

    void fetchProgress()
    return () => {
      cancelled = true
    }
  }, [user, enrollment, courseId])

  const sections = useMemo(() => course?.sections ?? [], [course])
  const lessons = useMemo(
    () => sections.flatMap((section) => section.lessons ?? []),
    [sections],
  )

  const sectionProgressMap = useMemo(() => {
    const map = new Map<string, CourseProgressSummary["sections"][number]>()
    progressSummary?.sections.forEach((section) => map.set(section.id, section))
    return map
  }, [progressSummary])

  const lessonProgressMap = progressSummary?.lessons ?? {}

  const levelBadgeVariant = "secondary"

  const isEnrolled = Boolean(enrollment && enrollment.status !== "dropped")
  const enrollmentProgress = enrollment?.progressPercent ?? 0
  const overallProgress =
    progressSummary?.percentComplete ?? enrollmentProgress

  useEffect(() => {
    if (isEnrolled && overallProgress >= 100 && !hasShownCompletionDialog) {
      setShowCompletionDialog(true)
      setHasShownCompletionDialog(true)
    }
  }, [isEnrolled, overallProgress, hasShownCompletionDialog])

  const handleEnroll = async () => {
    if (!user) {
      toast.error("Please sign in to enroll in courses")
      return
    }

    setIsEnrollmentActionPending(true)
    try {
      const nextEnrollment = await studentCoursesApi.enroll(courseId)
      setEnrollment(nextEnrollment)
      const progress = await studentCoursesApi.getProgress(courseId)
      setProgressSummary(progress)
      toast.success("You're enrolled! Start learning now.")
    } catch (error) {
      console.error("Failed to enroll", error)
      toast.error("Unable to enroll right now. Please try again.")
    } finally {
      setIsEnrollmentActionPending(false)
    }
  }

  const getLessonIcon = (type: AdminLessonContentType) => {
    return type === "video" ? Video : FileText
  }

  const getLessonStatus = (lessonId: string) => {
    if (!isEnrolled) return "locked"
    return lessonProgressMap[lessonId]?.status ?? "not_started"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex flex-col">
        <UserNavbar />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-md w-full border border-border/60 bg-card/90">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="mx-auto h-10 w-10 text-emerald-600 animate-spin" />
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Loading course</h2>
                <p className="text-sm text-muted-foreground">
                  Fetching the latest curriculum details...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex flex-col">
        <UserNavbar />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-lg w-full border border-border/60 bg-card/90">
            <CardContent className="p-8 text-center space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Course unavailable</h1>
                <p className="text-muted-foreground">
                  {fetchError ?? "We couldn&apos;t find the requested course."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={loadCourse} className="bg-emerald-600 hover:bg-emerald-700">
                  Try Again
                </Button>
                <Link href="/courses">
                  <Button variant="outline">Back to Courses</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <UserNavbar />

      {/* Breadcrumb Section */}
      <div className="border-b border-border/60 bg-background/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href="/courses" className="hover:text-foreground">Courses</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground truncate max-w-[200px] sm:max-w-none">{course.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                <Badge variant={levelBadgeVariant}>
                  {(course.level ?? "COURSE").toUpperCase()}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
                  {sections.length === 1 ? "Single section" : `${sections.length} sections`}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">{course.title}</h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">{course.description}</p>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-sm text-muted-foreground mb-4 sm:mb-6">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{formatDuration(course.durationMinutes)}</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{lessons.length} lessons</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{sections.length} sections</span>
                </div>
              </div>

              {isEnrolled && (
                <div className="mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>{isProgressLoading ? "Loading progress..." : "Course Progress"}</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2 sm:h-3" />
                </div>
              )}
            </div>

            {/* Course Curriculum - Sections View */}
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Course Curriculum</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sections.length} sections • {lessons.length} lessons • {formatDuration(course.durationMinutes)}
                  </p>
                </CardHeader>
                <CardContent>
                  {sections.length > 0 ? (
                    <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-3">
                      {sections.map((section, sectionIndex) => {
                        const sectionLessons = section.lessons ?? []
                        const sectionDuration = sectionLessons.reduce(
                          (sum, lesson) => sum + lesson.durationMinutes,
                          0,
                        )
                        const sectionProgress = sectionProgressMap.get(section.id)
                        const sectionCompleted = sectionProgress?.completedLessons ?? 0
                        const sectionTotal = sectionProgress?.totalLessons ?? sectionLessons.length
                        const sectionPercent =
                          sectionTotal === 0
                            ? 0
                            : Math.round((sectionCompleted / sectionTotal) * 100)

                        return (
                          <AccordionItem 
                            key={section.id} 
                            value={section.id}
                            className="border border-border/60 rounded-lg overflow-hidden"
                          >
                            <AccordionTrigger className="px-3 sm:px-4 py-3 sm:py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                              <div className="flex items-start gap-2 sm:gap-3 w-full text-left">
                                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                  <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    {sectionIndex + 1}
                                  </span>
                                </div>
                                
                                <div className="flex-1 min-w-0 pr-2">
                                  <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                                    {section.title}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center">
                                      <BookOpen className="h-3 w-3 mr-1" />
                                      {sectionLessons.length} lessons
                                    </span>
                                    <span className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatDuration(sectionDuration)}
                                    </span>
                                    {isEnrolled && (
                                      <span className="flex items-center text-emerald-600 font-medium">
                                        {sectionCompleted}/{sectionTotal} complete
                                      </span>
                                    )}
                                  </div>
                                  {isEnrolled && sectionTotal > 0 && (
                                    <div className="mt-2">
                                      <Progress value={sectionPercent} className="h-1.5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            
                            <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                              <div className="space-y-2 pt-2">
                                {sectionLessons.map((lesson, lessonIndex) => {
                                  const status = getLessonStatus(lesson.id)
                                  const isLocked = status === "locked"
                                  const isCompleted = status === "completed"
                                  const isCurrent = status === "in_progress"
                                  const LessonIcon = getLessonIcon(lesson.contentType)
                                  
                                  return (
                                    <div
                                      key={lesson.id}
                                      className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-colors ${
                                        isLocked
                                          ? "bg-background border-border/40"
                                          : isCompleted
                                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30"
                                            : "bg-background border-border/40 hover:bg-muted/30"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                        <div className="flex-shrink-0">
                                          {isLocked ? (
                                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                                          ) : isCompleted ? (
                                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                                          ) : isCurrent ? (
                                            <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                                              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-background" />
                                            </div>
                                          ) : (
                                            <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border border-border flex items-center justify-center">
                                              <div className="h-1 w-1 rounded-full bg-border" />
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                          <span className="text-xs text-muted-foreground flex-shrink-0">
                                            {sectionIndex + 1}.{lessonIndex + 1}
                                          </span>
                                          <LessonIcon className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${
                                            lesson.contentType === "video" ? "text-blue-600" : "text-muted-foreground"
                                          }`} />
                                          <span className={`font-medium text-xs sm:text-sm truncate ${
                                            isCompleted
                                              ? "text-emerald-700 dark:text-emerald-300"
                                              : isLocked
                                                ? ""
                                                : "text-foreground"
                                          }`}>
                                            {lesson.title}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                                        <span className="hidden sm:block text-xs sm:text-sm text-muted-foreground">
                                          {formatDuration(lesson.durationMinutes)}
                                        </span>
                                        {isLocked ? (
                                          <Button size="sm" variant="outline" className="text-xs px-2 sm:px-3" disabled>
                                            Locked
                                          </Button>
                                        ) : (
                                          <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                                            <Button 
                                              size="sm" 
                                              className="text-xs px-2 sm:px-3"
                                            >
                                              <span className="hidden sm:inline">
                                                {isCompleted ? "Review" : "Open Lesson"}
                                              </span>
                                              <Play className="h-3 w-3 sm:ml-1.5" />
                                            </Button>
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  ) : (
                    <div className="p-8 text-center">
                      <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <h3 className="mb-2 text-lg font-medium text-foreground">Course Content Coming Soon</h3>
                      <p className="text-muted-foreground">The curriculum for this course is being prepared.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Course Actions */}
              <Card>
                <CardContent className="p-6">
                  {isEnrolled ? (
                    <div className="space-y-4">
                      {lessons && lessons.length > 0 ? (
                        <Link href={`/courses/${course.id}/lessons/${lessons[0].id}`}>
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                            {overallProgress > 0 ? "Continue Learning" : "Start Course"}
                            <Play className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full" size="lg">
                          Course Content Coming Soon
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        onClick={handleEnroll}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        size="lg"
                        disabled={isEnrollmentActionPending}
                      >
                        {isEnrollmentActionPending ? "Enrolling..." : "Enroll Now"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Course Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">This course includes:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-blue-600" />
                    <span className="text-sm">{formatDuration(course.durationMinutes)} of content</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Lifetime access</span>
                  </div>
                </CardContent>
              </Card>

              {/* Related Courses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Courses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Similar courses will appear here as soon as they&apos;re published.</p>
                  ) : (
                    relatedCourses.map((relatedCourse) => (
                      <Link key={relatedCourse.id} href={`/courses/${relatedCourse.id}`}>
                        <div className="flex space-x-3 hover:bg-muted/40 dark:hover:bg-muted/30 p-2 rounded-lg transition-colors">
                          <Image
                            src={relatedCourse.mediaUrl || "/placeholder.svg"}
                            alt={relatedCourse.title}
                            width={80}
                            height={60}
                            className="h-15 w-20 rounded object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2">{relatedCourse.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {relatedCourse.level} • {formatDuration(relatedCourse.durationMinutes)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Completion Dialog */}
      <CourseCompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        courseTitle={course.title}
      />

    </div>
  )
}
