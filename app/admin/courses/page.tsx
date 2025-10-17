"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, Search, Filter, Plus, Edit, Trash2, Eye, ArrowLeft, BookOpen, Users, Clock, PlayCircle, FileText, Menu, BarChart3, LogOut } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { mockCourses, mockUserProgress, getLessonsByCourseId } from "@/lib/mock-data"
import { useAdminAuth } from "@/lib/admin-auth-context"
import Logo from "@/components/ui/logo"

export default function AdminCoursesPage() {
  const { adminUser, adminLogout } = useAdminAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
      instructor: "StockMento Admin",
      students: course.totalStudents,
      lessons: course.totalLessons,
      textLessons,
      videoLessons,
      quizLessons,
      duration: Math.round(course.duration / 60), // Convert minutes to hours
      status: course.isPublished ? "published" : "draft",
      createdDate: course.createdAt.toISOString().split('T')[0],
      completionRate,
      rating: course.rating,
      category: course.category,
      level: course.level,
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
              <Link href="/admin" className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                <Logo size="sm" className="sm:hidden" />
                <Logo size="md" className="hidden sm:block" />
                <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs flex-shrink-0">Admin</Badge>
              </Link>
              <span className="text-muted-foreground hidden md:inline">/</span>
              <span className="text-muted-foreground hidden md:inline text-sm">Courses</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex">
              <Link href="/admin">
                <Button variant="outline" className="flex items-center gap-2 bg-background/60 text-sm">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
            </div>

            {/* Mobile Menu */}
            <div className="sm:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="border-border/40 text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/20 h-8 w-8">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                  <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-3 text-left">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                          {adminUser?.name?.charAt(0) || "AD"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{adminUser?.name || "Admin"}</span>
                    </SheetTitle>
                    <SheetDescription className="text-left">
                      <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs">Admin Panel</Badge>
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="flex flex-col gap-3 mt-6">
                    <Link 
                      href="/admin" 
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BarChart3 className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20">
                      <BookOpen className="h-4 w-4" />
                      Manage Courses
                    </div>
                    <Link 
                      href="/admin/analytics" 
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Link>
                  </nav>
                  <div className="mt-auto pt-6 border-t">
                    <Button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        adminLogout()
                      }}
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/20"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Course Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Create and manage StockMento educational content</p>
          </div>
          <Link href="/admin/courses/new" className="sm:ml-auto">
            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
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
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    {courses.filter((c) => c.status === "published").length}
                  </p>
                </div>
                <Eye className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Students</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    {courses.reduce((sum, c) => sum + c.students, 0).toLocaleString()}
                  </p>
                </div>
                <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-purple-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Completion</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    {Math.round(
                      courses.filter((c) => c.status === "published").reduce((sum, c) => sum + c.completionRate, 0) /
                        courses.filter((c) => c.status === "published").length,
                    )}
                    %
                  </p>
                </div>
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-yellow-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border border-border/60 bg-card/90">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search courses by title..." className="pl-10" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="flex items-center gap-1 sm:gap-2 bg-background/60 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Status</span>
                  <span className="sm:hidden">Status</span>
                </Button>
                <Button variant="outline" className="flex items-center gap-1 sm:gap-2 bg-background/60 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Date Created</span>
                  <span className="sm:hidden">Date</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2 text-sm">{course.description}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      course.status === "published"
                        ? "default"
                        : course.status === "draft"
                          ? "secondary"
                          : "destructive"
                    }
                    className="flex-shrink-0 ml-2 text-xs"
                  >
                    {course.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  <p>Created: {course.createdDate}</p>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="truncate">{course.students}</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="truncate">{course.lessons} lessons</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="truncate">{course.duration}</span>
                  </div>
                </div>
                {course.status === "published" && (
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
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
