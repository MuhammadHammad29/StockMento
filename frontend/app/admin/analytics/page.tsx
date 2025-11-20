"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  BookOpen,
  Target,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { AdminNavbar } from "@/components/navigation"
import { analyticsApi } from "@/lib/api"
import type { AdminDashboardSummary } from "@/lib/types"

const EMPTY_STATS: AdminDashboardSummary["stats"] = {
  totalUsers: 0,
  activeUsers: 0,
  totalCourses: 0,
  publishedCourses: 0,
  totalLessons: 0,
  totalSections: 0,
  avgCompletionRate: 0,
  completedEnrollments: 0,
  activeEnrollments: 0,
  completionRate: 0,
  totalEnrollments: 0,
}

export default function AdminAnalyticsPage() {
  const { adminUser } = useAdminAuth()
  void adminUser

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setIsLoading(true)
      try {
        const data = await analyticsApi.getDashboardStats()
        if (mounted) {
          setSummary(data)
          setError(null)
        }
      } catch (err) {
        console.error("Failed to load analytics", err)
        if (mounted) {
          setError("Unable to load analytics right now.")
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const stats = summary?.stats ?? EMPTY_STATS
  const recentActivity = useMemo(() => summary?.recentActivity ?? [], [summary])
  const recentEnrollments = useMemo(() => summary?.recentEnrollments ?? [], [summary])

  const metrics = useMemo(() => {
    return {
      totalEnrollments: stats.totalEnrollments,
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      totalCourses: stats.totalCourses,
      publishedCourses: stats.publishedCourses,
      completedEnrollments: stats.completedEnrollments,
      activeEnrollments: stats.activeEnrollments,
      enrollmentCompletionRate: stats.completionRate,
      avgCompletionRate: stats.completionRate,
      totalLessons: stats.totalLessons,
      totalSections: stats.totalSections,
    }
  }, [stats])

  const topCourses = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        students: number
        completed: number
        level: string | null
      }
    >()

    recentEnrollments.forEach((enrollment) => {
      const entry = map.get(enrollment.courseTitle) ?? {
        name: enrollment.courseTitle,
        students: 0,
        completed: 0,
        level: enrollment.level ?? null,
      }

      entry.students += 1
      if (enrollment.status === "completed") {
        entry.completed += 1
      }

      map.set(enrollment.courseTitle, entry)
    })

    return Array.from(map.values())
      .map((course) => ({
        name: course.name,
        students: course.students,
        level: course.level,
        completion: course.students > 0 ? Math.round((course.completed / course.students) * 100) : 0,
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 4)
  }, [recentEnrollments])

  const levelSegments = useMemo(() => {
    const totals = { beginner: 0, intermediate: 0, advanced: 0 }
    recentEnrollments.forEach((enrollment) => {
      if (!enrollment.level) return
      const key = enrollment.level.toLowerCase()
      if (key in totals) {
        totals[key as keyof typeof totals] += 1
      }
    })
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0) || 1
    return [
      { label: "Beginner", value: Math.round((totals.beginner / total) * 100) },
      { label: "Intermediate", value: Math.round((totals.intermediate / total) * 100) },
      { label: "Advanced", value: Math.round((totals.advanced / total) * 100) },
    ]
  }, [recentEnrollments])

  const churnIndicators = useMemo(() => {
    const inactiveRate =
      stats.totalUsers > 0 ? Math.max(0, 100 - (stats.activeUsers / stats.totalUsers) * 100) : 0
    const completionGap = Math.max(0, 100 - stats.avgCompletionRate)
    const idleCourses = Math.max(0, stats.totalCourses - stats.publishedCourses)
    return [
      {
        label: "Inactive Users",
        value: `${inactiveRate.toFixed(1)}%`,
        description: "Users inactive for 14+ days",
      },
      {
        label: "Completion Gap",
        value: `${completionGap.toFixed(1)}%`,
        description: "Difference from 100% completion",
      },
      {
        label: "Unpublished Courses",
        value: idleCourses.toString(),
        description: "Courses waiting for publication",
      },
    ]
  }, [stats])

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

        {error && (
          <Card className="mb-4 border border-destructive/30 bg-destructive/10 text-destructive">
            <CardContent className="py-3 text-sm">{error}</CardContent>
          </Card>
        )}

        <div className="mb-4 sm:mb-6 lg:mb-8 grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Total Enrollments",
              value: metrics.totalEnrollments.toLocaleString(),
              subtitle: "Across all courses",
              icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-emerald-500" />,
            },
            {
              title: "Active Enrollments",
              value: metrics.activeEnrollments.toLocaleString(),
              subtitle: "Currently in progress",
              icon: <Activity className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-500" />,
            },
            {
              title: "Completed Enrollments",
              value: metrics.completedEnrollments.toLocaleString(),
              subtitle: "Total enrollments finished",
              icon: <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-purple-500" />,
            },
            {
              title: "Enrollment Completion Rate",
              value: `${metrics.avgCompletionRate}%`,
              subtitle: "% of active enrollments finished",
              icon: <Target className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-amber-500" />,
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
                  <div className="flex-shrink-0 ml-2">{item.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-foreground text-lg sm:text-xl">Top Courses</CardTitle>
                <CardDescription className="text-sm">Performance based on recent enrollments</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-4 space-y-2">
                {topCourses.length > 0 ? (
                  topCourses.map((course) => (
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
                      <p className="mt-2 text-xs text-muted-foreground">Level: {course.level ?? "N/A"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? "Loading course data..." : "No recent enrollment data"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-foreground text-lg sm:text-xl">Learning Patterns</CardTitle>
                <CardDescription className="text-sm">Signals from live platform data</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-4">
                <div className="grid gap-3 sm:gap-4 text-sm text-muted-foreground grid-cols-1 sm:grid-cols-2">
                  {[ 
                    {
                      pattern: "Recent Activity",
                      value: `${recentActivity.length}`,
                      description: "Engagement events tracked",
                      icon: <Activity className="h-4 w-4 text-emerald-500" />,
                    },
                    {
                      pattern: "New Enrollments",
                      value: `${recentEnrollments.length}`,
                      description: "Learners joined recently",
                      icon: <Users className="h-4 w-4 text-blue-500" />,
                    },
                    {
                      pattern: "Published Lessons",
                      value: metrics.totalLessons.toLocaleString(),
                      description: "Learning units available",
                      icon: <Layers className="h-4 w-4 text-purple-500" />,
                    },
                    {
                      pattern: "Avg Completion",
                      value: `${metrics.avgCompletionRate}%`,
                      description: "Overall course progress",
                      icon: <CheckCircle2 className="h-4 w-4 text-amber-500" />,
                    },
                  ].map((item) => (
                    <div
                      key={item.pattern}
                      className="rounded-lg border border-border/40 bg-background/70 p-3 sm:p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground text-sm flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                            {item.icon}
                          </span>
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
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-foreground">Learner Segments</CardTitle>
                <CardDescription>Engagement by experience level</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-4 space-y-2">
                {levelSegments.map((segment) => (
                  <div key={segment.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{segment.label}</span>
                      <span className="text-muted-foreground">{segment.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${segment.value}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-foreground">Churn Indicators</CardTitle>
                <CardDescription>Monitor potential drop-offs</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-4 space-y-2">
                {churnIndicators.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/40 bg-background/70 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-foreground">Course Performance Insights</CardTitle>
                <CardDescription>Key effectiveness indicators</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-4 space-y-2">
                {topCourses.length > 0 ? (
                  [
                    {
                      metric: "Highest Completion",
                      value: `${topCourses[0].completion}%`,
                      detail: topCourses[0].name,
                    },
                    {
                      metric: "Most Enrollments",
                      value: `${topCourses[0].students}`,
                      detail: topCourses[0].name,
                    },
                    {
                      metric: "Published Lessons",
                      value: metrics.totalLessons.toLocaleString(),
                      detail: "Across all courses",
                    },
                    {
                      metric: "Published Sections",
                      value: metrics.totalSections.toLocaleString(),
                      detail: "Structured units",
                    },
                  ].map((item) => (
                    <div key={item.metric} className="rounded-lg border border-border/40 bg-background/70 p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                          {item.value}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.metric}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? "Loading performance data..." : "No course insights yet"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
