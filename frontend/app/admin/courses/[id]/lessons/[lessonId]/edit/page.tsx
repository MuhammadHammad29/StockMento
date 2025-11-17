"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import QuizBuilder, {
  QuizFormState,
  createEmptyQuizForm,
  quizFormFromAdminQuiz,
  quizFormToPayload,
  validateQuizForm,
} from "@/components/admin/quiz-builder"
import { AdminNavbar } from "@/components/navigation"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { courseApi, lessonApi } from "@/lib/api"
import type { AdminCourse, AdminCourseSection } from "@/lib/types"
import { toast } from "sonner"

type LessonType = "text" | "video" | "quiz" | "lab"

interface LessonFormState {
  title: string
  contentType: LessonType
  durationMinutes: number
  bodyHtml: string
  videoUrl: string
  thumbnailUrl: string
}

const emptyState: LessonFormState = {
  title: "",
  contentType: "text",
  durationMinutes: 10,
  bodyHtml: "",
  videoUrl: "",
  thumbnailUrl: "",
}

export default function EditLessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const { adminUser } = useAdminAuth()
  void adminUser

  const router = useRouter()
  const courseId = params.id
  const lessonId = params.lessonId

  const [course, setCourse] = useState<AdminCourse | null>(null)
  const [section, setSection] = useState<AdminCourseSection | null>(null)
  const [formData, setFormData] = useState<LessonFormState>(emptyState)
  const [quizForm, setQuizForm] = useState<QuizFormState>(createEmptyQuizForm())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLesson = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const courseResponse = await courseApi.getCourse(courseId)
      setCourse(courseResponse)

      const sectionMatch = courseResponse.sections?.find((sec) =>
        sec.lessons?.some((link) => link.lessonId === lessonId),
      )
      const lessonLink = sectionMatch?.lessons?.find((link) => link.lessonId === lessonId)

      if (!sectionMatch || !lessonLink) {
        throw new Error("Lesson not found in this course.")
      }

      setSection(sectionMatch)
      setFormData({
        title: lessonLink.lesson.title,
        contentType: lessonLink.lesson.contentType as LessonType,
        durationMinutes: lessonLink.lesson.durationMinutes,
        bodyHtml: lessonLink.lesson.text?.bodyHtml ?? "",
        videoUrl: lessonLink.lesson.video?.videoUrl ?? "",
        thumbnailUrl: lessonLink.lesson.video?.thumbnailUrl ?? "",
      })
      if (lessonLink.lesson.contentType === "quiz") {
        setQuizForm(quizFormFromAdminQuiz(lessonLink.lesson.quizLink?.quiz))
      } else {
        setQuizForm(createEmptyQuizForm())
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load lesson."
      setError(message)
      toast.error("Unable to load lesson", {
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => {
    void loadLesson()
  }, [loadLesson])

  const updateField = <K extends keyof LessonFormState>(field: K, value: LessonFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const sectionTitle = useMemo(() => section?.title ?? "Unknown section", [section])

  const handleSave = async () => {
    if (!section) {
      toast.error("Missing section", { description: "Lesson section missing." })
      return
    }
    if (!formData.title.trim()) {
      toast.error("Missing title", { description: "Lesson title is required." })
      return
    }

    if (formData.contentType === "text" && !formData.bodyHtml.trim()) {
      toast.error("Add lesson content", {
        description: "Text lessons must include lesson content.",
      })
      return
    }

    if (formData.contentType === "quiz") {
      const validationError = validateQuizForm(quizForm)
      if (validationError) {
        toast.error(validationError)
        return
      }
    }

    setIsSaving(true)
    try {
      const payload = {
        title: formData.title.trim(),
        contentType: formData.contentType,
        durationMinutes: formData.durationMinutes,
        bodyHtml: formData.contentType === "text" ? formData.bodyHtml : undefined,
        readTimeMinutes: formData.contentType === "text" ? formData.durationMinutes : undefined,
        videoUrl: formData.contentType === "video" ? formData.videoUrl.trim() : undefined,
        thumbnailUrl: formData.contentType === "video" ? formData.thumbnailUrl.trim() : undefined,
      }
      if (formData.contentType === "quiz") {
        payload.quiz = quizFormToPayload(quizForm)
      }
      await lessonApi.updateLesson(courseId, section.id, lessonId, payload)
      toast.success("Lesson updated", {
        description: `"${formData.title}" saved.`,
      })
      router.push(`/admin/courses/${courseId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update lesson."
      toast.error("Unable to update lesson", {
        description: message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <AdminNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading lesson...</div>
      </div>
    )
  }

  if (error || !course || !section) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CardTitle className="text-xl">Lesson unavailable</CardTitle>
            <CardDescription>{error ?? "Lesson not found for this course."}</CardDescription>
            <Link href={`/admin/courses/${courseId}`}>
              <Button>Back to course</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <AdminNavbar />

      <div className="border-b border-border/60 bg-background/80">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
              <Link href={`/admin/courses/${courseId}`} className="hover:text-foreground">
                Course
              </Link>
              <span className="mx-1 sm:mx-2">/</span>
              <Link href={`/admin/courses/${courseId}#section-${section.id}`} className="hover:text-foreground">
                {sectionTitle}
              </Link>
              <span className="mx-1 sm:mx-2">/</span>
              <span className="text-foreground">Edit Lesson</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Edit Lesson</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update the content for <strong className="font-semibold">{sectionTitle}</strong>.
          </p>
        </div>

        <Card className="border border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>Lesson Content</CardTitle>
            <CardDescription>Adjust the lesson metadata and content. Use the course page to move lessons between sections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Lesson Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Content Type *</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(value: LessonType) => updateField("contentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Lesson</SelectItem>
                    <SelectItem value="video">Video Lesson</SelectItem>
                    <SelectItem value="quiz">Quiz Placeholder</SelectItem>
                    <SelectItem value="lab">Lab Placeholder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={formData.durationMinutes}
                  onChange={(event) => updateField("durationMinutes", Number(event.target.value) || 0)}
                />
              </div>
            </div>

            {formData.contentType === "text" && (
              <div className="space-y-2">
                <Label htmlFor="body">Lesson Content</Label>
                <Textarea
                  id="body"
                  rows={6}
                  value={formData.bodyHtml}
                  onChange={(event) => updateField("bodyHtml", event.target.value)}
                  placeholder="Add lesson content..."
                />
              </div>
            )}

            {formData.contentType === "video" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <Input
                    id="videoUrl"
                    value={formData.videoUrl}
                    onChange={(event) => updateField("videoUrl", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(event) => updateField("thumbnailUrl", event.target.value)}
                  />
                </div>
              </div>
            )}

            {formData.contentType === "quiz" && (
              <div className="space-y-2">
                <Label>Quiz Details</Label>
                <QuizBuilder value={quizForm} onChange={setQuizForm} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
          <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Lesson"}
          </Button>
        </div>
      </div>
    </div>
  )
}
