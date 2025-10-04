/**
 * Courses Listing Page
 * 
 * Displays all available courses with filtering and search functionality.
 * Shows user enrollment status, progress tracking, and course details.
 * Includes responsive grid layout with course cards and navigation.
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { TrendingUp, BookOpen, Clock, Users, Star, Search, Filter, ChevronRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { mockCourses, getUserCourses, mockUserProgress } from "@/lib/mock-data"
import { calculateCourseProgress } from "@/lib/data-utils"

export default function CoursesPage() {
  const { user } = useAuth()
  
  // Filter and search state management
  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState("All")
  const [durationFilter, setDurationFilter] = useState("All")
  const [priceFilter, setPriceFilter] = useState("All")

  // Get user's enrolled courses and progress data
  const enrolledCourses = user ? getUserCourses(user.id) : []
  const userProgressData = user ? mockUserProgress.filter(p => p.userId === user.id) : []

  // Enhance courses with user-specific progress information
  const coursesWithProgress = useMemo(() => {
    return mockCourses.map(course => {
      const userProgress = userProgressData.find(p => p.courseId === course.id)
      const isEnrolled = enrolledCourses.some(c => c.id === course.id)
      
      return {
        ...course,
        isEnrolled,
        progress: userProgress ? calculateCourseProgress(
          course.id,
          userProgress.completedLessons,
          userProgress.completedQuizzes,
          course.totalLessons,
          0 // quizzes count - will be updated when quiz data is available
        ) : 0,
        enrollmentCount: course.enrollmentCount || Math.floor(Math.random() * 2000) + 500
      }
    })
  }, [userProgressData, enrolledCourses])

  // Filter courses
  const filteredCourses = useMemo(() => {
    return coursesWithProgress.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.category.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesLevel = levelFilter === "All" || course.level === levelFilter
      
      const matchesDuration = durationFilter === "All" || 
        (durationFilter === "Short" && course.duration <= 120) ||
        (durationFilter === "Medium" && course.duration > 120 && course.duration <= 300) ||
        (durationFilter === "Long" && course.duration > 300)
      
      const matchesPrice = priceFilter === "All" ||
        (priceFilter === "Free" && course.price === 0) ||
        (priceFilter === "Paid" && course.price > 0)
      
      return matchesSearch && matchesLevel && matchesDuration && matchesPrice
    })
  }, [coursesWithProgress, searchQuery, levelFilter, durationFilter, priceFilter])

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
    }
    return `${mins}m`
  }

  const formatPrice = (price: number) => {
    return price === 0 ? "Free" : `PKR ${price.toLocaleString()}`
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "default"
      case "Intermediate": return "secondary"
      case "Advanced": return "destructive"
      default: return "default"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
                <span className="text-xl font-bold text-foreground">StockMento</span>
              </div>
            </div>
            
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-muted-foreground">Welcome, {user.firstName}</span>
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              </div>
            ) : (
              <Link href="/signin">
                <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">All Courses</h1>
          <p className="text-xl text-muted-foreground mb-6">Master the Pakistan Stock Exchange with our comprehensive course library</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-emerald-600">{mockCourses.length}</div>
              <div className="text-sm text-muted-foreground">Total Courses</div>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{enrolledCourses.length}</div>
              <div className="text-sm text-muted-foreground">Enrolled Courses</div>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {userProgressData.filter(p => p.overallProgress === 100).length}
              </div>
              <div className="text-sm text-muted-foreground">Courses Completed</div>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {userProgressData.length > 0 
                  ? Math.round(userProgressData.reduce((acc, p) => acc + p.overallProgress, 0) / userProgressData.length)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Average Progress</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="border border-border/60 bg-card/90 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search courses, instructors, or topics..." 
                  className="pl-10" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="All">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                
                <select
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="All">Any Duration</option>
                  <option value="Short">Short (≤2h)</option>
                  <option value="Medium">Medium (2-5h)</option>
                  <option value="Long">Long (&gt;5h)</option>
                </select>
                
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="All">All Prices</option>
                  <option value="Free">Free</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>
            
            {searchQuery && (
              <div className="mt-4 text-sm text-muted-foreground">
                Found {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <Card className="border border-border/60 bg-card/90 p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search criteria or filters</p>
            <Button 
              onClick={() => {
                setSearchQuery("")
                setLevelFilter("All")
                setDurationFilter("All")
                setPriceFilter("All")
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden group">
                <div className="aspect-video bg-muted/70 relative overflow-hidden">
                  <img
                    src={course.thumbnail || "/placeholder.svg"}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant={getLevelColor(course.level)} className="shadow-sm">
                      {course.level}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-background/90 shadow-sm">
                      {formatPrice(course.price)}
                    </Badge>
                  </div>
                  {course.isEnrolled && (
                    <div className="absolute bottom-3 left-3">
                      <Badge className="bg-emerald-600 text-white shadow-sm">
                        Enrolled
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {course.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDuration(course.duration)}
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {course.totalLessons} lessons
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {course.enrollmentCount}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(course.rating) ? "text-yellow-400 fill-current" : "text-muted-foreground opacity-60"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-muted-foreground">{course.rating}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{course.category}</span>
                  </div>

                  {course.isEnrolled && course.progress > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}

                  <Link href={`/courses/${course.id}`}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 group-hover:shadow-md transition-all">
                      {course.isEnrolled 
                        ? course.progress > 0 
                          ? "Continue Learning" 
                          : "Start Course"
                        : "View Course"
                      }
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More - Hidden for now since we have all courses */}
        {filteredCourses.length > 0 && filteredCourses.length === mockCourses.length && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">You've seen all available courses!</p>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}


