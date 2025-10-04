import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, BookOpen, Trophy, TrendingDown, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { mockUsers, mockCourses, mockUserProgress, mockLessons } from "@/lib/mock-data"

export default function AdminAnalyticsPage() {
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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-foreground">StockMento</span>
              <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300">Admin</Badge>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">Analytics</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <Button variant="outline" className="gap-2 bg-background/60">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Analytics Overview</h1>
          <p className="text-muted-foreground">
            Key metrics and insights about learner engagement across the StockMento platform.
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Total Users",
              value: metrics.totalUsers.toLocaleString(),
              subtitle: `${metrics.userGrowthRate.toFixed(1)}% growth this month`,
              icon: <Users className="h-8 w-8 text-emerald-500" />,
            },
            {
              title: "Active Users",
              value: metrics.activeUsers.toLocaleString(),
              subtitle: `${metrics.newUsersThisMonth} new this month`,
              icon: <TrendingUp className="h-8 w-8 text-blue-500" />,
            },
            {
              title: "Courses Completed",
              value: metrics.completedCourses.toLocaleString(),
              subtitle: `${metrics.totalCourses} courses available`,
              icon: <BookOpen className="h-8 w-8 text-purple-500" />,
            },
            {
              title: "Avg Completion",
              value: `${metrics.avgCompletionRate}%`,
              subtitle: "Avg progress %",
              icon: <Trophy className="h-8 w-8 text-amber-500" />,
            },
          ].map((item) => (
            <Card key={item.title} className="border border-border/60 bg-card/90 shadow-sm dark:shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-3xl font-bold text-foreground">{item.value}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300">{item.subtitle}</p>
                  </div>
                  {item.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">Monthly User Activity</CardTitle>
                <CardDescription>Comparison of total vs active users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                  {userActivity.map((point) => (
                    <div
                      key={point.month}
                      className="rounded-lg border border-border/40 bg-background/70 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{point.month}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                          Active
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Users</p>
                          <p className="text-xl font-semibold text-foreground">{point.users}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Users</p>
                          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-300">{point.active}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                    label: "Expiring Trials",
                    value: "24 users",
                    tone: "blue",
                    description: "Trial access ending within 7 days",
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
                <CardTitle className="text-foreground">Action Items</CardTitle>
                <CardDescription>Next steps to improve engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    title: "Launch onboarding walkthrough",
                    description: "Increase beginner retention with guided tours",
                    tone: "emerald",
                  },
                  {
                    title: "Add advanced case studies",
                    description: "Provide deeper content for advanced learners",
                    tone: "blue",
                  },
                  {
                    title: "Re-engage inactive users",
                    description: "Send targeted email campaigns to 45 users",
                    tone: "amber",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-border/40 bg-background/70 p-4 backdrop-blur-sm">
                    <Badge
                      className="mb-2 w-fit"
                    >
                      Priority
                    </Badge>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
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
