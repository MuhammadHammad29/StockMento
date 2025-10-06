/**
 * User Dashboard Page
 * 
 * Personal dashboard for logged-in users showing their learning progress,
 * enrolled courses, achievements, and recent             <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-border/40 text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>y. Includes navigation
 * to continue learning, view certificates, and manage profile settings.
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  Play,
  Calendar,
  Target,
  BarChart3,
  Users,
  Star,
  ChevronRight,
  Settings,
  Bell,
  Menu,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { mockCourses, mockUserProgress, getUserCourses, getCourseById } from "@/lib/mock-data"
import { formatTimeAgo, getActivitySummary } from "@/lib/data-utils"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Please sign in to access your dashboard</h1>
          <Link href="/signin">
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const userProgressData = mockUserProgress.filter((p) => p.userId === user.id)
  const enrolledCourses = getUserCourses(user.id)
  const activitySummary = getActivitySummary(userProgressData)

  // Get courses user hasn't enrolled in for recommendations
  const enrolledCourseIds = enrolledCourses.map(c => c.id)
  const recommendedCourses = mockCourses
    .filter(course => !enrolledCourseIds.includes(course.id) && course.isPublished)
    .slice(0, 3) // Show top 3 recommendations

  const recentActivity = [
    {
      id: 1,
      type: "lesson_complete",
      title: 'Completed "Understanding Stock Market Basics"',
      course: "PSX Fundamentals",
      time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: 2,
      type: "quiz_complete",
      title: "Scored 85% on PSX Fundamentals Quiz",
      course: "PSX Fundamentals",
      time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: 3,
      type: "course_start",
      title: 'Started "Technical Analysis Mastery"',
      course: "Technical Analysis Mastery",
      time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  ]

  const upcomingLessons = [
    {
      id: "lesson-1-3",
      title: "Market Participants and Their Roles",
      course: "PSX Fundamentals",
      duration: 18,
      type: "text" as "text" | "video",
    },
    {
      id: "lesson-2-2",
      title: "Support and Resistance Levels",
      course: "Technical Analysis Mastery",
      duration: 22,
      type: "video" as "text" | "video",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-emerald-600" />
            <span className="text-xl font-bold text-foreground">StockMento</span>
          </div>

          {/* Desktop Navigation & User Menu */}
          <div className="hidden items-center space-x-8 md:flex">
            {/* Navigation Links */}
            <nav className="flex items-center space-x-6">
              <Link href="/courses" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                Courses
              </Link>
              <Link href="/progress" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                Progress
              </Link>
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300">
                <Bell className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                onClick={logout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              <Link href="/dashboard/profile">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="flex items-center space-x-2 md:hidden">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300">
              <Bell className="h-5 w-5" />
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-border/40 text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="border-b pb-4">
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    {user.email}
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-3 mt-6">
                  <Link 
                    href="/courses" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Courses
                  </Link>
                  <Link 
                    href="/progress" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Trophy className="h-4 w-4" />
                    Progress
                  </Link>
                  <Link 
                    href="/dashboard/profile" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="space-y-6">
          {/* Welcome Card with Quick Actions */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold text-foreground">Welcome back, {user.firstName}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track your progress and continue learning about the Pakistan Stock Exchange.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                  {activitySummary.totalCourses} active courses
                </Badge>
                <Link href="/courses">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse All Courses
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Progress</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-3xl font-semibold text-foreground">{activitySummary.averageProgress}%</div>
                    <Progress value={activitySummary.averageProgress} className="h-2 flex-1" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Lessons</p>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{activitySummary.totalLessons}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quizzes Passed</p>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{activitySummary.totalQuizzes}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Courses */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                  Current Courses
                </CardTitle>
                <CardDescription>Your ongoing learning journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrolledCourses.length > 0 ? (
                  enrolledCourses.map((course) => {
                    const progress = userProgressData.find((p) => p.courseId === course.id)
                    const detailedCourse = getCourseById(course.id)

                    return (
                      <div
                        key={course.id}
                        className="rounded-xl border border-border/50 bg-background/70 p-4 backdrop-blur-sm transition-colors hover:bg-background/90"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">{course.description}</p>
                          </div>
                          <Badge variant="outline" className="border-emerald-200 text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-300">
                            {course.level}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
                            <div className="flex items-center gap-2">
                              <Progress value={progress?.overallProgress ?? 0} className="h-2 w-32" />
                              <span className="text-sm font-medium text-foreground">{progress?.overallProgress ?? 0}%</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {progress?.completedLessons.length ?? 0} / {course.totalLessons} lessons
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-end">
                          <div className="flex gap-3">
                            <Link href={`/courses/${course.id}`}>
                              <Button variant="outline" size="sm" className="px-4">
                                View Course
                              </Button>
                            </Link>
                            <Link href={
                              progress?.currentLesson 
                                ? `/courses/${course.id}/lessons/${progress.currentLesson}`
                                : `/courses/${course.id}`
                            }>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 px-4">
                                <Play className="mr-2 h-4 w-4" />
                                Continue
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 bg-gradient-to-br from-emerald-50/50 to-blue-50/50 dark:from-emerald-950/20 dark:to-blue-950/20 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                      <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-foreground">Start Your Learning Journey</h3>
                    <p className="mb-6 text-sm text-muted-foreground">
                      Discover our comprehensive courses designed specifically for Pakistani investors
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <Link href="/courses?filter=beginner">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                          <Target className="mr-2 h-4 w-4" />
                          Start with Basics
                        </Button>
                      </Link>
                      <Link href="/courses">
                        <Button variant="outline">
                          <BookOpen className="mr-2 h-4 w-4" />
                          Browse All Courses
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your learning progress over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="mt-2 h-2 w-2 rounded-full bg-emerald-500"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.course}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatTimeAgo(activity.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Courses Section */}
          {recommendedCourses.length > 0 && (
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Star className="h-5 w-5 text-amber-500" />
                    Recommended for You
                  </CardTitle>
                  <CardDescription>Courses to advance your trading knowledge</CardDescription>
                </div>
                <Link href="/courses">
                  <Button variant="outline" size="sm">
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {recommendedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="group rounded-xl border border-border/50 bg-background/70 p-4 md:p-5 backdrop-blur-sm transition-all hover:border-emerald-200 hover:bg-background/90 hover:shadow-md flex flex-col h-full"
                    >
                      <div className="mb-3 md:mb-4 flex items-start justify-between">
                        <Badge variant="outline" className="border-emerald-200 text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-300 text-xs md:text-sm">
                          {course.level}
                        </Badge>
                        <div className="text-right">
                          <div className="text-sm md:text-base font-semibold text-foreground">
                            {course.price > 0 ? `Rs. ${course.price}` : 'Free'}
                          </div>
                          <div className="text-xs md:text-sm text-muted-foreground">
                            {course.duration} min
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="mb-2 md:mb-3 line-clamp-2 text-lg md:text-xl font-semibold text-foreground group-hover:text-emerald-600">
                        {course.title}
                      </h3>
                      <p className="mb-3 md:mb-4 line-clamp-2 text-sm md:text-base text-muted-foreground flex-grow">
                        {course.description}
                      </p>
                      
                      <div className="mb-3 md:mb-4 flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
                          {course.totalLessons} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 md:h-4 md:w-4" />
                          {course.totalStudents} students
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 md:h-4 md:w-4 fill-amber-400 text-amber-400" />
                          {course.rating}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full h-9 text-xs sm:text-sm font-medium">
                            Preview
                          </Button>
                        </Link>
                        <Link href={`/courses/${course.id}`} className="flex-1">
                          <Button size="sm" className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm font-medium">
                            {course.price > 0 ? 'Enroll' : 'Start'}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Lessons */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Next Lessons</CardTitle>
              <CardDescription>Continue your learning path</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingLessons.map((lesson) => (
                <Link key={lesson.id} href={`/courses/${lesson.course.toLowerCase().replace(/\s+/g, '-')}/lessons/${lesson.id}`}>
                  <div className="flex items-start space-x-3 rounded-lg border border-border/50 bg-background/70 p-3 backdrop-blur-sm transition-all hover:border-emerald-200 hover:bg-background/90 hover:shadow-sm cursor-pointer group">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-emerald-200 dark:bg-emerald-500/15 dark:group-hover:bg-emerald-500/25 transition-colors">
                      {lesson.type === "video" ? (
                        <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-emerald-600">
                        {lesson.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">{lesson.course}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{lesson.duration} min</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              <div className="grid gap-2">
                <Link href="/courses">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Browse All Courses
                  </Button>
                </Link>
                <Link href="/progress">
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Progress
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Learning Streak */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Trophy className="h-5 w-5 text-amber-500" />
                Learning Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="mb-2 text-3xl font-bold text-foreground">7</div>
                <p className="mb-4 text-sm text-muted-foreground">Days in a row</p>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                  Great job!
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/courses">
                <Button variant="outline" className="w-full justify-start hover:bg-emerald-50 hover:border-emerald-200">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explore Courses
                </Button>
              </Link>
              <Link href="/courses?filter=beginner">
                <Button variant="outline" className="w-full justify-start hover:bg-blue-50 hover:border-blue-200">
                  <Target className="mr-2 h-4 w-4" />
                  Beginner Courses
                </Button>
              </Link>
              <Link href="/dashboard/profile">
                <Button variant="outline" className="w-full justify-start hover:bg-gray-50 hover:border-gray-200">
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

