"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminNavbar } from "@/components/navigation"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { courseApi, lessonApi } from "@/lib/api"
import type { AdminCourseSection } from "@/lib/types"
import { toast } from "sonner"

type LessonType = "text" | "video" | "quiz" | "lab"

interface LessonFormState {
  title: string
  contentType: LessonType
  sectionId: string
  durationMinutes: number
  bodyHtml: string
  videoUrl: string
  thumbnailUrl: string
}

const initialForm: LessonFormState = {
  title: "",
  contentType: "text",
  sectionId: "",
  durationMinutes: 10,
  bodyHtml: "",
  videoUrl: "",
  thumbnailUrl: "",
}

export default function AdminNewLessonPage({ params }: { params: { id: string } }) {
  const { adminUser } = useAdminAuth()
  void adminUser

  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = params.id

  const [sections, setSections] = useState<AdminCourseSection[]>([])
  const [formData, setFormData] = useState<LessonFormState>(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSections = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const course = await courseApi.getCourse(courseId)
        const courseSections = course.sections ?? []
        setSections(courseSections)
        const preferredSection = searchParams?.get("sectionId")
        const defaultSection = preferredSection && courseSections.some((sec) => sec.id === preferredSection)
          ? preferredSection
          : courseSections[0]?.id ?? ""
        setFormData((prev) => ({ ...prev, sectionId: defaultSection }))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load sections."
        setError(message)
        toast.error("Unable to load sections", {
          description: message,
        })
      } finally {
        setIsLoading(false)
      }
    }
    void loadSections()
  }, [courseId, searchParams])

  const updateField = <K extends keyof LessonFormState>(field: K, value: LessonFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Missing title", {
        description: "Lesson title is required.",
      })
      return
    }

    if (formData.contentType === "video" && !formData.videoUrl.trim()) {
      toast.error("Add video URL", {
        description: "Video lessons must include a video link.",
      })
      return
    }

    if (formData.contentType === "text" && !formData.bodyHtml.trim()) {
      toast.error("Add lesson content", {
        description: "Text lessons must include lesson content.",
      })
      return
    }

    if (!formData.sectionId) {
      toast.error("Select section", {
        description: "Choose a section before creating a lesson.",
      })
      return
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

      await lessonApi.createLesson(courseId, formData.sectionId, payload)
      toast.success("Lesson created", {
        description: `"${formData.title}" added to the course.`,
      })
      router.push(`/admin/courses/${courseId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create lesson."
      toast.error("Unable to create lesson", {
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
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading sections...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CardTitle className="text-xl">Unable to load course</CardTitle>
            <CardDescription>{error}</CardDescription>
            <Button onClick={() => router.refresh()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sections.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <AdminNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <CardTitle className="text-lg">No sections available</CardTitle>
              <CardDescription>
                Create a section for this course before adding lessons. Section management lives in the admin course
                detail page.
              </CardDescription>
              <Link href={`/admin/courses/${courseId}`}>
                <Button>Back to course</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
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
              <span className="text-foreground">Add Lesson</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Create Lesson</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Lessons live inside sections. Choose the section and content type to generate the fields you need.
          </p>
        </div>

        <Card className="border border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>Lesson Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section">Section *</Label>
              <Select value={formData.sectionId} onValueChange={(value) => updateField("sectionId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Lesson Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Enter lesson title"
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
                <Label htmlFor="body">Lesson Content (HTML / Markdown)</Label>
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
                    placeholder="https://youtu.be/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(event) => updateField("thumbnailUrl", event.target.value)}
                    placeholder="https://example.com/thumb.jpg"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
          <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Create Lesson"}
          </Button>
        </div>
      </div>
    </div>
  )
}
