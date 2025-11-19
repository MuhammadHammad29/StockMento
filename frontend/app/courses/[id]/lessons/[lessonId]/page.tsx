"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Video,
  FileText,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Layers,
  ListOrdered,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { formatDuration } from "@/lib/data-utils"
import { UserNavbar } from "@/components/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { publicCoursesApi, studentCoursesApi } from "@/lib/api"
import {
  AdminLessonContentType,
  AdminQuizQuestionType,
  CourseEnrollmentSummary,
  CourseProgressSummary,
  LessonProgressState,
  PublicCourseDetail,
  PublicLessonDetail,
} from "@/lib/types"
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

type QuizSelections = Record<string, string[]>

type QuizEvaluation = {
  score: number
  totalPoints: number
  percentage: number
  passed: boolean
  perQuestion: Record<string, boolean>
}

const LESSON_STATUS_COPY: Record<LessonProgressState, { label: string; description: string }> = {
  not_started: {
    label: "Not started",
    description: "Begin this lesson to start tracking your learning progress.",
  },
  in_progress: {
    label: "In progress",
    description: "Keep going—mark it as completed once you finish the material.",
  },
  completed: {
    label: "Completed",
    description: "Great job! You can revisit this lesson at any time.",
  },
}

const stripHtmlToSummary = (value?: string | null, length = 160) => {
  if (!value) return null
  const plain = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!plain) return null
  return plain.length > length ? `${plain.slice(0, length)}…` : plain
}

const normalizeLessonBody = (value?: string | null) => {
  if (!value) return ""
  return value.includes("<") ? value : value.replace(/\n/g, "<br />")
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
  const [progressSummary, setProgressSummary] = useState<CourseProgressSummary | null>(null)
  const [isProgressLoading, setIsProgressLoading] = useState(false)
  const [isProgressMutationPending, setIsProgressMutationPending] = useState(false)
  const [quizSelections, setQuizSelections] = useState<QuizSelections>({})
  const [quizSubmitting, setQuizSubmitting] = useState(false)
  const [quizResult, setQuizResult] = useState<QuizEvaluation | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)

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
    setQuizSelections({})
    setQuizResult(null)
    setQuizError(null)
  }, [lessonId])

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

  const lessonTitle = lessonDetail?.title ?? lesson?.title ?? "Lesson"
  const lessonBodyHtml = lessonDetail?.text?.bodyHtml
  const lessonDescriptionText =
    lessonDetail?.description ??
    stripHtmlToSummary(lessonBodyHtml) ??
    lesson?.description ??
    "Additional lesson details will be visible here soon."
  const lessonDurationMinutes =
    lessonDetail?.durationMinutes ?? lesson?.durationMinutes ?? 0
  const lessonContentType = lessonDetail?.contentType ?? lesson?.contentType ?? "text"
  const normalizedLessonBody = useMemo(
    () => normalizeLessonBody(lessonBodyHtml),
    [lessonBodyHtml],
  )

  const isEnrolled = Boolean(enrollment && enrollment.status !== "dropped")

  useEffect(() => {
    if (!user || !isEnrolled) {
      setProgressSummary(null)
      return
    }

    let cancelled = false
    const fetchProgress = async () => {
      setIsProgressLoading(true)
      try {
        const summary = await studentCoursesApi.getProgress(courseId)
        if (!cancelled) {
          setProgressSummary(summary)
        }
      } catch (error) {
        console.error("Failed to load lesson progress", error)
        if (!cancelled) {
          toast.error("Unable to load your lesson progress right now.")
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
  }, [user, isEnrolled, courseId])

  const lessonProgressMap = progressSummary?.lessons ?? {}
  const currentLessonProgress = lessonProgressMap[lessonId]
  const currentLessonStatus: LessonProgressState =
    currentLessonProgress?.status ?? "not_started"
  const lessonStatusMeta = LESSON_STATUS_COPY[currentLessonStatus]
  const overallProgress = progressSummary?.percentComplete ?? enrollment?.progressPercent ?? 0
  const isQuizLesson = lessonContentType === "quiz"
  const quizPassingScore = lessonDetail?.quiz?.passScore ?? null

  const normalizeChoiceIds = (values: string[]) => [...values].sort()

  const areArraysEqual = (first: string[], second: string[]) =>
    first.length === second.length && first.every((value, index) => value === second[index])

  const questionTypeLabel = (type: AdminQuizQuestionType) => {
    switch (type) {
      case "multiple":
        return "Multiple select"
      case "true_false":
        return "True / False"
      default:
        return "Single choice"
    }
  }

  const handleLessonProgressUpdate = useCallback(
    async (nextStatus: LessonProgressState, options: { silent?: boolean } = {}) => {
      if (!user || !isEnrolled) {
        if (!options.silent) {
          toast.error("Please sign in to track your progress.")
        }
        return
      }

      setIsProgressMutationPending(true)
      try {
        const summary = await studentCoursesApi.updateLessonProgress(courseId, lessonId, {
          status: nextStatus,
        })
        setProgressSummary(summary)
        try {
          const refreshedEnrollment = await studentCoursesApi.get(courseId)
          setEnrollment(refreshedEnrollment)
        } catch (refreshError) {
          console.error("Failed to refresh enrollment after progress update", refreshError)
        }
        if (!options.silent) {
          toast.success(
            nextStatus === "completed"
              ? "Lesson marked as completed."
              : "Lesson progress updated.",
          )
        }
      } catch (error) {
        console.error("Failed to update lesson progress", error)
        if (!options.silent) {
          toast.error("Unable to update lesson progress right now.")
        }
      } finally {
        setIsProgressMutationPending(false)
      }
    },
    [courseId, lessonId, isEnrolled, user],
  )

  const handleQuizChoiceSelect = useCallback(
    (questionId: string, choiceId: string, type: AdminQuizQuestionType) => {
      setQuizSelections((prev) => {
        const current = new Set(prev[questionId] ?? [])
        if (type === "multiple") {
          if (current.has(choiceId)) {
            current.delete(choiceId)
          } else {
            current.add(choiceId)
          }
        } else {
          current.clear()
          current.add(choiceId)
        }

        return {
          ...prev,
          [questionId]: Array.from(current),
        }
      })
      setQuizResult(null)
      setQuizError(null)
    },
    [],
  )

  const handleQuizSubmit = useCallback(async () => {
    if (!lessonDetail?.quiz) {
      return
    }

    const { questions, passScore } = lessonDetail.quiz
    if (questions.length === 0) {
      setQuizError("This quiz has no questions configured yet.")
      return
    }

    if (
      questions.some((question) => {
        const selected = quizSelections[question.id] ?? []
        return selected.length === 0
      })
    ) {
      setQuizError("Please answer every question before submitting.")
      return
    }

    setQuizError(null)
    setQuizSubmitting(true)
    try {
      let score = 0
      let totalPoints = 0
      const perQuestion: Record<string, boolean> = {}

      questions.forEach((question) => {
        const selected = normalizeChoiceIds(quizSelections[question.id] ?? [])
        const correct = normalizeChoiceIds(
          question.choices.filter((choice) => choice.isCorrect).map((choice) => choice.id),
        )
        const isCorrect =
          question.type === "multiple"
            ? selected.length > 0 && areArraysEqual(selected, correct)
            : selected.length === 1 && correct.length === 1 && selected[0] === correct[0]

        perQuestion[question.id] = isCorrect
        totalPoints += question.points
        if (isCorrect) {
          score += question.points
        }
      })

      const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
      const passed = percentage >= passScore
      setQuizResult({
        score,
        totalPoints,
        percentage,
        passed,
        perQuestion,
      })

      if (passed && currentLessonStatus !== "completed") {
        await handleLessonProgressUpdate("completed", { silent: true })
      }

      if (passed) {
        toast.success("Great job! You passed the quiz.")
      } else {
        toast.error(`Score ${percentage}% is below the passing requirement of ${passScore}%.`)
      }
    } catch (error) {
      console.error("Failed to submit quiz responses", error)
      toast.error("Unable to grade the quiz right now.")
    } finally {
      setQuizSubmitting(false)
    }
  }, [currentLessonStatus, handleLessonProgressUpdate, lessonDetail, quizSelections])

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

  useEffect(() => {
    if (!isEnrolled || !progressSummary) {
      return
    }
    if (currentLessonStatus !== "not_started" || isProgressMutationPending) {
      return
    }
    void handleLessonProgressUpdate("in_progress", { silent: true })
  }, [
    currentLessonStatus,
    handleLessonProgressUpdate,
    isEnrolled,
    isProgressMutationPending,
    progressSummary,
  ])

  const getLessonStatus = (entryId: string) => {
    if (!isEnrolled) return "locked"
    if (entryId === lessonId) {
      return currentLessonStatus === "completed" ? "completed" : "current"
    }
    const progress = lessonProgressMap[entryId]?.status
    if (progress === "completed") {
      return "completed"
    }
    if (progress === "in_progress") {
      return "in_progress"
    }
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
                    onEnded={() => {
                      if (currentLessonStatus !== "completed") {
                        void handleLessonProgressUpdate("completed")
                      }
                    }}
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

        const quiz = lessonDetail.quiz
        const totalPoints = quiz.questions.reduce((sum, question) => sum + question.points, 0)
        const allQuestionsAnswered = quiz.questions.every(
          (question) => (quizSelections[question.id]?.length ?? 0) > 0,
        )

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{quiz.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Passing score: {quiz.passScore}% · {quiz.questions.length} questions · {totalPoints} pts
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions.map((question, index) => {
                const selectedIds = new Set(quizSelections[question.id] ?? [])
                const questionResult = quizResult?.perQuestion[question.id]
                const showEvaluation = questionResult !== undefined
                const QuestionResultIcon = showEvaluation
                  ? questionResult
                    ? CheckCircle2
                    : XCircle
                  : null

                return (
                  <div key={question.id} className="space-y-3 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <span className="font-medium text-foreground">Question {index + 1}</span>
                        <span>• {question.points} pts</span>
                        <span>• {questionTypeLabel(question.type)}</span>
                      </div>
                      {QuestionResultIcon && (
                        <span
                          className={`flex items-center gap-1 text-xs uppercase tracking-wide font-semibold ${
                            questionResult ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          <QuestionResultIcon className="h-4 w-4" />
                          {questionResult ? "Correct" : "Incorrect"}
                        </span>
                      )}
                    </div>
                    <div
                      className="prose dark:prose-invert text-foreground"
                      dangerouslySetInnerHTML={{ __html: question.promptHtml }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {question.type === "multiple"
                        ? "Select all choices that apply."
                        : "Select one answer."}
                    </p>
                    <ul className="space-y-2">
                      {question.choices.map((choice) => {
                        const isSelected = selectedIds.has(choice.id)
                        const isCorrectChoice = choice.isCorrect
                        const highlightClass = showEvaluation
                          ? isCorrectChoice
                            ? "border-emerald-500 bg-emerald-500/10"
                            : isSelected
                              ? "border-destructive/60 bg-destructive/10"
                              : "opacity-80"
                          : isSelected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-border/60"

                        return (
                          <li key={choice.id}>
                            <button
                              type="button"
                              onClick={() => handleQuizChoiceSelect(question.id, choice.id, question.type)}
                              disabled={quizSubmitting}
                              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition hover:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${highlightClass}`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] ${
                                    isSelected
                                      ? "border-emerald-600 bg-emerald-600 text-background"
                                      : "border-muted-foreground/40 text-muted-foreground"
                                  }`}
                                >
                                  {isSelected ? (question.type === "multiple" ? "✓" : "•") : ""}
                                </span>
                                <div
                                  className="flex-1"
                                  dangerouslySetInnerHTML={{ __html: choice.choiceHtml }}
                                />
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}

              {quizError && <p className="text-sm text-destructive">{quizError}</p>}

              {quizResult && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    quizResult.passed
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-800"
                      : "border-destructive/60 bg-destructive/10 text-destructive"
                  }`}
                >
                  <p className="font-semibold">
                    Score: {quizResult.score}/{quizResult.totalPoints} pts ({quizResult.percentage}%)
                  </p>
                  <p>
                    {quizResult.passed
                      ? "Passing score achieved. This lesson is now marked as completed."
                      : `You need at least ${quiz.passScore}% to pass. Review your answers and try again.`}
                  </p>
                </div>
              )}

              {!allQuestionsAnswered && (
                <p className="text-xs text-muted-foreground">
                  Answer every question to enable the submission button.
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {quizResult
                    ? "You can retake the quiz to improve your score."
                    : "Only a passing score will complete this lesson."}
                </p>
                <Button
                  onClick={handleQuizSubmit}
                  disabled={quizSubmitting || !allQuestionsAnswered}
                  className="sm:w-auto"
                >
                  {quizSubmitting ? "Grading..." : quizResult ? "Retry quiz" : "Submit quiz"}
                </Button>
              </div>
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
            <CardContent>
              <div
                className="prose dark:prose-invert max-w-none whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: normalizedLessonBody }}
              />
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
                    <Layers className="h-4 w-4" />
                    <span>
                      {sections.length} {sections.length === 1 ? "section" : "sections"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4" />
                    <span>
                      {courseLessons.length} {courseLessons.length === 1 ? "lesson" : "lessons"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {renderLessonContent()}

            {isEnrolled && (
              <Card className="border border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <CardContent className="p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Lesson status</p>
                    <p className="text-lg font-semibold text-foreground">{lessonStatusMeta.label}</p>
                    <p className="text-sm text-muted-foreground">{lessonStatusMeta.description}</p>
                    {isProgressLoading && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Refreshing progress...
                      </p>
                    )}
                  </div>
                  {isQuizLesson ? (
                    <p className="text-sm text-muted-foreground w-full sm:w-auto">
                      Complete the quiz with a score of at least {quizPassingScore ?? 0}% to finish this lesson.
                      Your status updates automatically after you pass.
                    </p>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {currentLessonStatus === "not_started" && (
                        <Button
                          variant="outline"
                          disabled={isProgressMutationPending}
                          onClick={() => handleLessonProgressUpdate("in_progress")}
                        >
                          {isProgressMutationPending ? "Updating..." : "Start lesson"}
                        </Button>
                      )}
                      {currentLessonStatus === "completed" ? (
                        <Button
                          variant="outline"
                          disabled={isProgressMutationPending}
                          onClick={() => handleLessonProgressUpdate("in_progress")}
                        >
                          {isProgressMutationPending ? "Updating..." : "Mark as in progress"}
                        </Button>
                      ) : (
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={isProgressMutationPending}
                          onClick={() => handleLessonProgressUpdate("completed")}
                        >
                          {isProgressMutationPending ? "Saving..." : "Mark as completed"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                {sections.map((section, sectionIndex) => (
                  <div key={section.id} className="space-y-2">
                    <p className="text-sm font-semibold">{section.title}</p>
                    <div className="space-y-1.5">
                      {(section.lessons ?? []).map((entry, lessonIndex) => {
                        const status = getLessonStatus(entry.id)
                        const LessonIcon = getLessonIcon(entry.contentType)
                        const isLocked = status === "locked"
                        const isCompleted = status === "completed"
                        const isCurrent = status === "current"

                        const rowTone = isCurrent
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                          : isCompleted
                            ? "border-emerald-200"
                            : "border-border/40"

                        const sharedClassName = `flex items-center justify-between rounded-lg border ${rowTone} px-3 py-2 text-sm transition hover:bg-muted/10 ${
                          isLocked ? "cursor-not-allowed" : ""
                        }`

                        const rowInner = (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                <LessonIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={`truncate font-medium ${
                                    isCompleted ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
                                  }`}
                                >
                                  {entry.title}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <ListOrdered className="h-3 w-3" />
                                    {sectionIndex + 1}.{lessonIndex + 1}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(entry.durationMinutes)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isCompleted && (
                              <CheckCircle className="h-4 w-4 text-emerald-600" aria-label="Lesson completed" />
                            )}
                          </>
                        )

                        if (isLocked) {
                          return (
                            <div key={entry.id} className={sharedClassName}>
                              {rowInner}
                            </div>
                          )
                        }

                        return (
                          <Link
                            key={entry.id}
                            href={`/courses/${courseId}/lessons/${entry.id}`}
                            className={sharedClassName}
                          >
                            {rowInner}
                          </Link>
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
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                  <p>Total lessons: {course.totalLessons}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <p>Total sections: {course.sections.length}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p>Duration: {formatDuration(course.durationMinutes)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
