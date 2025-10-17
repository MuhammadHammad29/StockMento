/**
 * Admin Dashboard Page
 * 
 * Main administrative interface for StockMento platform.
 * Displays key metrics, recent activity, and quick action buttons.
 * Provides overview of users, courses, lessons, and system status.
 */

"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  TrendingUp,
  Users,
  BookOpen,
  PlayCircle,
  BarChart3,
  FileText,
  LogOut,
  Menu,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { mockUsers, mockCourses, mockUserProgress, mockLessons } from "@/lib/mock-data"
import { useAdminAuth } from "@/lib/admin-auth-context"
import Logo from "@/components/ui/logo"

export default function AdminDashboard() {
  const { adminUser, adminLogout } = useAdminAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70 overflow-hidden">
        <div className="mx-auto flex h-12 sm:h-14 lg:h-16 max-w-7xl items-center justify-between px-2 sm:px-3 lg:px-8">
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 min-w-0 flex-1">
            <div className="flex items-center space-x-1 min-w-0">
              <Logo size="sm" className="sm:hidden" />
              <Logo size="md" className="hidden sm:block" />
              <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs flex-shrink-0">Admin</Badge>
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center space-x-2 lg:space-x-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:block">Welcome, {adminUser?.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={adminLogout}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </Button>
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarImage src="/admin-avatar.png" />
              <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                {adminUser?.name?.charAt(0) || "AD"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Mobile Menu */}
          <div className="flex items-center space-x-2 sm:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 h-8 w-8">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <SheetHeader className="border-b pb-4">
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/admin-avatar.png" />
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
                    href="/admin/courses" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Manage Courses
                  </Link>
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
      </nav>

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
          {[
            {
              label: "Total Users",
              value: stats.totalUsers.toLocaleString(),
              change: "+12% from last month",
              icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-emerald-500" />,
            },
            {
              label: "Active Users",
              value: stats.activeUsers.toLocaleString(),
              change: "+5% this week",
              icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-blue-500" />,
            },
            {
              label: "Published Courses",
              value: stats.publishedCourses.toLocaleString(),
              change: `${stats.totalCourses} total courses`,
              icon: <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-purple-500" />,
            },
            {
              label: "Avg. Completion",
              value: `${stats.avgCompletionRate}%`,
              change: "Across all learners",
              icon: <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-amber-500" />,
            },
          ].map((item) => (
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
                      {React.cloneElement(item.icon, { 
                        className: "h-3 w-3 sm:h-4 sm:w-4 lg:h-6 lg:w-6 " + item.icon.props.className.split(' ').slice(-1)[0]
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
                <div className="space-y-2 sm:space-y-2.5 lg:space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-2 sm:space-x-2.5 lg:space-x-4 rounded-lg border border-border/40 bg-background/70 p-2 sm:p-2.5 lg:p-3 backdrop-blur-sm"
                    >
                      <Avatar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-10 lg:w-10 flex-shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                          {activity.user
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-xs sm:text-sm lg:text-base truncate">{activity.user}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.action}</p>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0 hidden xs:block">{activity.time}</div>
                    </div>
                  ))}
                </div>
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
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-1.5 sm:gap-2">
                      <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
                        <Avatar className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex-shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
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
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-foreground text-base sm:text-lg lg:text-xl">Recent Enrollments</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest course enrollments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-2.5 lg:space-y-3 p-2 sm:p-3 lg:p-6">
                {[
                  { course: "PSX Fundamentals", student: "Ahmed Khan", time: "2 hours ago", level: "Beginner" },
                  { course: "Technical Analysis", student: "Fatima Ali", time: "4 hours ago", level: "Intermediate" },
                  { course: "Risk Management", student: "Hassan Ahmed", time: "6 hours ago", level: "Advanced" },
                  { course: "Portfolio Building", student: "Ayesha Khan", time: "8 hours ago", level: "Intermediate" },
                ].map((enrollment, index) => (
                  <div key={index} className="flex items-center justify-between gap-1.5 sm:gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{enrollment.course}</p>
                      <p className="text-xs text-muted-foreground truncate">{enrollment.student} • {enrollment.time}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs capitalize flex-shrink-0"
                    >
                      {enrollment.level}
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








