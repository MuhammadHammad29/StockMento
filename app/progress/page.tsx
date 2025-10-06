"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  TrendingUp,
  BookOpen,
  Trophy,
  Clock,
  Target,
  Calendar,
  BarChart3,
  CheckCircle,
  PlayCircle,
  Lock,
  Star,
  ArrowLeft,
  Menu,
  Bell,
  Settings,
  User,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"

export default function ProgressPage() {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const overallProgress = {
    completedCourses: 3,
    totalCourses: 12,
    completedLessons: 45,
    totalLessons: 120,
    averageScore: 85,
    studyStreak: 12,
    totalStudyTime: 48, // hours
    badgesEarned: 8,
  }

  const courseProgress = [
    {
      id: 1,
      title: "PSX Fundamentals",
      progress: 100,
      status: "completed",
      lessons: { completed: 12, total: 12 },
      quizzes: { completed: 3, total: 3 },
      avgScore: 92,
      timeSpent: 8,
    },
    {
      id: 2,
      title: "Technical Analysis",
      progress: 75,
      status: "in-progress",
      lessons: { completed: 9, total: 12 },
      quizzes: { completed: 2, total: 3 },
      avgScore: 88,
      timeSpent: 12,
    },
    {
      id: 3,
      title: "Fundamental Analysis",
      progress: 60,
      status: "in-progress",
      lessons: { completed: 6, total: 10 },
      quizzes: { completed: 1, total: 2 },
      avgScore: 78,
      timeSpent: 8,
    },
    {
      id: 4,
      title: "Risk Management",
      progress: 0,
      status: "not-started",
      lessons: { completed: 0, total: 8 },
      quizzes: { completed: 0, total: 2 },
      avgScore: 0,
      timeSpent: 0,
    },
  ]

  const achievements = [
    {
      id: 1,
      title: "First Course Complete",
      description: "Completed your first course",
      earned: true,
      date: "2024-01-15",
    },
    { id: 2, title: "Course Achiever", description: "Completed all lessons in a course with 90+ average", earned: true, date: "2024-01-20" },
    { id: 3, title: "Study Streak", description: "Studied for 7 consecutive days", earned: true, date: "2024-01-25" },
    { id: 4, title: "Technical Expert", description: "Complete Technical Analysis course", earned: false, date: null },
    { id: 5, title: "Perfect Student", description: "Get 100% completion on any course", earned: true, date: "2024-01-18" },
    { id: 6, title: "Knowledge Seeker", description: "Complete 5 courses", earned: false, date: null },
  ]

  const weeklyActivity = [
    { day: "Mon", lessons: 3, quizzes: 1, time: 2.5 },
    { day: "Tue", lessons: 2, quizzes: 0, time: 1.8 },
    { day: "Wed", lessons: 4, quizzes: 2, time: 3.2 },
    { day: "Thu", lessons: 1, quizzes: 1, time: 1.5 },
    { day: "Fri", lessons: 3, quizzes: 0, time: 2.1 },
    { day: "Sat", lessons: 5, quizzes: 1, time: 4.0 },
    { day: "Sun", lessons: 2, quizzes: 1, time: 2.3 },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
      case "in-progress":
        return <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-300" />
      default:
        return <Lock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
      default:
        return "bg-muted/60 text-foreground dark:bg-muted/40"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
              <span className="text-lg sm:text-xl font-bold text-foreground">StockMento</span>
            </div>
          </div>
          
          {user ? (
            <div className="flex items-center space-x-4">
              {/* Desktop Navigation */}
              <nav className="hidden items-center space-x-6 md:flex">
                <Link href="/courses" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                  Courses
                </Link>
                <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                  Dashboard
                </Link>
              </nav>

              {/* Desktop User Menu */}
              <div className="hidden items-center space-x-4 md:flex">
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
                        href="/dashboard" 
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link 
                        href="/courses" 
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <BookOpen className="h-4 w-4" />
                        Courses
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
          ) : (
            <Link href="/signin">
              <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">Sign In</Button>
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Learning Progress</h1>
          <p className="text-muted-foreground">Track your journey through PSX education</p>
        </div>

        {/* Overall Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Courses Completed</p>
                  <p className="text-2xl font-bold text-foreground">
                    {overallProgress.completedCourses}/{overallProgress.totalCourses}
                  </p>
                  <div className="mt-2">
                    <Progress
                      value={(overallProgress.completedCourses / overallProgress.totalCourses) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
                <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-foreground">{overallProgress.averageScore}%</p>
                  <div className="flex items-center mt-1">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-muted-foreground">Excellent</span>
                  </div>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Study Streak</p>
                  <p className="text-2xl font-bold text-foreground">{overallProgress.studyStreak} days</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-4 w-4 text-emerald-600 mr-1" />
                    <span className="text-sm text-emerald-600">Keep it up!</span>
                  </div>
                </div>
                <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Study Time</p>
                  <p className="text-2xl font-bold text-foreground">{overallProgress.totalStudyTime}h</p>
                  <div className="flex items-center mt-1">
                    <Clock className="h-4 w-4 text-purple-600 mr-1" />
                    <span className="text-sm text-muted-foreground">This month</span>
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses">Course Progress</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="activity">Weekly Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            <div className="grid gap-6">
              {courseProgress.map((course) => (
                <Card key={course.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(course.status)}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{course.title}</h3>
                          <Badge className={getStatusColor(course.status)}>{course.status.replace("-", " ")}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Overall Progress</span>
                          <span>{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Lessons</p>
                          <p className="font-medium">
                            {course.lessons.completed}/{course.lessons.total}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Quizzes</p>
                          <p className="font-medium">
                            {course.quizzes.completed}/{course.quizzes.total}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Score</p>
                          <p className="font-medium">{course.avgScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time Spent</p>
                          <p className="font-medium">{course.timeSpent}h</p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Link href={`/courses/${course.id}`}>
                          <Button variant="outline" size="sm">
                            {course.status === "completed" ? "Review" : "Continue"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className={achievement.earned ? "border-emerald-200" : "border-border/60"}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full ${achievement.earned ? "bg-emerald-100" : "bg-muted/60 dark:bg-muted/40"}`}>
                        <Trophy className={`h-6 w-6 ${achievement.earned ? "text-emerald-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{achievement.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                        {achievement.earned ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">Earned {achievement.date}</Badge>
                        ) : (
                          <Badge variant="secondary">Not earned yet</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle>Weekly Learning Activity</CardTitle>
                <CardDescription>Your learning activity for the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weeklyActivity.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 text-sm font-medium">{day.day}</div>
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4" />
                            <span>{day.lessons} lessons</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Trophy className="h-4 w-4" />
                            <span>{day.quizzes} quizzes</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{day.time}h</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{day.lessons + day.quizzes} activities</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border border-border/60 bg-card/90">
                <CardHeader>
                  <CardTitle className="text-lg">This Week</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Lessons</span>
                    <span className="font-medium">{weeklyActivity.reduce((sum, day) => sum + day.lessons, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Quizzes</span>
                    <span className="font-medium">{weeklyActivity.reduce((sum, day) => sum + day.quizzes, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Study Time</span>
                    <span className="font-medium">
                      {weeklyActivity.reduce((sum, day) => sum + day.time, 0).toFixed(1)}h
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60 bg-card/90">
                <CardHeader>
                  <CardTitle className="text-lg">Badges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Earned</span>
                    <span className="font-medium">{overallProgress.badgesEarned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="font-medium">{achievements.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completion</span>
                    <span className="font-medium">
                      {Math.round((achievements.filter((a) => a.earned).length / achievements.length) * 100)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


