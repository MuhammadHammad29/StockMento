"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Clock,
  Layers,
  ListOrdered,
} from "lucide-react"
import Link from "next/link"
import { AdminNavbar } from "@/components/navigation"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { courseApi } from "@/lib/api"
import type { AdminCourse } from "@/lib/types"
import { toast } from "sonner"

const countSections = (course: AdminCourse): number => course.sections?.length ?? 0

const countLessons = (course: AdminCourse): number => {
  if (!course.sections) {
    return 0
  }
  return course.sections.reduce((total, section) => total + (section.lessons?.length ?? 0), 0)
}

const countDurationMinutes = (course: AdminCourse): number => {
  if (!course.sections) {
    return 0
  }

  return course.sections.reduce((total, section) => {
    const sectionMinutes =
      section.lessons?.reduce((sectionTotal, link) => sectionTotal + (link.lesson?.durationMinutes ?? 0), 0) ?? 0
    return total + sectionMinutes
  }, 0)
}

const formatDurationLabel = (minutes: number): string => {
  if (!minutes) return "0 min"
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) {
    return `${remaining} min`
  }
  if (remaining === 0) {
    return `${hours} hr`
  }
  return `${hours} hr ${remaining} min`
}

const toTitleCase = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value

export default function AdminCoursesPage() {
  const { adminUser } = useAdminAuth()
  void adminUser

  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadCourses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await courseApi.getAllCourses()
      setCourses(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load courses. Please try again."
      setError(message)
      toast.error("Unable to load courses", {
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) {
      return courses
    }
    const term = searchQuery.trim().toLowerCase()
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(term) ||
        course.slug.toLowerCase().includes(term) ||
        course.description.toLowerCase().includes(term),
    )
  }, [courses, searchQuery])

  const aggregateStats = useMemo(() => {
    const published = courses.filter((course) => course.isPublished).length
    const totalSections = courses.reduce((total, course) => total + countSections(course), 0)
    const totalLessons = courses.reduce((total, course) => total + countLessons(course), 0)
    const durationMinutes = courses.reduce((total, course) => total + countDurationMinutes(course), 0)

    return {
      published,
      totalSections,
      totalLessons,
      durationMinutes,
    }
  }, [courses])

  const handleDeleteCourse = useCallback(async (course: AdminCourse) => {
    const confirmed = window.confirm(`Delete "${course.title}"? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingId(course.id)
    try {
      await courseApi.deleteCourse(course.id)
      setCourses((prev) => prev.filter((item) => item.id !== course.id))
      toast({
        title: "Course deleted",
        description: `"${course.title}" has been removed.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete course."
      toast({
        title: "Unable to delete course",
        description: message,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Course Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Create, publish, and organize StockMento courses backed by the live database
            </p>
          </div>
          <Link href="/admin/courses/new" className="sm:ml-auto">
            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Courses</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{courses.length}</p>
                </div>
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-emerald-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Published</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{aggregateStats.published}</p>
                </div>
                <Eye className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Sections</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    {aggregateStats.totalSections}
                  </p>
                </div>
                <Layers className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-purple-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Runtime</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    {formatDurationLabel(aggregateStats.durationMinutes)}
                  </p>
                </div>
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-yellow-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border border-border/60 bg-card/90">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses by title, slug, or description..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-1 sm:gap-2 bg-background/60 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
                  disabled
                  title="Status filtering will arrive once analytics endpoints are ready"
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Status</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-1 sm:gap-2 bg-background/60 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
                  disabled
                  title="Sorting controls will be enabled in a future iteration"
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Date Created</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Loading courses from the server...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border border-destructive/40 bg-destructive/5">
            <CardContent className="p-6 flex flex-col gap-3">
              <div>
                <CardTitle className="text-base">Unable to load courses</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">{error}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void loadCourses()}>
                  Retry
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredCourses.length === 0 ? (
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6 text-center space-y-3">
              <CardTitle className="text-lg">No courses found</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No courses match your search. Try a different keyword."
                  : "You have not created any courses yet."}
              </CardDescription>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Reset Search
                </Button>
                <Link href="/admin/courses/new">
                  <Button>Create your first course</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const sections = countSections(course)
              const lessons = countLessons(course)
              const durationLabel = formatDurationLabel(countDurationMinutes(course))
              const updatedLabel = new Date(course.updatedAt).toLocaleDateString()

              return (
                <Card key={course.id} className="hover:shadow-lg transition-shadow border border-border/60 bg-card/90">
                  <CardHeader className="p-4 sm:p-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg line-clamp-2">{course.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-2 text-sm">
                          {course.description || "No description provided."}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={course.isPublished ? "default" : "secondary"}
                        className="flex-shrink-0 text-xs capitalize"
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {toTitleCase(course.level)}
                      </Badge>
                      <span className="text-muted-foreground truncate">Slug: {course.slug}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
                        {sections} sections
                      </div>
                      <div className="flex items-center gap-1">
                        <ListOrdered className="h-3 w-3 sm:h-4 sm:w-4" />
                        {lessons} lessons
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        {durationLabel}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">Updated {updatedLabel}</div>
                    <div className="flex space-x-2">
                      <Link href={`/admin/courses/${course.id}`} className="flex-1">
                        <Button variant="outline" className="w-full bg-transparent text-xs sm:text-sm">
                          <Eye className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/courses/${course.id}/edit`} className="flex-1">
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="bg-transparent text-red-600 hover:text-red-700"
                        disabled={deletingId === course.id}
                        onClick={() => void handleDeleteCourse(course)}
                      >
                        {deletingId === course.id ? (
                          <span className="text-xs">Deleting...</span>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
