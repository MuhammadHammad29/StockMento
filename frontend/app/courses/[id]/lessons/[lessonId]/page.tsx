"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock, Play, ArrowLeft, ArrowRight, Loader2, Video, FileText, GraduationCap } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { formatDuration } from "@/lib/data-utils"
import { UserNavbar } from "@/components/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { publicCoursesApi, studentCoursesApi } from "@/lib/api"
import { AdminLessonContentType, CourseEnrollmentSummary, PublicCourseDetail, PublicLessonDetail } from "@/lib/types"
import { toast } from "sonner"
import { getYouTubeEmbedUrl, isYouTubeUrl } from "@/lib/youtube-utils"

type LessonOutlineEntry = {
  id: string
  title: string
  contentType: AdminLessonContentType
  durationMinutes: number
  sectionId: string
  sectionTitle: string
  description?: string | null
}

export default function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const { user } = useAuth()
  const courseId = params.id
  const lessonId = params.lessonId

  const [course, setCourse] = useState<PublicCourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [lessonDetail, setLessonDetail] = useState<PublicLessonDetail | null>(null)
  const [isLessonLoading, setIsLessonLoading] = useState(true)
  const [lessonError, setLessonError] = useState<string | null>(null)
  const [enrollment, setEnrollment] = useState<CourseEnrollmentSummary | null>(null)
  const [isEnrollmentActionPending, setIsEnrollmentActionPending] = useState(false)

  const loadCourse = useCallback(async () => {
    setFetchError(null)
    setIsLoading(true)
    try {
      const detail = await publicCoursesApi.detail(courseId)
      setCourse(detail)
    } catch (error) {
      console.error("Failed to load lesson", error)
      setFetchError("Unable to load this lesson right now.")
      toast.error("Unable to load this lesson right now.")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadCourse()
  }, [loadCourse])

  const loadLessonDetail = useCallback(async () => {
    setLessonError(null)
    setIsLessonLoading(true)
    try {
      const detail = await publicCoursesApi.lessonDetail(courseId, lessonId)
      setLessonDetail(detail)
    } catch (error) {
      console.error("Failed to load lesson content", error)
      setLessonError("Unable to load the lesson content right now.")
      toast.error("Unable to load the lesson content right now.")
    } finally {
      setIsLessonLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => {
    loadLessonDetail()
  }, [loadLessonDetail])

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

  const sections = useMemo(() => course?.sections ?? [], [course])
  const courseLessons: LessonOutlineEntry[] = useMemo(
    () =>
      sections.flatMap((section) =>
        (section.lessons ?? []).map((lesson) => ({
          ...lesson,
          sectionId: section.id,
          sectionTitle: section.title,
        })),
      ),
    [sections],
  )

  const lesson = useMemo(
    () => courseLessons.find((entry) => entry.id === lessonId),
    [courseLessons, lessonId],
  )
  const currentSection = useMemo(
    () => sections.find((section) => section.lessons?.some((entry) => entry.id === lessonId)),
    [sections, lessonId],
  )
  const currentIndex = courseLessons.findIndex((entry) => entry.id === lessonId)
  const previousLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < courseLessons.length - 1
      ? courseLessons[currentIndex + 1]
      : null

  const estimatedLearners = course ? Math.max(course.totalLessons * 35, 40) : 0
  const ratingValue = 4.8
  const ratingCount = Math.max(Math.floor(estimatedLearners * 0.65), 12)
  const lessonTitle = lessonDetail?.title ?? lesson?.title ?? "Lesson"
  const lessonDescriptionText =
    lessonDetail?.description ??
    lesson?.description ??
    "Additional lesson details will be visible here soon."
  const lessonDurationMinutes =
    lessonDetail?.durationMinutes ?? lesson?.durationMinutes ?? 0
  const lessonContentType = lessonDetail?.contentType ?? lesson?.contentType ?? "text"

  const isEnrolled = Boolean(enrollment && enrollment.status !== "dropped")
  const overallProgress = enrollment?.progressPercent ?? 0

  const handleEnroll = async () => {
    if (!user) {
      toast.error("Please sign in to enroll in courses")
      return
    }

    setIsEnrollmentActionPending(true)
    try {
      const nextEnrollment = await studentCoursesApi.enroll(courseId)
      setEnrollment(nextEnrollment)
      toast.success("You're enrolled! Start learning now.")
    } catch (error) {
      console.error("Failed to enroll", error)
      toast.error("Unable to enroll right now. Please try again.")
    } finally {
      setIsEnrollmentActionPending(false)
    }
  }

  const getLessonStatus = (entryId: string) => {
    if (!isEnrolled) return "locked"
    if (entryId === lessonId) return "current"
    return "available"
  }

  const getLessonIcon = (type: AdminLessonContentType) => {
    switch (type) {
      case "video":
        return Video
      case "quiz":
        return GraduationCap
      default:
        return FileText
    }
  }

  const renderLessonContent = () => {
    if (!lessonDetail) {
      return null
    }

    if (!isEnrolled) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enroll to continue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>You need to enroll in this course before accessing the lesson content.</p>
            <Button
              onClick={handleEnroll}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isEnrollmentActionPending}
            >
              {isEnrollmentActionPending ? "Enrolling..." : "Enroll Now"}
            </Button>
          </CardContent>
        </Card>
      )
    }

    switch (lessonDetail.contentType) {
      case "video": {
        if (!lessonDetail.video) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video lesson</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Video content has not been uploaded yet.
              </CardContent>
            </Card>
          )
        }

        const embedUrl = isYouTubeUrl(lessonDetail.video.videoUrl)
          ? getYouTubeEmbedUrl(lessonDetail.video.videoUrl)
          : null

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video lesson</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={lessonDetail.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    controls
                    poster={lessonDetail.video.thumbnailUrl ?? undefined}
                    className="w-full h-full object-cover"
                  >
                    <source src={lessonDetail.video.videoUrl} />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
              {lessonDetail.video.transcript && (
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                  {lessonDetail.video.transcript}
                </div>
              )}
            </CardContent>
          </Card>
        )
      }
      case "quiz": {
        if (!lessonDetail.quiz) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quiz lesson</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Quiz content will be available soon.
              </CardContent>
            </Card>
          )
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{lessonDetail.quiz.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Passing score: {lessonDetail.quiz.passScore}%</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {lessonDetail.quiz.questions.map((question, index) => (
                <div key={question.id} className="space-y-3 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Question {index + 1}</span>
                    <span>{question.points} pts</span>
                  </div>
                  <div
                    className="prose dark:prose-invert text-foreground"
                    dangerouslySetInnerHTML={{ __html: question.promptHtml }}
                  />
                  <ul className="space-y-2">
                    {question.choices.map((choice) => (
                      <li
                        key={choice.id}
                        className="rounded-md border border-border/60 px-3 py-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: choice.choiceHtml }}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      }
      case "lab": {
        if (!lessonDetail.lab) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lab lesson</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Lab instructions will be available soon.
              </CardContent>
            </Card>
          )
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{lessonDetail.lab.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <a href={lessonDetail.lab.labUrl} target="_blank" rel="noopener noreferrer">
                  Open Lab Environment
                </a>
              </Button>
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: lessonDetail.lab.instructionsHtml }}
              />
            </CardContent>
          </Card>
        )
      }
      case "text":
      default: {
        if (!lessonDetail.text) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lesson overview</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Lesson content will be available soon.
              </CardContent>
            </Card>
          )
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lesson content</CardTitle>
              <p className="text-sm text-muted-foreground">
                Approximate read time: {lessonDetail.text.readTimeMinutes} minutes
              </p>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: lessonDetail.text.bodyHtml }} />
            </CardContent>
          </Card>
        )
      }
    }
  }

  if (isLoading || isLessonLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex flex-col">
        <UserNavbar />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-md w-full border border-border/60 bg-card/90">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="mx-auto h-10 w-10 text-emerald-600 animate-spin" />
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Loading lesson</h2>
                <p className="text-sm text-muted-foreground">Fetching the current curriculum...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!course || !lessonDetail) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <UserNavbar />
        <div className="flex flex-1 items-center justify-center px-4">
          <Card className="max-w-lg w-full border border-border/60 bg-card/90">
            <CardContent className="p-8 text-center space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Lesson unavailable</h1>
                <p className="text-muted-foreground">
                  {lessonError ?? fetchError ?? "We couldn't find the requested lesson in this course."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={loadCourse} className="bg-emerald-600 hover:bg-emerald-700">
                  Try Again
                </Button>
                <Link href={`/courses/${courseId}`}>
                  <Button variant="outline">Back to Course</Button>
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

      <div className="border-b border-border/60 bg-background/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center text-sm text-muted-foreground gap-2 flex-wrap">
            <Link href="/courses" className="hover:text-foreground">
              Courses
            </Link>
            <span>/</span>
            <Link href={`/courses/${courseId}`} className="hover:text-foreground truncate max-w-[180px] sm:max-w-none">
              {course.title}
            </Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[160px] sm:max-w-none">{lessonTitle}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{lessonContentType.toUpperCase()}</Badge>
                  {currentSection && (
                    <Badge className="bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100">
                      {currentSection.title}
                    </Badge>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-3">{lessonTitle}</h1>
                  <p className="text-muted-foreground text-sm">{lessonDescriptionText}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(lessonDurationMinutes)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{sections.length} sections</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <span>{courseLessons.length} lessons total</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {renderLessonContent()}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                variant="outline"
                disabled={!previousLesson}
                className="flex-1"
              >
                <Link
                  href={
                    previousLesson
                      ? `/courses/${courseId}/lessons/${previousLesson.id}`
                      : `/courses/${courseId}`
                  }
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {previousLesson ? `Previous: ${previousLesson.title}` : "Back to course"}
                </Link>
              </Button>
              <Button
                asChild
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={!nextLesson}
              >
                <Link
                  href={
                    nextLesson
                      ? `/courses/${courseId}/lessons/${nextLesson.id}`
                      : `/courses/${courseId}`
                  }
                >
                  {nextLesson ? `Next: ${nextLesson.title}` : "Back to course"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {isEnrolled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall progress</span>
                    <span className="font-semibold">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course outline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <p className="text-sm font-semibold">{section.title}</p>
                    <div className="space-y-1.5">
                      {(section.lessons ?? []).map((entry) => {
                        const status = getLessonStatus(entry.id)
                        const LessonIcon = getLessonIcon(entry.contentType)
                        return (
                          <div
                            key={entry.id}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                              status === "current"
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-border/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <LessonIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{entry.title}</span>
                            </div>
                            {isEnrolled ? (
                              <Link href={`/courses/${courseId}/lessons/${entry.id}`}>
                                <Button
                                  variant={status === "current" ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs"
                                >
                                  {status === "current" ? "Resume" : "Open"}
                                </Button>
                              </Link>
                            ) : (
                              <Button variant="outline" size="sm" className="text-xs" disabled>
                                Locked
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Total lessons: {course.totalLessons}</p>
                <p>Estimated learners: {estimatedLearners.toLocaleString()}</p>
                <p>
                  Rating: {ratingValue.toFixed(1)} ({ratingCount.toLocaleString()} reviews)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
