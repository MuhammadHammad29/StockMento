"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminNavbar } from "@/components/navigation"
import { courseApi } from "@/lib/api"
import { generateSlug } from "@/lib/data-utils"
import { toast } from "sonner"

type CourseLevel = "beginner" | "intermediate" | "advanced" | ""

interface CourseFormState {
  title: string
  slug: string
  description: string
  level: CourseLevel
  mediaUrl: string
}

const initialState: CourseFormState = {
  title: "",
  slug: "",
  description: "",
  level: "",
  mediaUrl: "",
}

export default function CreateCoursePage() {
  const router = useRouter()
  const [courseData, setCourseData] = useState<CourseFormState>(initialState)
  const [isSlugDirty, setIsSlugDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateField = (field: keyof CourseFormState, value: string) => {
    setCourseData((prev) => ({
      ...prev,
      [field]: value,
    }))
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

  const validateForm = () => {
    if (!courseData.title.trim()) {
      toast.error("Missing title", {
        description: "Please provide a course title.",
      })
      return false
    }
    if (!courseData.slug.trim()) {
      toast.error("Missing slug", {
        description: "Please provide a unique slug.",
      })
      return false
    }
    if (!courseData.description.trim()) {
      toast.error("Description required", {
        description: "Add a short course description for the catalog.",
      })
      return false
    }
    if (!courseData.level) {
      toast.error("Select a level", {
        description: "Choose the difficulty level for this course.",
      })
      return false
    }
    return true
  }

  const handleSave = async (publish: boolean) => {
    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: courseData.title.trim(),
        slug: courseData.slug.trim(),
        description: courseData.description.trim(),
        level: courseData.level as "beginner" | "intermediate" | "advanced",
        mediaUrl: courseData.mediaUrl.trim() || undefined,
        isPublished: publish,
      }

      const created = await courseApi.createCourse(payload)
      const message = publish ? "Course published" : "Course saved"
      toast.success(message, {
        description: publish
          ? `"${created.title}" is live for admins.`
          : `"${created.title}" was saved as a draft.`,
      })
      router.push(`/admin/courses/${created.id}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while saving the course. Please try again."
      toast.error("Unable to save course", {
        description: message,
      })
    } finally {
      setIsSaving(false)
    }
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
              <span className="text-foreground">Create Course</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Create New Course</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Courses created here immediately reflect in the admin dashboard. You can fill in sections and lessons later.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={courseData.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="e.g. PSX Fundamentals"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={courseData.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  placeholder="psx-fundamentals"
                />
                <p className="text-xs text-muted-foreground">Used in URLs. Only lowercase letters, numbers, and hyphens.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={courseData.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Briefly describe what this course covers."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level *</Label>
                  <Select value={courseData.level} onValueChange={(value: CourseLevel) => updateField("level", value)}>
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
                    value={courseData.mediaUrl}
                    onChange={(event) => updateField("mediaUrl", event.target.value)}
                    placeholder="https://example.com/course-thumb.png"
                  />
                  <p className="text-xs text-muted-foreground">Optional banner image or video URL.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              onClick={() => handleSave(false)}
              variant="outline"
              className="flex-1 sm:flex-none cursor-pointer"
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 cursor-pointer"
              disabled={isSaving}
            >
              <Eye className="mr-2 h-4 w-4" />
              {isSaving ? "Publishing..." : "Publish Course"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
