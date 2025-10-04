"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  ArrowLeft, 
  Edit, 
  Plus, 
  BookOpen, 
  PlayCircle, 
  FileText, 
  Users, 
  Clock, 
  Star,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { mockCourses, mockUserProgress, getLessonsByCourseId } from "@/lib/mock-data"

export default function AdminCourseDetailPage({ params }: { params: { id: string } }) {
  const { adminUser } = useAdminAuth()
  const courseId = params.id
  
  // Find the course - in future this will be an API call
  const course = mockCourses.find(c => c.id === courseId)
  const lessons = getLessonsByCourseId(courseId)
  
  // Calculate course stats - in future this will come from database aggregations
  const enrolledUsers = mockUserProgress.filter(p => p.courseId === courseId)
  const completedUsers = enrolledUsers.filter(p => (p.overallProgress || 0) >= 100)
  const completionRate = enrolledUsers.length > 0 ? Math.round((completedUsers.length / enrolledUsers.length) * 100) : 0
  const avgProgress = enrolledUsers.length > 0 
    ? Math.round(enrolledUsers.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / enrolledUsers.length)
    : 0

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested course could not be found.</p>
            <Link href="/admin/courses">
              <Button>Back to Courses</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

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
              <Link href="/admin/courses" className="text-muted-foreground hover:text-foreground">
                Courses
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground truncate max-w-xs">{course.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/courses/${courseId}/edit`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Course
                </Button>
              </Link>
              <Link href="/admin/courses">
                <Button variant="outline" className="bg-background/60">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">{course.title}</h1>
              <p className="text-muted-foreground text-lg mb-4">{course.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant={course.isPublished ? "default" : "secondary"}>
                  {course.isPublished ? "Published" : "Draft"}
                </Badge>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {lessons.length} lessons
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round(course.duration / 60)}h duration
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {enrolledUsers.length} enrolled
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {course.rating} rating
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                  <p className="text-2xl font-bold">{enrolledUsers.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">{avgProgress}%</p>
                </div>
                <Progress value={avgProgress} className="mt-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">PKR {(course.price * enrolledUsers.length).toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Course Lessons</h2>
              <Link href={`/admin/courses/${courseId}/lessons/new`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {lesson.type === 'text' && <FileText className="h-5 w-5 text-blue-600" />}
                          {lesson.type === 'video' && <PlayCircle className="h-5 w-5 text-red-600" />}
                          {lesson.type === 'quiz' && <BookOpen className="h-5 w-5 text-purple-600" />}
                          <div>
                            <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                            <p className="text-sm text-muted-foreground">{lesson.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {lesson.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {lesson.duration} min
                        </span>
                        <div className="flex items-center gap-1 ml-4">
                          <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics dashboard will be implemented with backend integration</p>
                  <p className="text-sm mt-2">This will include completion rates, engagement metrics, and learning progress charts</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enrolled Students ({enrolledUsers.length})</CardTitle>
                <CardDescription>Manage student enrollments and track progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Student management interface will be implemented with backend</p>
                  <p className="text-sm mt-2">View individual progress, send messages, and manage enrollments</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Settings</CardTitle>
                <CardDescription>Configure course properties and access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Course settings panel will be implemented with backend</p>
                  <p className="text-sm mt-2">Manage pricing, access levels, certificates, and course metadata</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}