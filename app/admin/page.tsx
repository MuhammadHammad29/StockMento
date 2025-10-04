/**
 * Admin Dashboard Page
 * 
 * Main administrative interface for StockMento platform management.
 * Displays key metrics, recent activity, and quick action buttons.
 * Provides overview of users, courses, lessons, and system status.
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  TrendingUp,
  Users,
  BookOpen,
  PlayCircle,
  BarChart3,
  Plus,
  Settings,
  Bell,
  FileText,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { mockUsers, mockCourses, mockUserProgress, mockLessons } from "@/lib/mock-data"
import { useAdminAuth } from "@/lib/admin-auth-context"

export default function AdminDashboard() {
  const { adminUser, adminLogout } = useAdminAuth()

  // Calculate dashboard metrics from mock data
  const activeUsers = mockUsers.filter((user) => user.isActive).length
  const totalCourses = mockCourses.length
  const publishedCourses = mockCourses.filter((course) => course.isPublished).length
  const totalLessons = mockLessons.length

  const avgCompletionRate =
    mockUserProgress.length > 0
      ? Math.round(
          mockUserProgress.reduce((sum, progress) => sum + (progress.overallProgress || 0), 0) /
            mockUserProgress.length,
        )
      : 0

  const stats = {
    totalUsers: mockUsers.length,
    activeUsers,
    totalCourses,
    publishedCourses,
    totalLessons,
    avgCompletionRate,
  }

  const recentUsers = mockUsers
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      joinDate: user.createdAt.toISOString().split("T")[0],
      status: user.isActive ? "active" : "inactive",
    }));

  const recentActivity = [
    { id: 1, user: "Ahmed Khan", action: "Completed PSX Fundamentals Lesson", time: "2 hours ago" },
    { id: 2, user: "Fatima Ali", action: "Started Technical Analysis Course", time: "4 hours ago" },
    { id: 3, user: "Muhammad Hassan", action: "Completed Risk Management Quiz", time: "6 hours ago" },
    { id: 4, user: "Ayesha Khan", action: "Finished Video Lesson", time: "8 hours ago" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-foreground">StockMento</span>
              <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300">Admin</Badge>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Welcome, {adminUser?.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={adminLogout}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/admin-avatar.png" />
              <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                {adminUser?.name?.charAt(0) || "AD"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your educational platform</p>
          </div>
          <div className="flex space-x-3">
            <Link href="/admin/courses/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                <Plus className="mr-2 h-4 w-4" />
                Add Course
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Users",
              value: stats.totalUsers.toLocaleString(),
              change: "+12% from last month",
              icon: <Users className="h-8 w-8 text-emerald-500" />,
            },
            {
              label: "Active Users",
              value: stats.activeUsers.toLocaleString(),
              change: "+5% this week",
              icon: <Users className="h-8 w-8 text-blue-500" />,
            },
            {
              label: "Published Courses",
              value: stats.publishedCourses.toLocaleString(),
              change: `${stats.totalCourses} total courses`,
              icon: <BookOpen className="h-8 w-8 text-purple-500" />,
            },
            {
              label: "Avg. Completion",
              value: `${stats.avgCompletionRate}%`,
              change: "Across all learners",
              icon: <BarChart3 className="h-8 w-8 text-amber-500" />,
            },
          ].map((item) => (
            <Card key={item.label} className="border border-border/60 bg-card/90 shadow-sm dark:shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300">{item.change}</p>
                  </div>
                  {item.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Overview */}
          <div className="space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                  Platform Overview
                </CardTitle>
                <CardDescription>Snapshot of current performance</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-background/70 p-4 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{stats.totalLessons}</div>
                  <p className="text-xs text-muted-foreground">Across all published courses</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/70 p-4 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Active Learners</p>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">Logged in within last 7 days</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Manage key platform areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/admin/courses">
                  <Button variant="outline" className="h-auto w-full justify-start bg-background/70 p-4">
                    <BookOpen className="mr-3 h-5 w-5 text-emerald-500" />
                    <div className="text-left">
                      <div className="font-medium text-foreground">Manage Courses</div>
                      <div className="text-sm text-muted-foreground">Create, edit, and publish courses</div>
                    </div>
                  </Button>
                </Link>
                <Link href="/admin/users">
                  <Button variant="outline" className="h-auto w-full justify-start bg-background/70 p-4">
                    <Users className="mr-3 h-5 w-5 text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium text-foreground">Manage Users</div>
                      <div className="text-sm text-muted-foreground">View and update learner accounts</div>
                    </div>
                  </Button>
                </Link>
                <Link href="/admin/analytics">
                  <Button variant="outline" className="h-auto w-full justify-start bg-background/70 p-4">
                    <BarChart3 className="mr-3 h-5 w-5 text-purple-500" />
                    <div className="text-left">
                      <div className="font-medium text-foreground">View Analytics</div>
                      <div className="text-sm text-muted-foreground">Platform performance metrics</div>
                    </div>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Activity</CardTitle>
                <CardDescription>Latest user actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-4 rounded-lg border border-border/40 bg-background/70 p-3 backdrop-blur-sm"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                          {activity.user
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{activity.user}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Users</CardTitle>
                <CardDescription>Newly registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {user.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link href="/admin/users">
                  <Button variant="outline" className="mt-4 w-full">
                    View All Users
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader>
                <CardTitle className="text-foreground">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Server Status", badge: "Online", tone: "emerald" },
                  { label: "Database", badge: "Connected", tone: "emerald" },
                  { label: "Storage", badge: "78% Used", tone: "amber" },
                  { label: "Backup", badge: "Up to Date", tone: "emerald" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <Badge
                      className={
                        item.tone === "emerald"
                          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200"
                          : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200"
                      }
                    >
                      {item.badge}
                    </Badge>
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








