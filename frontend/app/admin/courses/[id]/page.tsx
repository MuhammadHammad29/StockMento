"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Clock,
  Edit,
  Layers,
  Plus,
  Trash2,
  Video,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AdminNavbar } from "@/components/navigation"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { courseApi, courseSectionApi, lessonApi } from "@/lib/api"
import type { AdminCourse, AdminCourseSection } from "@/lib/types"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type LessonLink = NonNullable<AdminCourseSection["lessons"]>[number]

const countLessons = (course: AdminCourse) =>
  course.sections?.reduce((total, section) => total + (section.lessons?.length ?? 0), 0) ?? 0

const totalDurationMinutes = (course: AdminCourse) =>
  course.sections?.reduce(
    (total, section) =>
      total +
      (section.lessons?.reduce((sectionTotal, link) => sectionTotal + (link.lesson?.durationMinutes ?? 0), 0) ?? 0),
    0,
  ) ?? 0

const formatDuration = (minutes: number) => {
  if (!minutes) return "0 min"
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining} min`
  if (remaining === 0) return `${hours} hr`
  return `${hours} hr ${remaining} min`
}

const lessonIcon = (type: string) => {
  switch (type) {
    case "video":
      return <Video className="h-4 w-4 text-blue-500" />
    case "text":
      return <FileText className="h-4 w-4 text-emerald-500" />
    default:
      return <BookOpen className="h-4 w-4 text-muted-foreground" />
  }
}

export default function AdminCourseDetailPage({ params }: { params: { id: string } }) {
  const { adminUser } = useAdminAuth()
  void adminUser

  const courseId = params.id

  const [course, setCourse] = useState<AdminCourse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingLessonId, setProcessingLessonId] = useState<string | null>(null)
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [isCreatingSection, setIsCreatingSection] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionTitle, setEditingSectionTitle] = useState("")
  const [isUpdatingSection, setIsUpdatingSection] = useState(false)
  const [lessonToDelete, setLessonToDelete] = useState<{ sectionId: string; lesson: LessonLink } | null>(null)
  const [isDeletingLesson, setIsDeletingLesson] = useState(false)

  const loadCourse = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await courseApi.getCourse(courseId)
      setCourse(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load course."
      setError(message)
      toast.error("Unable to load course", {
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void loadCourse()
  }, [loadCourse])

  const stats = useMemo(() => {
    if (!course) {
      return { sections: 0, lessons: 0, duration: "0 min" }
    }
    return {
      sections: course.sections?.length ?? 0,
      lessons: countLessons(course),
      duration: formatDuration(totalDurationMinutes(course)),
    }
  }, [course])

  const mutateSections = (updater: (sections: AdminCourseSection[]) => AdminCourseSection[]) => {
    setCourse((prev) => (prev ? { ...prev, sections: updater(prev.sections ?? []) } : prev))
  }

  const handleCreateSection = async () => {
    const title = newSectionTitle.trim()
    if (!title) {
      toast.error("Section title required", {
        description: "Please enter a section name before saving.",
      })
      return
    }
    setIsCreatingSection(true)
    try {
      const created = await courseSectionApi.createSection(courseId, { title })
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              sections: [...(prev.sections ?? []), { ...created, lessons: [] }],
            }
          : prev,
      )
      toast.success("Section added", {
        description: `"${created.title}" was added to this course.`,
      })
      setNewSectionTitle("")
      setIsAddingSection(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create section."
      toast.error("Failed to add section", {
        description: message,
      })
    } finally {
      setIsCreatingSection(false)
    }
  }

  const handleUpdateSection = async () => {
    if (!editingSectionId) return
    const title = editingSectionTitle.trim()
    if (!title) {
      toast.error("Section title required", {
        description: "Please enter a section name before saving.",
      })
      return
    }
    setIsUpdatingSection(true)
    try {
      const updated = await courseSectionApi.updateSection(courseId, editingSectionId, {
        title,
      })
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections?.map((section) =>
                section.id === editingSectionId ? { ...section, ...updated } : section,
              ),
            }
          : prev,
      )
      toast.success("Section updated", {
        description: `"${updated.title}" was updated successfully.`,
      })
      setEditingSectionId(null)
      setEditingSectionTitle("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update section."
      toast.error("Failed to update section", {
        description: message,
      })
    } finally {
      setIsUpdatingSection(false)
    }
  }

  const handleLessonReorder = async (
    sectionId: string,
    lessonId: string,
    direction: "up" | "down",
  ) => {
    if (!course?.sections) return
    const section = course.sections.find((sec) => sec.id === sectionId)
    if (!section?.lessons || section.lessons.length < 2) return

    const currentIndex = section.lessons.findIndex((link) => link.lessonId === lessonId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= section.lessons.length) {
      return
    }

    const reorderedLessons = [...section.lessons]
    const [moved] = reorderedLessons.splice(currentIndex, 1)
    reorderedLessons.splice(newIndex, 0, moved)

    mutateSections((sections) =>
      sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              lessons: reorderedLessons.map((link, index) => ({ ...link, position: index + 1 })),
            }
          : sec,
      ),
    )

    try {
      await lessonApi.reorderLessons(courseId, sectionId, {
        lessons: reorderedLessons.map((link, index) => ({
          lessonId: link.lessonId,
          position: index + 1,
        })),
      })
      toast("Lesson order updated", {
        description: `"${moved.lesson.title}" moved ${direction === "up" ? "up" : "down"}.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update lesson order."
      toast.error("Failed to reorder", { description: message })
      void loadCourse()
    }
  }

  const handleLessonDelete = async (sectionId: string, lesson: LessonLink) => {
    setProcessingLessonId(lesson.lessonId)
    setIsDeletingLesson(true)
    try {
      await lessonApi.deleteLesson(courseId, sectionId, lesson.lessonId)
      mutateSections((sections) =>
        sections.map((sec) =>
          sec.id === sectionId
            ? { ...sec, lessons: sec.lessons?.filter((link) => link.lessonId !== lesson.lessonId) ?? [] }
            : sec,
        ),
      )
      toast.success("Lesson deleted", {
        description: `"${lesson.lesson.title}" has been removed.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete lesson."
      toast.error("Unable to delete lesson", {
        description: message,
      })
    } finally {
      setProcessingLessonId(null)
      setIsDeletingLesson(false)
      setLessonToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <AdminNavbar />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading course...</div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CardTitle className="text-xl">Course unavailable</CardTitle>
            <CardDescription>{error ?? "Course not found."}</CardDescription>
            <div className="flex justify-center gap-2">
              <Button onClick={() => void loadCourse()}>Retry</Button>
              <Link href="/admin/courses">
                <Button variant="outline">Back to Courses</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <AdminNavbar />

      <div className="border-b border-border/60 bg-background/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
              <Link href="/admin/courses" className="hover:text-foreground">
                Courses
              </Link>
              <span className="mx-1 sm:mx-2">/</span>
              <span className="text-foreground truncate max-w-[200px] sm:max-w-none">{course.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/courses/${courseId}/edit`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm px-3 py-2 h-9">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Course
                </Button>
              </Link>
              <Button variant="outline" onClick={() => void loadCourse()}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        <Card className="border border-border/60 bg-card/90">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl sm:text-2xl">{course.title}</CardTitle>
                  <CardDescription className="text-sm sm:text-base">{course.description}</CardDescription>
                </div>
                <Badge variant={course.isPublished ? "default" : "secondary"} className="capitalize">
                  {course.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {course.level}
                </Badge>
                <span>Slug: {course.slug}</span>
                <span>Updated: {new Date(course.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sections</p>
                <p className="text-xl font-semibold">{stats.sections}</p>
              </div>
              <Layers className="h-5 w-5 text-purple-500" />
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Lessons</p>
                <p className="text-xl font-semibold">{stats.lessons}</p>
              </div>
              <BookOpen className="h-5 w-5 text-emerald-500" />
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-xl font-semibold">{stats.duration}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardContent>
          </Card>
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Course ID</p>
                <p className="text-xs font-mono truncate max-w-[130px]">{course.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Sections & Lessons</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm h-9 px-4"
                onClick={() => {
                  setIsAddingSection((prev) => !prev)
                  setNewSectionTitle("")
                }}
              >
                {isAddingSection ? "Close Section Form" : "Add Section"}
              </Button>
              <Link href={`/admin/courses/${courseId}/lessons/new`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm h-9 px-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lesson
                </Button>
              </Link>
            </div>
          </div>

          {isAddingSection && (
            <Card className="border border-dashed border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/30">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="section-title">Section title</Label>
                  <Input
                    id="section-title"
                    value={newSectionTitle}
                    onChange={(event) => setNewSectionTitle(event.target.value)}
                    placeholder="e.g. Market Basics"
                    disabled={isCreatingSection}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleCreateSection()} disabled={isCreatingSection}>
                    {isCreatingSection ? "Saving..." : "Save Section"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingSection(false)
                      setNewSectionTitle("")
                    }}
                    disabled={isCreatingSection}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {(!course.sections || course.sections.length === 0) && (
          <Card className="border border-dashed border-border/70 bg-card/80">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No sections yet. Create a section and add lessons to start structuring this course.
            </CardContent>
          </Card>
        )}

        {course.sections?.map((section) => (
          <Card key={section.id} id={`section-${section.id}`} className="border border-border/60 bg-card/90">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>Section {section.position}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{section.lessons?.length ?? 0} lessons</Badge>
                <Link href={`/admin/courses/${courseId}/lessons/new?sectionId=${section.id}`}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Lesson
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingSectionId(section.id)
                    setEditingSectionTitle(section.title)
                  }}
                  disabled={isUpdatingSection && editingSectionId === section.id}
                >
                  Edit Section
                </Button>
              </div>
            </CardHeader>
            {editingSectionId === section.id && (
              <div className="px-6 pb-4">
                <div className="space-y-2">
                  <Label htmlFor={`edit-section-${section.id}`}>Section title</Label>
                  <Input
                    id={`edit-section-${section.id}`}
                    value={editingSectionTitle}
                    onChange={(event) => setEditingSectionTitle(event.target.value)}
                    disabled={isUpdatingSection}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button onClick={() => void handleUpdateSection()} disabled={isUpdatingSection}>
                    {isUpdatingSection ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingSectionId(null)
                      setEditingSectionTitle("")
                    }}
                    disabled={isUpdatingSection}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <CardContent className="space-y-3">
              {section.lessons && section.lessons.length > 0 ? (
                [...section.lessons]
                  .sort((a, b) => a.position - b.position)
                  .map((lessonLink, index) => (
                    <div
                      key={lessonLink.lessonId}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-border/40 bg-card/80 p-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {lessonIcon(lessonLink.lesson.contentType)}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{lessonLink.lesson.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {lessonLink.lesson.contentType} • {lessonLink.lesson.durationMinutes} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={index === 0 || processingLessonId === lessonLink.lessonId}
                            onClick={() => void handleLessonReorder(section.id, lessonLink.lessonId, "up")}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={
                              index === (section.lessons?.length ?? 0) - 1 || processingLessonId === lessonLink.lessonId
                            }
                            onClick={() => void handleLessonReorder(section.id, lessonLink.lessonId, "down")}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <Link href={`/admin/courses/${courseId}/lessons/${lessonLink.lessonId}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={processingLessonId === lessonLink.lessonId}
                          onClick={() => setLessonToDelete({ sectionId: section.id, lesson: lessonLink })}
                        >
                          {processingLessonId === lessonLink.lessonId ? "Deleting..." : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-muted-foreground">No lessons in this section yet.</div>
              )}
            </CardContent>
          </Card>
        ))}
        <AlertDialog
          open={!!lessonToDelete}
          onOpenChange={(open) => {
            if (!open && !isDeletingLesson) {
              setLessonToDelete(null)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete lesson</AlertDialogTitle>
              <AlertDialogDescription>
                {lessonToDelete ? `Remove "${lessonToDelete.lesson.lesson.title}" from this course?` : ""}
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingLesson}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingLesson}
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (lessonToDelete) {
                    void handleLessonDelete(lessonToDelete.sectionId, lessonToDelete.lesson)
                  }
                }}
              >
                {isDeletingLesson ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
