/**
 * User Dashboard Page
 * 
 * Personal dashboard for logged-in users showing their learning progress,
 * enrolled courses, achievements, and recent activity. Includes navigation
 * to continue learning, view certificates, and manage profile settings.
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { mockCourses, mockUserProgress, getUserCourses, getCourseById } from "@/lib/mock-data"
import { formatTimeAgo, getActivitySummary } from "@/lib/data-utils"

export default function DashboardPage() {
  const { user } = useAuth()

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

          <nav className="hidden items-center space-x-8 md:flex">
            <Link href="/courses" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Courses
            </Link>
            <Link href="/case-studies" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Case Studies
            </Link>
            <Link href="/progress" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Progress
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300">
              <Bell className="h-5 w-5" />
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
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card className="border border-border/60 bg-card/90">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold text-foreground">Welcome back, {user.firstName}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track your progress and continue learning about the Pakistan Stock Exchange.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                {activitySummary.totalCourses} active courses
              </Badge>
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
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
                            <div className="flex items-center gap-2">
                              <Progress value={progress?.overallProgress ?? 0} className="h-2 w-40" />
                              <span className="text-sm text-foreground">{progress?.overallProgress ?? 0}%</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {progress?.completedLessons.length ?? 0} / {course.totalLessons} lessons
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {progress?.completedQuizzes.length ?? 0} / {course.totalQuizzes} quizzes
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                          <span>Last accessed {progress?.lastAccessedAt ? formatTimeAgo(progress.lastAccessedAt) : "Never"}</span>
                          {detailedCourse?.duration && (
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {detailedCourse.duration} min
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
                    <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-medium text-foreground">No courses enrolled yet</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Start your learning journey with our beginner-friendly courses
                    </p>
                    <Link href="/courses">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                        Browse Courses
                      </Button>
                    </Link>
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
                <div
                  key={lesson.id}
                  className="flex items-start space-x-3 rounded-lg border border-border/50 bg-background/70 p-3 backdrop-blur-sm transition-colors hover:bg-background/90"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
                    {lesson.type === "video" ? (
                      <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-sm font-medium text-foreground">{lesson.title}</h4>
                    <p className="text-xs text-muted-foreground">{lesson.course}</p>
                    <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{lesson.duration} min</span>
                    </div>
                  </div>
                </div>
              ))}

              <Link href="/courses">
                <Button variant="outline" className="w-full">
                  View All Courses
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
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
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Courses
                </Button>
              </Link>
              <Link href="/case-studies">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Case Studies
                </Button>
              </Link>
              <Link href="/dashboard/profile">
                <Button variant="outline" className="w-full justify-start">
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

