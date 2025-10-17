"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, BookOpen, Trophy } from "lucide-react"
import { mockUsers, mockCourses, mockUserProgress, mockLessons } from "@/lib/mock-data"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { AdminNavbar } from "@/components/navigation"
import Link from "next/link"

export default function AdminAnalyticsPage() {
  const { adminUser, adminLogout } = useAdminAuth()
  const totalUsers = mockUsers.length
  const activeUsers = mockUsers.filter((user) => user.isActive).length
  const newUsersThisMonth = mockUsers.filter((user) => {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    return user.createdAt > monthAgo
  }).length

  const totalCourses = mockCourses.length
  const totalProgress = mockUserProgress.length
  const completedProgress = mockUserProgress.filter((progress) => progress.overallProgress === 100).length
  const avgCompletionRate = totalProgress > 0 ? (completedProgress / totalProgress) * 100 : 0

  const metrics = {
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    userGrowthRate: totalUsers > 0 ? (newUsersThisMonth / totalUsers) * 100 : 0,
    totalCourses,
    completedCourses: completedProgress,
    avgCompletionRate: Math.round(avgCompletionRate * 10) / 10,
    totalLessons: mockLessons.length,
    avgProgress:
      totalProgress > 0
        ? Math.round((mockUserProgress.reduce((sum, p) => sum + p.overallProgress, 0) / totalProgress) * 10) / 10
        : 0,
  }

  const topCourses = mockCourses
    .map((course) => {
      const enrollments = mockUserProgress.filter((p) => p.courseId === course.id)
      const completed = enrollments.filter((p) => p.overallProgress === 100).length
      const completionRate = enrollments.length > 0 ? (completed / enrollments.length) * 100 : 0

      return {
        name: course.title,
        students: enrollments.length,
        completion: Math.round(completionRate),
        rating: course.rating,
      }
    })
    .sort((a, b) => b.students - a.students)
    .slice(0, 4)

  const userActivity = [
    { month: "Jan", users: Math.round(totalUsers * 0.7), active: Math.round(activeUsers * 0.7) },
    { month: "Feb", users: Math.round(totalUsers * 0.8), active: Math.round(activeUsers * 0.8) },
    { month: "Mar", users: Math.round(totalUsers * 0.85), active: Math.round(activeUsers * 0.85) },
    { month: "Apr", users: Math.round(totalUsers * 0.95), active: Math.round(activeUsers * 0.95) },
    { month: "May", users: totalUsers, active: activeUsers },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <AdminNavbar />

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Analytics Overview</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Key metrics and insights about learner engagement across the StockMento platform.
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="mb-4 sm:mb-6 lg:mb-8 grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Total Users",
              value: metrics.totalUsers.toLocaleString(),
              subtitle: `${metrics.userGrowthRate.toFixed(1)}% growth this month`,
              icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-emerald-500" />,
            },
            {
              title: "Active Users",
              value: metrics.activeUsers.toLocaleString(),
              subtitle: `${metrics.newUsersThisMonth} new this month`,
              icon: <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-500" />,
            },
            {
              title: "Courses Completed",
              value: metrics.completedCourses.toLocaleString(),
              subtitle: `${metrics.totalCourses} courses available`,
              icon: <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-purple-500" />,
            },
            {
              title: "Avg Completion",
              value: `${metrics.avgCompletionRate}%`,
              subtitle: "Avg progress %",
              icon: <Trophy className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-amber-500" />,
            },
          ].map((item) => (
            <Card key={item.title} className="border border-border/60 bg-card/90 shadow-sm dark:shadow-none">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.title}</p>
                    <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground">{item.value}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300 truncate">{item.subtitle}</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {item.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4 sm:space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">Top Courses</CardTitle>
                <CardDescription>Most popular by enrollment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topCourses.map((course) => (
                  <div
                    key={course.name}
                    className="rounded-lg border border-border/40 bg-background/70 p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{course.name}</p>
                        <p className="text-xs text-muted-foreground">{course.students} enrolled</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                        {course.completion}% completion
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Rating: {course.rating.toFixed(1)} / 5</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-foreground text-lg sm:text-xl">Learning Patterns</CardTitle>
                <CardDescription className="text-sm">When and how students learn best</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-3 sm:gap-4 text-sm text-muted-foreground grid-cols-1 sm:grid-cols-2">
                  {[
                    {
                      pattern: "Peak Hours",
                      value: "7-9 PM",
                      description: "Most active learning time",
                      icon: "🕰️"
                    },
                    {
                      pattern: "Preferred Days", 
                      value: "Weekends",
                      description: "40% more activity",
                      icon: "📅"
                    },
                    {
                      pattern: "Session Length",
                      value: "25 mins",
                      description: "Average study session",
                      icon: "⏱️"
                    },
                    {
                      pattern: "Content Type Preferences",
                      value: "Video 45%",
                      description: "Most completed content type",
                      icon: "🎥"
                    }
                  ].map((item) => (
                    <div
                      key={item.pattern}
                      className="rounded-lg border border-border/40 bg-background/70 p-3 sm:p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground text-sm flex items-center gap-2">
                          <span>{item.icon}</span>
                          {item.pattern}
                        </span>
                        <Badge className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200 text-xs">
                          {item.value}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">Learner Segments</CardTitle>
                <CardDescription>Engagement by experience level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Beginner", value: 45, trend: "+6%", tone: "emerald" },
                  { label: "Intermediate", value: 32, trend: "+3%", tone: "blue" },
                  { label: "Advanced", value: 23, trend: "-1%", tone: "red" },
                ].map((segment) => (
                  <div key={segment.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{segment.label}</span>
                      <span
                        className={
                          segment.tone === "red"
                            ? "text-red-500"
                            : segment.tone === "blue"
                            ? "text-blue-500"
                            : "text-emerald-500"
                        }
                      >
                        {segment.trend}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${segment.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">Churn Indicators</CardTitle>
                <CardDescription>Monitor potential drop-offs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Inactive Users",
                    value: `${(100 - (metrics.activeUsers / Math.max(metrics.totalUsers, 1)) * 100).toFixed(1)}%`,
                    tone: "amber",
                    description: "Users inactive for 14+ days",
                  },
                  {
                    label: "Low Completion",
                    value: `${Math.max(0, 100 - metrics.avgCompletionRate)}%`,
                    tone: "red",
                    description: "Courses with <40% completion",
                  },
                  {
                    label: "Low Engagement Content",
                    value: "23%",
                    tone: "red",
                    description: "Risk Assessment Quiz completion rate",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/40 bg-background/70 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <span
                        className="text-sm font-semibold"
                      >
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">Course Performance Insights</CardTitle>
                <CardDescription>Key course effectiveness indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    metric: "Highest Quiz Pass Rate",
                    value: "92%",
                    detail: "Technical Analysis",
                    icon: "📈"
                  },
                  {
                    metric: "Most Engaging Course",
                    value: "4.8/5",
                    detail: "PSX Fundamentals",
                    icon: "🎯"
                  },
                  {
                    metric: "Fastest Completion",
                    value: "3.2 days",
                    detail: "Risk Management",
                    icon: "⚡"
                  },
                  {
                    metric: "Course Reviews",
                    value: "45",
                    detail: "This Month",
                    icon: "💬"
                  },
                ].map((item) => (
                  <div key={item.metric} className="rounded-lg border border-border/40 bg-background/70 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{item.icon}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                        {item.value}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{item.metric}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
