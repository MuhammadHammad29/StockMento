"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TrendingUp, Search, Filter, Plus, Edit, Trash2, Eye, ArrowLeft, BookOpen, Users, Clock, PlayCircle, FileText } from "lucide-react"
import Link from "next/link"
import { mockCourses, mockUserProgress, getLessonsByCourseId } from "@/lib/mock-data"

export default function AdminCoursesPage() {
  // Transform real course data for admin display
  const courses = mockCourses.map(course => {
    const lessons = getLessonsByCourseId(course.id)
    const textLessons = lessons.filter(l => l.type === 'text').length
    const videoLessons = lessons.filter(l => l.type === 'video').length
    const quizLessons = lessons.filter(l => l.type === 'quiz').length
    
    // Calculate enrollment and completion stats
    const enrolledUsers = mockUserProgress.filter(p => p.courseId === course.id)
    const completedUsers = enrolledUsers.filter(p => (p.overallProgress || 0) >= 100)
    const completionRate = enrolledUsers.length > 0 ? Math.round((completedUsers.length / enrolledUsers.length) * 100) : 0

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: "StockMento",
      students: course.totalStudents,
      lessons: course.totalLessons,
      textLessons,
      videoLessons,
      quizLessons,
      duration: Math.round(course.duration / 60), // Convert minutes to hours
      status: course.isPublished ? "published" : "draft",
      createdDate: course.createdAt.toISOString().split('T')[0],
      completionRate,
      price: course.price,
      rating: course.rating,
      category: course.category,
      level: course.level,
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
                <span className="text-xl font-bold text-foreground">StockMento</span>
                <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300">Admin</Badge>
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">Courses</span>
            </div>
            <Link href="/admin">
              <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
            <p className="text-muted-foreground">Create and manage StockMento educational content</p>
          </div>
          <Link href="/admin/courses/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold text-foreground">
                    {courses.filter((c) => c.status === "published").length}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">
                    {courses.reduce((sum, c) => sum + c.students, 0).toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Completion</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(
                      courses.filter((c) => c.status === "published").reduce((sum, c) => sum + c.completionRate, 0) /
                        courses.filter((c) => c.status === "published").length,
                    )}
                    %
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border border-border/60 bg-card/90">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search courses by title or instructor..." className="pl-10" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                </Button>
                <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                  <Filter className="mr-2 h-4 w-4" />
                  Instructor
                </Button>
                <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                  <Filter className="mr-2 h-4 w-4" />
                  Date Created
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">{course.description}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      course.status === "published"
                        ? "default"
                        : course.status === "draft"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {course.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Instructor: {course.instructor}</p>
                  <p>Created: {course.createdDate}</p>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {course.students}
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    {course.lessons} lessons
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {course.duration}
                  </div>
                </div>

                {course.status === "published" && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate</span>
                      <span>{course.completionRate}%</span>
                    </div>
                    <div className="w-full bg-muted/40 dark:bg-muted/30 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${course.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Link href={`/admin/courses/${course.id}`} className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/admin/courses/${course.id}/edit`} className="flex-1">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" className="bg-transparent text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}



