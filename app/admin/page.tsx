/**
 * Admin Dashboard Page
 * 
 * Main administrative interface for StockMento platfo            <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-8">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 flex-shrink-0" />
              <span className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">StockMento</span>
              <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs flex-shrink-0">Admin</Badge>
            </div>
          </div>assName="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <span className="text-lg sm:text-xl font-bold text-foreground">StockMento</span>
              <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300">Admin</Badge>
            </div>
          </div>ement.
 * Displays key metrics, rece            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-border/40 text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>vity, and quick action buttons.
 * Provides overview of users, courses, lessons, and system status.
 */

"use client"

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
  Settings,
  Bell,
  FileText,
  LogOut,
  Menu,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { mockUsers, mockCourses, mockUserProgress, mockLessons } from "@/lib/mock-data"
import { useAdminAuth } from "@/lib/admin-auth-context"

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-8">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 flex-shrink-0" />
              <span className="text-sm sm:text-lg lg:text-xl font-bold text-foreground truncate">StockMento</span>
              <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs flex-shrink-0">Admin</Badge>
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center space-x-2 lg:space-x-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:block">Welcome, {adminUser?.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300 p-2"
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300 p-2"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
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
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300 h-8 w-8"
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>
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
                    href="/admin/users" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="h-4 w-4" />
                    Manage Users
                  </Link>
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

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your educational platform</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4">
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
            <Card key={item.label} className="border border-border/60 bg-card/90 shadow-sm dark:shadow-none">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{item.value}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300 truncate">{item.change}</p>
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
          {/* Overview */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
                  <BarChart3 className="h-5 w-5 text-emerald-500" />
                  Platform Overview
                </CardTitle>
                <CardDescription className="text-sm">Snapshot of current performance</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:gap-6 md:grid-cols-2 p-4 sm:p-6">
                <div className="rounded-xl border border-border/50 bg-background/70 p-3 sm:p-4 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                  <div className="mt-2 text-xl sm:text-2xl font-semibold text-foreground">{stats.totalLessons}</div>
                  <p className="text-xs text-muted-foreground">Across all published courses</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/70 p-3 sm:p-4 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground">Active Learners</p>
                  <div className="mt-2 text-xl sm:text-2xl font-semibold text-foreground">{stats.activeUsers}</div>
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
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-foreground text-lg sm:text-xl">Recent Activity</CardTitle>
                <CardDescription className="text-sm">Latest user actions on the platform</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 sm:space-x-4 rounded-lg border border-border/40 bg-background/70 p-3 backdrop-blur-sm"
                    >
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs sm:text-sm">
                          {activity.user
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">{activity.user}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{activity.action}</p>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-foreground text-lg sm:text-xl">Recent Users</CardTitle>
                <CardDescription className="text-sm">Newly registered users</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                        className="text-xs capitalize flex-shrink-0 ml-2"
                      >
                        {user.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link href="/admin/users">
                  <Button variant="outline" className="mt-3 sm:mt-4 w-full text-sm">
                    View All Users
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/90">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-foreground text-lg sm:text-xl">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6">
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








