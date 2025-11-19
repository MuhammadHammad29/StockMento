/**
 * Courses Listing Page
 *
 * Displays all available courses with filtering and search functionality.
 * Shows user enrollment, progress tracking, and course details.
 * Includes responsive grid layout with course cards and navigation.
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { BookOpen, Clock, Search, ChevronRight, Loader2, Layers, ListOrdered } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { UserNavbar } from "@/components/navigation"
import { publicCoursesApi, studentCoursesApi } from "@/lib/api"
import {
  CourseEnrollmentSummary,
  PublicCourseSummary,
  CourseEnrollmentStatus,
  AdminCourseLevel,
} from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

type CourseWithMetadata = PublicCourseSummary & {
  progress: number
  isEnrolled: boolean
  enrollmentStatus: CourseEnrollmentStatus | null
}

export default function CoursesPage() {
  const { user } = useAuth()
  // Filter and search state management
  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState("All")
  const [durationFilter, setDurationFilter] = useState("All")
  const [courses, setCourses] = useState<PublicCourseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<CourseEnrollmentSummary[]>([])
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const levelParam = searchParams.get("level")
    if (levelParam) {
      if (
        levelParam === "Beginner" ||
        levelParam === "Intermediate" ||
        levelParam === "Advanced"
      ) {
        setLevelFilter(levelParam)
      } else if (levelParam.toLowerCase() === "beginner") {
        setLevelFilter("Beginner")
      } else if (levelParam.toLowerCase() === "intermediate") {
        setLevelFilter("Intermediate")
      } else if (levelParam.toLowerCase() === "advanced") {
        setLevelFilter("Advanced")
      }
    }
    const searchParam = searchParams.get("q")
    if (searchParam) {
      setSearchQuery(searchParam)
    }
  }, [searchParams])

  const loadCourses = useCallback(async () => {
    setFetchError(null)
    setIsLoading(true)
    try {
      const data = await publicCoursesApi.list()
      setCourses(data)
    } catch (error) {
      console.error("Failed to load courses", error)
      setFetchError("Unable to load courses right now.")
      toast.error("Unable to load courses right now.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    if (!user) {
      setEnrollments([])
      return
    }

    let cancelled = false
    const fetchEnrollments = async () => {
      setIsLoadingEnrollments(true)
      try {
        const data = await studentCoursesApi.list()
        if (!cancelled) {
          setEnrollments(data)
        }
      } catch (error) {
        console.error("Failed to load enrollments", error)
        if (!cancelled) {
          toast.error("Unable to load your enrollments right now.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEnrollments(false)
        }
      }
    }

    fetchEnrollments()
    return () => {
      cancelled = true
    }
  }, [user])

  const enrollmentMap = useMemo(() => {
    const map = new Map<string, CourseEnrollmentSummary>()
    enrollments.forEach((enrollment) => {
      if (enrollment.status !== "dropped") {
        map.set(enrollment.courseId, enrollment)
      }
    })
    return map
  }, [enrollments])

  // Enhance courses with derived UI metadata
  const coursesWithProgress: CourseWithMetadata[] = useMemo(() => {
    return courses.map((course) => {
      const enrollment = enrollmentMap.get(course.id)
      const isEnrolled = Boolean(enrollment)

      return {
        ...course,
        isEnrolled,
        progress: enrollment?.progressPercent ?? 0,
        enrollmentStatus: enrollment?.status ?? null,
      }
    })
  }, [courses, enrollmentMap])

  // Filter courses
  const filteredCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const normalizedLevelFilter = levelFilter === "All" ? null : levelFilter.toLowerCase()

    return coursesWithProgress.filter((course) => {
      const normalizedLevel = (course.level ?? "").toLowerCase()
      const matchesSearch =
        !normalizedQuery ||
        course.title.toLowerCase().includes(normalizedQuery) ||
        course.description.toLowerCase().includes(normalizedQuery) ||
        normalizedLevel.includes(normalizedQuery)

      const matchesLevel = !normalizedLevelFilter || normalizedLevel === normalizedLevelFilter

      const matchesDuration =
        durationFilter === "All" ||
        (durationFilter === "Short" && course.durationMinutes <= 120) ||
        (durationFilter === "Medium" &&
          course.durationMinutes > 120 &&
          course.durationMinutes <= 300) ||
        (durationFilter === "Long" && course.durationMinutes > 300)

      return matchesSearch && matchesLevel && matchesDuration
    })
  }, [coursesWithProgress, searchQuery, levelFilter, durationFilter])

  const totalLessons = useMemo(
    () => coursesWithProgress.reduce((sum, course) => sum + course.totalLessons, 0),
    [coursesWithProgress],
  )

  const activeEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.status !== "dropped").length,
    [enrollments],
  )

  const averageDurationMinutes = useMemo(() => {
    if (coursesWithProgress.length === 0) return 0
    const totalDuration = coursesWithProgress.reduce(
      (sum, course) => sum + course.durationMinutes,
      0,
    )
    return Math.round(totalDuration / coursesWithProgress.length)
  }, [coursesWithProgress])

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
    }
    return `${mins}m`
  }

  const levelVariantMap: Record<AdminCourseLevel, "default" | "secondary" | "destructive"> = {
    beginner: "default",
    intermediate: "secondary",
    advanced: "destructive",
  }

  const getLevelVariant = (level: AdminCourseLevel) => levelVariantMap[level] ?? "secondary"

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <UserNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">All Courses</h1>
          <p className="text-xl text-muted-foreground mb-6">Master the Pakistan Stock Exchange with our comprehensive course library</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">{coursesWithProgress.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Courses</div>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {isLoadingEnrollments ? "…" : activeEnrollments}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">My Enrollments</div>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {totalLessons}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Lessons Published</div>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 sm:p-4">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                {coursesWithProgress.length > 0 ? formatDuration(averageDurationMinutes) : "0m"}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Avg. Course Duration</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="border border-border/60 bg-card/90 mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search courses or topics..." 
                  className="pl-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={levelFilter}
                  onChange={(e) => {
                    setLevelFilter(e.target.value)
                    const params = new URLSearchParams(searchParams.toString())
                    if (e.target.value === "All") {
                      params.delete("level")
                    } else {
                      params.set("level", e.target.value)
                    }
                    router.replace(params.toString() ? `?${params.toString()}` : "?", { scroll: false })
                  }}
                  className="px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-background text-foreground dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="All">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                
                <select
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-background text-foreground dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="All">Any Duration</option>
                  <option value="Short">Short (&lt;2h)</option>
                  <option value="Medium">Medium (2-5h)</option>
                  <option value="Long">Long (&gt;5h)</option>
                </select>
              </div>
            </div>
            
            {searchQuery && (
              <div className="mt-4 text-sm text-muted-foreground">
                Found {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
              </div>
            )}
          </CardContent>
        </Card>

        {fetchError && (
          <Card className="border border-red-200 bg-red-50/80 dark:bg-red-500/10 dark:border-red-500/30 mb-6">
            <CardContent className="flex flex-col gap-4 p-6 text-center">
              <div>
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-200">We couldn&apos;t load the courses</h3>
                <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
              </div>
              <div className="flex justify-center">
                <Button onClick={loadCourses} variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card className="border border-border/60 bg-card/90 p-12 text-center">
            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Loading courses</h3>
            <p className="text-muted-foreground">Fetching the latest learning experiences for you...</p>
          </Card>
        ) : filteredCourses.length === 0 ? (
          <Card className="border border-border/60 bg-card/90 p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search criteria or filters</p>
            <Button 
              onClick={() => {
                setSearchQuery("")
                setLevelFilter("All")
                setDurationFilter("All")
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden group flex flex-col h-full">
                <div className="aspect-video bg-white dark:bg-slate-950 relative overflow-hidden p-4">
                  <Image
                    src={course.mediaUrl || "/placeholder.svg"}
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105 p-4"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-6 left-6 z-10">
                    <Badge variant={getLevelVariant(course.level)} className="shadow-sm">
                      {(course.level ?? "LEVEL").toUpperCase()}
                    </Badge>
                  </div>
                  {course.isEnrolled && (
                    <div className="absolute bottom-6 left-6 z-10">
                      <Badge
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide border ${
                          course.enrollmentStatus === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {course.enrollmentStatus === "completed" ? "COMPLETED" : "IN PROGRESS"}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 flex-grow">{course.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 flex-grow flex flex-col">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
                      {course.sectionsCount} sections
                    </div>
                    <div className="flex items-center gap-1">
                      <ListOrdered className="h-3 w-3 sm:h-4 sm:w-4" />
                      {course.totalLessons} lessons
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      {formatDuration(course.durationMinutes)}
                    </div>
                  </div>

                  {course.isEnrolled && course.progress > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}

                  <div className="mt-auto">
                    <Link href={`/courses/${course.id}`}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 group-hover:shadow-md transition-all">
                        {course.isEnrolled
                          ? course.enrollmentStatus === "completed"
                            ? "Review Course"
                            : course.progress > 0
                              ? "Continue Learning"
                              : "Start Course"
                          : "View Course"}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More - Hidden for now since we have all courses */}
        {filteredCourses.length > 0 && filteredCourses.length === coursesWithProgress.length && !isLoading && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">You&apos;ve seen all available courses!</p>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}




