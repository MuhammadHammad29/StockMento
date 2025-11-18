/**
 * Admin Dashboard Page
 *
 * Main administrative interface for StockMento platform.
 * Displays key metrics, recent activity, and quick action buttons.
 * Provides overview of users, courses, lessons, and system status.
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  BookOpen,
  BarChart3,
  FileText,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useAdminAuth } from "@/lib/admin-auth-context"
import AdminNavbar from "@/components/navigation/AdminNavbar"
import { analyticsApi } from "@/lib/api"
import { formatTimeAgo } from "@/lib/data-utils"
import type { AdminDashboardSummary } from "@/lib/types"

const EMPTY_STATS: AdminDashboardSummary["stats"] = {
  totalUsers: 0,
  activeUsers: 0,
  totalCourses: 0,
  publishedCourses: 0,
  totalLessons: 0,
  totalSections: 0,
  avgCompletionRate: 0,
}

export default function AdminDashboard() {
  const { adminUser, adminLogout } = useAdminAuth()
  void adminUser
  void adminLogout

  const [dashboardData, setDashboardData] = useState<AdminDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      setIsLoading(true)
      try {
        const data = await analyticsApi.getDashboardStats()
        if (mounted) {
          setDashboardData(data)
          setError(null)
        }
      } catch (err) {
        console.error("Failed to load admin dashboard metrics", err)
        if (mounted) {
          setError("Unable to load dashboard metrics right now.")
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()
    return () => {
      mounted = false
    }
  }, [])

  const stats = dashboardData?.stats ?? EMPTY_STATS

  const recentUsers = dashboardData?.recentUsers ?? []
  const recentActivity = dashboardData?.recentActivity ?? []
  const recentEnrollments = dashboardData?.recentEnrollments ?? []

  const statsCards = useMemo(
    () => [
      {
        label: "Total Users",
        value: stats.totalUsers.toLocaleString(),
        change: `${stats.activeUsers.toLocaleString()} active`,
        Icon: Users,
        iconClass: "text-emerald-500",
      },
      {
        label: "Active Users",
        value: stats.activeUsers.toLocaleString(),
        change: `Out of ${stats.totalUsers.toLocaleString()}`,
        Icon: Users,
        iconClass: "text-blue-500",
      },
      {
        label: "Published Courses",
        value: stats.publishedCourses.toLocaleString(),
        change: `${(stats.totalCourses - stats.publishedCourses).toLocaleString()} drafts`,
        Icon: BookOpen,
        iconClass: "text-purple-500",
      },
      {
        label: "Avg. Completion",
        value: `${stats.avgCompletionRate}%`,
        change: "Across all enrollments",
        Icon: BarChart3,
        iconClass: "text-amber-500",
      },
    ],
    [stats],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 overflow-hidden">
      <AdminNavbar />

      <div className="mx-auto max-w-7xl px-1.5 py-2 sm:px-3 sm:py-4 lg:px-8 lg:py-8 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="mb-3 sm:mb-4 lg:mb-8 flex flex-col gap-1 sm:gap-2 lg:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-3xl font-bold text-foreground truncate">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground truncate">Manage your platform</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-3 sm:mb-4 lg:mb-8 grid gap-1.5 sm:gap-2 lg:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((item) => {
            const IconComponent = item.Icon
            return (
              <Card key={item.label} className="border border-border/60 bg-card/90 shadow-sm dark:shadow-none min-w-0">
                <CardContent className="p-1.5 sm:p-2 lg:p-6">
                  <div className="flex items-center justify-between gap-1 sm:gap-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                      <p className="text-sm sm:text-base lg:text-xl font-bold text-foreground truncate">{item.value}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-300 truncate">{item.change}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 flex items-center justify-center">
                        <IconComponent className={`h-3 w-3 sm:h-4 sm:w-4 lg:h-6 lg:w-6 ${item.iconClass}`} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <div className="grid gap-2 sm:gap-3 lg:gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Overview */}
          <div className="space-y-2 sm:space-y-3 lg:space-y-6 order-1 min-w-0">
            <Card className="border border-border/60 bg-card/90 min-w-0">
              <CardHeader className="p-2 sm:p-3 lg:p-6">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-foreground text-sm sm:text-base lg:text-xl min-w-0">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0" />
                  <span className="truncate">Platform Overview</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm truncate">Snapshot of current performance</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-1.5 sm:gap-2 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 p-1.5 sm:p-2 lg:p-6">
                <div className="rounded-xl border border-border/50 bg-background/70 p-1.5 sm:p-2 lg:p-4 backdrop-blur-sm min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Total Lessons</p>
                  <div className="mt-1 text-sm sm:text-base lg:text-2xl font-semibold text-foreground">{stats.totalLessons}</div>
                  <p className="text-xs text-muted-foreground truncate">Across all published courses</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/70 p-1.5 sm:p-2 lg:p-4 backdrop-blur-sm min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Active Learners</p>
                  <div className="mt-1 text-sm sm:text-base lg:text-2xl font-semibold text-foreground">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground truncate">Logged in within last 7 days</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg lg:text-xl">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage key platform areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-2.5 lg:space-y-3 p-2 sm:p-3 lg:p-6">
                <Link href="/admin/courses">
                  <Button variant="outline" className="h-auto w-full justify-start bg-background/70 p-2.5 sm:p-3 lg:p-4">
                    <BookOpen className="mr-1.5 sm:mr-2 lg:mr-3 h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-foreground text-xs sm:text-sm lg:text-base">Manage Courses</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">Create, edit, and publish courses</div>
                    </div>
                  </Button>
                </Link>
                <Link href="/admin/analytics">
                  <Button variant="outline" className="h-auto w-full justify-start bg-background/70 p-2.5 sm:p-3 lg:p-4">
                    <BarChart3 className="mr-1.5 sm:mr-2 lg:mr-3 h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-medium text-foreground text-xs sm:text-sm lg:text-base">View Analytics</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">Platform performance metrics</div>
                    </div>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-foreground text-base sm:text-lg lg:text-xl">Recent Activity</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest user actions on the platform</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-3 lg:p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-2 sm:space-y-2.5 lg:space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-2 sm:space-x-2.5 lg:space-x-4 rounded-lg border border-border/40 bg-background/70 p-2 sm:p-2.5 lg:p-3 backdrop-blur-sm"
                      >
                        <Avatar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-10 lg:w-10 flex-shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                            {activity.userName
                              .split(" ")
                              .map((n) => n?.[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-xs sm:text-sm lg:text-base truncate">{activity.userName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.action} · {activity.courseTitle}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0 hidden xs:block">
                          {formatTimeAgo(activity.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> : "No recent activity yet."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-2 sm:space-y-3 lg:space-y-6 order-2 lg:order-2 min-w-0">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-foreground text-base sm:text-lg lg:text-xl">Recent Users</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Newly registered users</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-3 lg:p-6">
                <div className="space-y-2 sm:space-y-2.5 lg:space-y-4">
                  {recentUsers.length > 0 ? (
                    recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between gap-1.5 sm:gap-2">
                        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
                          <Avatar className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex-shrink-0">
                            <AvatarImage src={user.avatarUrl ?? undefined} alt={`${user.name} Avatar`} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                              {user.name
                                .split(" ")
                                .map((n) => n?.[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <Badge
                          variant={user.status === "active" ? "default" : "secondary"}
                          className="text-xs capitalize flex-shrink-0"
                        >
                          {user.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {isLoading ? "Loading users..." : "No recent users"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-foreground text-base sm:text-lg lg:text-xl">Recent Enrollments</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest course enrollments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-2.5 lg:space-y-3 p-2 sm:p-3 lg:p-6">
                {recentEnrollments.length > 0 ? (
                  recentEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between gap-1.5 sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{enrollment.courseTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {enrollment.studentName} · {formatTimeAgo(enrollment.timestamp)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs uppercase flex-shrink-0">
                        {enrollment.level ?? "N/A"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {isLoading ? "Loading enrollments..." : "No recent enrollments"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed bottom-4 right-4 rounded-full bg-background/90 px-3 py-1.5 shadow border text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
          Refreshing dashboard...
        </div>
      )}
    </div>
  )
}
