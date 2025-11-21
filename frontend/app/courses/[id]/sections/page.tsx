"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Lock, 
  FileText, 
  Video, 
  Play,
  GraduationCap,
  Loader2,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { formatDuration } from "@/lib/data-utils"
import { UserNavbar } from "@/components/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { publicCoursesApi, studentCoursesApi } from "@/lib/api"
import { AdminLessonContentType, CourseEnrollmentSummary, CourseProgressSummary, PublicCourseDetail } from "@/lib/types"
import { toast } from "sonner"

export default function CourseSectionsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const courseId = params.id
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [course, setCourse] = useState<PublicCourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [enrollment, setEnrollment] = useState<CourseEnrollmentSummary | null>(null)
  const [isEnrollmentActionPending, setIsEnrollmentActionPending] = useState(false)
  const [progressSummary, setProgressSummary] = useState<CourseProgressSummary | null>(null)
  const [isProgressLoading, setIsProgressLoading] = useState(false)

  const loadCourse = useCallback(async () => {
    setFetchError(null)
    setIsLoading(true)
    try {
      const detail = await publicCoursesApi.detail(courseId)
      setCourse(detail)
    } catch (error) {
      console.error("Failed to load course sections", error)
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
  const sectionProgressMap = useMemo(() => {
    const map = new Map<string, CourseProgressSummary["sections"][number]>()
    progressSummary?.sections.forEach((section) => map.set(section.id, section))
    return map
  }, [progressSummary])
  const lessonProgressMap = progressSummary?.lessons ?? {}
  const estimatedLearners = course ? Math.max(course.totalLessons * 35, 40) : 0
  const ratingValue = 4.8
  const ratingCount = Math.max(Math.floor(estimatedLearners * 0.65), 12)

  const isEnrolled = Boolean(enrollment && enrollment.status !== "dropped")
  const enrollmentProgress = enrollment?.progressPercent ?? 0
  const overallProgress =
    progressSummary?.percentComplete ?? enrollmentProgress

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
    return type === "video" ? Video : type === "quiz" ? GraduationCap : FileText
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
                <h2 className="text-xl font-semibold text-foreground mb-1">Loading sections</h2>
                <p className="text-sm text-muted-foreground">Fetching the latest curriculum structure...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <UserNavbar />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-lg w-full border border-border/60 bg-card/90">
            <CardContent className="p-8 text-center space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Course unavailable</h1>
                <p className="text-muted-foreground">{fetchError ?? "We couldn't find this course."}</p>
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
            <Link href={`/courses/${courseId}`} className="hover:text-foreground truncate max-w-[150px] sm:max-w-none">
              {course.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Sections</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Course Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
            <Badge
              variant={
                course.level === "beginner"
                  ? "default"
                  : course.level === "intermediate"
                    ? "secondary"
                    : "destructive"
              }
            >
              {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
              {sections.length === 1 ? "Single section" : `${sections.length} sections`}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {course.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">
            {course.description}
          </p>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-sm text-muted-foreground mb-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{formatDuration(course.durationMinutes)}</span>
            </div>
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{sections.length} sections</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{estimatedLearners.toLocaleString()} students</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1.5 flex-shrink-0 text-yellow-400" />
              <span>{ratingValue.toFixed(1)} rating ({ratingCount.toLocaleString()} reviews)</span>
            </div>
          </div>

          {isEnrolled && (
            <div className="bg-background/80 border border-border/60 rounded-lg p-4 sm:p-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  {isProgressLoading ? "Loading progress..." : "Your Progress"}
                </span>
                <span className="text-sm font-bold text-emerald-600">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
          )}
        </div>

        {/* Sections Accordion */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Course Curriculum</h2>
            {!isEnrolled && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleEnroll}
                disabled={isEnrollmentActionPending}
              >
                {isEnrollmentActionPending ? "Enrolling..." : "Enroll to Access"}
              </Button>
            )}
          </div>

          {sections.length > 0 ? (
            <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-4">
              {sections.map((section, sectionIndex) => {
                const sectionLessons = section.lessons ?? []
                const sectionDuration = sectionLessons.reduce(
                  (sum, lesson) => sum + lesson.durationMinutes,
                  0,
                )
                const sectionProgress = sectionProgressMap.get(section.id)
                const sectionCompletedLessons = sectionProgress?.completedLessons ?? 0
                const sectionTotalLessons = sectionProgress?.totalLessons ?? sectionLessons.length
                const sectionCompletionPercent =
                  sectionProgress && sectionTotalLessons > 0
                    ? Math.round((sectionCompletedLessons / sectionTotalLessons) * 100)
                    : null
                const showSectionProgress = Boolean(isEnrolled && sectionCompletionPercent !== null)

                return (
                  <AccordionItem 
                    key={section.id} 
                    value={section.id}
                    className="border border-border/60 rounded-lg overflow-hidden bg-background/80"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3 sm:gap-4 w-full text-left">
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300">
                            {sectionIndex + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 pr-4">
                            {section.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {sectionLessons.length} lessons
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {formatDuration(sectionDuration)}
                            </span>
                            {showSectionProgress && (
                              <span className="flex items-center">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-emerald-600" />
                                {sectionCompletedLessons}/{sectionTotalLessons} completed
                              </span>
                            )}
                          </div>
                          {showSectionProgress && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                                <span>Section progress</span>
                                <span>{sectionCompletionPercent}%</span>
                              </div>
                              <Progress value={sectionCompletionPercent ?? 0} className="h-1.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 sm:px-6 pb-4">
                      <div className="space-y-2 pt-2">
                        {sectionLessons.map((lesson, lessonIndex) => {
                          const status = getLessonStatus(lesson.id)
                          const isLocked = status === "locked"
                          const isCompleted = status === "completed"
                          const isInProgress = status === "in_progress"
                          const isCurrent = isInProgress
                          const statusLabel = isLocked
                            ? "Locked"
                            : isCompleted
                              ? "Completed"
                              : isInProgress
                                ? "In progress"
                                : "Not started"
                          const LessonIcon = getLessonIcon(lesson.contentType)
                          const rowTone = isLocked
                            ? "bg-background border-border/40"
                            : isCompleted
                              ? "bg-emerald-100/60 border-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-500/40"
                              : isInProgress
                                ? "bg-blue-50 border-blue-200 dark:bg-blue-500/20 dark:border-blue-500/40"
                                : "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30"

                          return (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${rowTone}`}
                            >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex-shrink-0">
                                {isLocked ? (
                                  <Lock className="h-5 w-5 text-muted-foreground" />
                                ) : isCompleted ? (
                                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                                ) : isInProgress ? (
                                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/60 flex items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/70" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                                    {sectionIndex + 1}.{lessonIndex + 1}
                                  </span>
                                  <LessonIcon className={`h-4 w-4 flex-shrink-0 ${
                                    lesson.contentType === "video" 
                                      ? "text-blue-600" 
                                      : lesson.contentType === "quiz"
                                      ? "text-purple-600"
                                      : "text-muted-foreground"
                                  }`} />
                                  <span className={`font-medium text-sm sm:text-base truncate ${
                                    !isLocked ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                                  }`}>
                                    {lesson.title}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                {isEnrolled && (
                                  <Badge
                                    variant={isCompleted ? "default" : isInProgress ? "secondary" : "outline"}
                                    className="text-[10px] sm:text-xs"
                                  >
                                    {statusLabel}
                                  </Badge>
                                )}
                                <span className="hidden sm:block text-sm text-muted-foreground">
                                  {formatDuration(lesson.durationMinutes)}
                                </span>
                                {isLocked ? (
                                  <Button size="sm" variant="outline" className="text-xs sm:text-sm" disabled>
                                    Locked
                                  </Button>
                                ) : (
                                  <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                                    <Button size="sm" className="text-xs sm:text-sm cursor-pointer">
                                      <span className="hidden sm:inline">
                                        {isCompleted ? "Review" : isCurrent ? "Continue" : "Open Lesson"}
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
            <Card className="p-8 sm:p-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg sm:text-xl font-medium text-foreground">
                No Sections Available
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                The curriculum for this course is being prepared.
              </p>
            </Card>
          )}
        </div>

        {/* Back to Course Button */}
        <div className="mt-8 flex justify-center">
          <Link href={`/courses/${courseId}`}>
            <Button variant="outline" size="lg" className="cursor-pointer">
              Back to Course Overview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
