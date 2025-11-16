"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdminNavbar } from "@/components/navigation"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { courseApi } from "@/lib/api"
import { generateSlug } from "@/lib/data-utils"
import { toast } from "@/components/ui/use-toast"

type CourseLevel = "beginner" | "intermediate" | "advanced"

interface CourseFormState {
  title: string
  slug: string
  description: string
  level: CourseLevel
  mediaUrl: string
  isPublished: boolean
}

const emptyState: CourseFormState = {
  title: "",
  slug: "",
  description: "",
  level: "beginner",
  mediaUrl: "",
  isPublished: false,
}

export default function AdminCourseEditPage({ params }: { params: { id: string } }) {
  const { adminUser } = useAdminAuth()
  void adminUser

  const router = useRouter()
  const courseId = params.id

  const [formData, setFormData] = useState<CourseFormState>(emptyState)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSlugDirty, setIsSlugDirty] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadCourse = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const course = await courseApi.getCourse(courseId)
      setFormData({
        title: course.title,
        slug: course.slug,
        description: course.description,
        level: course.level as CourseLevel,
        mediaUrl: course.mediaUrl ?? "",
        isPublished: course.isPublished,
      })
      setHasChanges(false)
      setIsSlugDirty(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load course details."
      setLoadError(message)
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void loadCourse()
  }, [loadCourse])

  const updateField = <K extends keyof CourseFormState>(field: K, value: CourseFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setHasChanges(true)
  }

  const handleTitleChange = (value: string) => {
    updateField("title", value)
    if (!isSlugDirty) {
      updateField("slug", generateSlug(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setIsSlugDirty(true)
    updateField("slug", generateSlug(value))
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.slug.trim() || !formData.description.trim()) {
      toast({
        title: "Missing required fields",
        description: "Title, slug, and description are required.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        level: formData.level,
        mediaUrl: formData.mediaUrl.trim() || undefined,
        isPublished: formData.isPublished,
      }
      const updated = await courseApi.updateCourse(courseId, payload)
      setFormData({
        title: updated.title,
        slug: updated.slug,
        description: updated.description,
        level: updated.level as CourseLevel,
        mediaUrl: updated.mediaUrl ?? "",
        isPublished: updated.isPublished,
      })
      setHasChanges(false)
      toast({
        title: "Course updated",
        description: updated.isPublished
          ? `"${updated.title}" is published.`
          : `"${updated.title}" saved as draft.`,
      })
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update course."
      toast({
        title: "Unable to update course",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <AdminNavbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading course...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CardTitle className="text-xl">Course unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
            <Button onClick={() => void loadCourse()}>Retry</Button>
            <Link href="/admin/courses">
              <Button variant="outline">Back to Courses</Button>
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
              <Link href="/admin/courses" className="hover:text-foreground">
                Courses
              </Link>
              <span className="mx-1 sm:mx-2">/</span>
              <Link href={`/admin/courses/${courseId}`} className="hover:text-foreground">
                Course Details
              </Link>
              <span className="mx-1 sm:mx-2">/</span>
              <span className="text-foreground">Edit</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        {hasChanges && (
          <Alert variant="default" className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You have unsaved changes.</AlertDescription>
          </Alert>
        )}

        <Card className="border border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>Edit Course</CardTitle>
            <CardDescription>Only core LMS fields are editable here. Sections and lessons are managed separately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title*</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Course title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug*</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="course-slug"
              />
              <p className="text-xs text-muted-foreground">Used in URLs. Only lowercase letters, numbers, and hyphens.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description*</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Difficulty Level</Label>
                <Select value={formData.level} onValueChange={(value: CourseLevel) => updateField("level", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mediaUrl">Hero Media URL</Label>
                <Input
                  id="mediaUrl"
                  value={formData.mediaUrl}
                  onChange={(event) => updateField("mediaUrl", event.target.value)}
                  placeholder="https://example.com/cover.png"
                />
                <p className="text-xs text-muted-foreground">Optional banner image or video reference.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="published">Publish Status</Label>
              <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">
                    Toggle to control whether this course is available in admin dashboards.
                  </p>
                </div>
                <Switch
                  id="published"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => updateField("isPublished", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button onClick={() => void loadCourse()} variant="outline" disabled={isSaving}>
            Reset Changes
          </Button>
          <Button
            onClick={() => void handleSave()}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            disabled={isSaving || !hasChanges}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
