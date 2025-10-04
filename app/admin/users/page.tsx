"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, Search, Filter, Edit, Trash2, MoreHorizontal, ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"
import { mockUsers, mockUserProgress, mockCourses } from "@/lib/mock-data"
import { useAdminAuth } from "@/lib/admin-auth-context"

export default function AdminUsersPage() {
  const { adminUser, adminLogout } = useAdminAuth()
  
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
                <span className="text-xl font-bold text-foreground">StockMento</span>
                <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300">Admin</Badge>
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">Users</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {adminUser?.name}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={adminLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Link href="/admin">
                <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage StockMento user accounts and permissions</p>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border border-border/60 bg-card/90">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users by name or email..." className="pl-10" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                </Button>
                <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                  <Filter className="mr-2 h-4 w-4" />
                  Join Date
                </Button>
                <Button variant="outline" className="flex items-center gap-2 bg-background/60">
                  <Filter className="mr-2 h-4 w-4" />
                  Activity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>All Users ({adminUsers.length})</CardTitle>
            <CardDescription>Manage and monitor user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                    <tr key={user.id} className="border-b hover:bg-muted/40 dark:bg-muted/30 dark:hover:bg-muted/30">
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

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
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



