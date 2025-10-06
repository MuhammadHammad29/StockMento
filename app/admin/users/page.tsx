"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { TrendingUp, Search, Filter, Edit, Trash2, MoreHorizontal, ArrowLeft, LogOut, Menu, Users, BookOpen, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { mockUsers, mockUserProgress, mockCourses } from "@/lib/mock-data"
import { useAdminAuth } from "@/lib/admin-auth-context"

export default function AdminUsersPage() {
  const { adminUser, adminLogout } = useAdminAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Transform real data for admin display
  const adminUsers = mockUsers.map(user => {
    const userProgress = mockUserProgress.filter(progress => progress.userId === user.id)
    const completedCourses = userProgress.filter(progress => progress.overallProgress === 100).length
    const avgProgress = userProgress.length > 0 
      ? Math.round(userProgress.reduce((sum, progress) => sum + progress.overallProgress, 0) / userProgress.length)
      : 0
    
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      joinDate: user.createdAt.toISOString().split('T')[0],
      status: user.isActive ? "active" : "inactive",
      coursesCompleted: completedCourses,
      totalCourses: userProgress.length,
      avgScore: avgProgress,
      lastActive: user.lastLogin ? getTimeAgo(user.lastLogin) : "Never",
      profileImage: user.avatar,
      role: user.role
    }
  })

  function getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`
    
    return `${Math.floor(diffInWeeks / 4)} months ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
              <Link href="/admin" className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 flex-shrink-0" />
                <span className="text-sm sm:text-lg lg:text-xl font-bold text-foreground truncate">StockMento</span>
                <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs flex-shrink-0">Admin</Badge>
              </Link>
              <span className="text-muted-foreground hidden md:inline">/</span>
              <span className="text-muted-foreground hidden md:inline text-sm">Users</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-2 lg:space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={adminLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 p-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
              <Link href="/admin">
                <Button variant="outline" className="flex items-center gap-2 bg-background/60 text-sm">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
            </div>

            {/* Mobile Menu */}
            <div className="sm:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="border-border/40 text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/20 h-8 w-8">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                  <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-3 text-left">
                      <Avatar className="h-8 w-8">
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
                      href="/admin" 
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BarChart3 className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20">
                      <Users className="h-4 w-4" />
                      Manage Users
                    </div>
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
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage StockMento user accounts and permissions</p>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-4 sm:mb-6 border border-border/60 bg-card/90">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row lg:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users by name or email..." className="pl-10 text-sm" />
              </div>
              <div className="flex flex-row sm:flex-row gap-2">
                <Button variant="outline" className="flex items-center gap-2 bg-background/60 text-xs sm:text-sm flex-1 sm:flex-none">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Status</span>
                  <span className="sm:hidden">Status</span>
                </Button>
                <Button variant="outline" className="flex items-center gap-2 bg-background/60 text-xs sm:text-sm flex-1 sm:flex-none">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Date</span>
                  <span className="sm:hidden">Date</span>
                </Button>
                <Button variant="outline" className="flex items-center gap-2 bg-background/60 text-xs sm:text-sm flex-1 sm:flex-none">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Activity</span>
                  <span className="sm:hidden">Activity</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table/Cards */}
        <Card className="border border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>All Users ({adminUsers.length})</CardTitle>
            <CardDescription>Manage and monitor user accounts</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Progress</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Active</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">Joined {user.joinDate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={
                            user.status === "active"
                              ? "default"
                              : user.status === "inactive"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium">{user.coursesCompleted} courses completed</p>
                          <p className="text-xs text-muted-foreground">Avg score: {user.avgScore}%</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-muted-foreground">{user.lastActive}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" className="bg-transparent">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-transparent text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="bg-transparent">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-3 sm:space-y-4">
              {adminUsers.map((user) => (
                <Card key={user.id} className="border border-border/40 bg-card/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                          <AvatarFallback className="text-xs sm:text-sm">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm sm:text-base truncate">{user.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          user.status === "active"
                            ? "default"
                            : user.status === "inactive"
                              ? "secondary"
                              : "destructive"
                        }
                        className="flex-shrink-0 ml-2 text-xs"
                      >
                        {user.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm mb-3 sm:mb-4">
                      <div>
                        <p className="text-muted-foreground text-xs">Joined</p>
                        <p className="font-medium text-xs sm:text-sm">{user.joinDate}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Last Active</p>
                        <p className="font-medium text-xs sm:text-sm truncate">{user.lastActive}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Courses</p>
                        <p className="font-medium text-xs sm:text-sm">{user.coursesCompleted} completed</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Avg Score</p>
                        <p className="font-medium text-xs sm:text-sm">{user.avgScore}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/40">
                      <Button size="sm" variant="outline" className="bg-transparent text-xs sm:text-sm">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border/40">
              <p className="text-sm text-muted-foreground">Showing 1-5 of 2,847 users</p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled className="bg-transparent">
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="bg-emerald-600 text-white">
                  1
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent">
                  2
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent">
                  3
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent">
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



