"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  TrendingUp, 
  ArrowLeft, 
  Edit, 
  Plus, 
  BookOpen, 
  PlayCircle, 
  FileText, 
  Users, 
  Clock, 
  Star,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  Calendar,
  GripVertical,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { mockCourses, mockUserProgress, getLessonsByCourseId } from "@/lib/mock-data"
import { toast } from "@/components/ui/use-toast"

export default function AdminCourseDetailPage({ params }: { params: { id: string } }) {
  const { adminUser } = useAdminAuth()
  const courseId = params.id
  
  // Find the course - in future this will be an API call
  const course = mockCourses.find(c => c.id === courseId)
  const [orderedLessons, setOrderedLessons] = useState(() => {
    const lessons = getLessonsByCourseId(courseId)
    return lessons.sort((a, b) => (a.order || 0) - (b.order || 0))
  })
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null)
  
  // Calculate course stats - in future this will come from database aggregations
  const enrolledUsers = mockUserProgress.filter(p => p.courseId === courseId)
  const completedUsers = enrolledUsers.filter(p => (p.overallProgress || 0) >= 100)
  const completionRate = enrolledUsers.length > 0 ? Math.round((completedUsers.length / enrolledUsers.length) * 100) : 0
  const avgProgress = enrolledUsers.length > 0 
    ? Math.round(enrolledUsers.reduce((sum, p) => sum + (p.overallProgress || 0), 0) / enrolledUsers.length)
    : 0

  // Keyboard shortcuts for lesson reordering
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedLessonIndex === null || orderedLessons.length === 0) return
      
      // Only handle shortcuts if we're focused on the lessons tab and not in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault()
            if (selectedLessonIndex > 0) {
              moveLesson(selectedLessonIndex, 'up')
              setSelectedLessonIndex(selectedLessonIndex - 1)
            }
            break
          case 'ArrowDown':
            e.preventDefault()
            if (selectedLessonIndex < orderedLessons.length - 1) {
              moveLesson(selectedLessonIndex, 'down')
              setSelectedLessonIndex(selectedLessonIndex + 1)
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLessonIndex, orderedLessons.length])

  // Lesson reordering functions
  const moveLesson = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= orderedLessons.length) return

    const newLessons = [...orderedLessons]
    const [movedLesson] = newLessons.splice(index, 1)
    newLessons.splice(newIndex, 0, movedLesson)

    setOrderedLessons(newLessons)
    
    // TODO: Call API to save new order
    // await lessonApi.reorderLessons(courseId, newLessons.map((lesson, idx) => ({
    //   lessonId: lesson.id,
    //   order: idx + 1
    // })))
    
    toast({
      title: "Lesson Order Updated",
      description: `"${movedLesson.title}" moved ${direction}ward`,
    })
  }

  const deleteLesson = async (lessonId: string, lessonTitle: string) => {
    // TODO: Implement lesson deletion
    // await lessonApi.deleteLesson(courseId, lessonId)
    setOrderedLessons(prev => prev.filter(lesson => lesson.id !== lessonId))
    
    toast({
      title: "Lesson Deleted",
      description: `"${lessonTitle}" has been removed from the course`,
      variant: "destructive"
    })
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested course could not be found.</p>
            <Link href="/admin/courses">
              <Button>Back to Courses</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
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
              <span className="text-muted-foreground hidden lg:inline">/</span>
              <Link href="/admin/courses" className="text-muted-foreground hover:text-foreground hidden lg:inline">
                Courses
              </Link>
              <span className="text-muted-foreground hidden lg:inline">/</span>
              <span className="text-muted-foreground truncate max-w-xs hidden lg:inline">{course.title}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Link href={`/admin/courses/${courseId}/edit`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9">
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit Course</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              </Link>
              <Link href="/admin/courses">
                <Button variant="outline" className="bg-background/60 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Course Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">{course.title}</h1>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mb-4">{course.description}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm text-muted-foreground">
                <Badge variant={course.isPublished ? "default" : "secondary"} className="text-xs">
                  {course.isPublished ? "Published" : "Draft"}
                </Badge>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                  {orderedLessons.length} lessons
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  {Math.round(course.duration / 60)}h duration
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  {enrolledUsers.length} enrolled
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  {course.rating} rating
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                  <p className="text-2xl font-bold">{enrolledUsers.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">{avgProgress}%</p>
                </div>
                <Progress value={avgProgress} className="mt-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enrollments</p>
                  <p className="text-2xl font-bold">{enrolledUsers.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold">Course Lessons</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Use the arrow buttons to reorder lessons. Changes are saved automatically.
                </p>
              </div>
              <Link href={`/admin/courses/${courseId}/lessons/new`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9 w-full sm:w-auto">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Lesson</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            </div>

            {orderedLessons.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
                  <p className="text-muted-foreground mb-4">Start building your course by adding your first lesson.</p>
                  <Link href={`/admin/courses/${courseId}/lessons/new`}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Lesson
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (

            <div className="space-y-4">
              {orderedLessons.map((lesson: any, index: number) => (
                <Card 
                  key={lesson.id} 
                  className={`hover:shadow-md transition-all cursor-pointer ${
                    selectedLessonIndex === index 
                      ? 'ring-2 ring-emerald-500 shadow-md' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedLessonIndex(selectedLessonIndex === index ? null : index)}
                >
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {/* Drag Handle Visual Indicator */}
                          <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                          </div>
                          
                          {/* Lesson Number */}
                          <div className="flex-shrink-0">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                              selectedLessonIndex === index
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          {lesson.type === 'text' && <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />}
                          {lesson.type === 'video' && <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />}
                          {lesson.type === 'quiz' && <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight">{lesson.title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{lesson.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile: Badge and duration on separate line */}
                      <div className="flex items-center justify-between sm:hidden">
                      <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                          {lesson.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {lesson.duration} min
                          </span>
                        </div>
                      </div>

                      {/* Desktop: All controls in one line */}
                      <div className="hidden sm:flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                          {lesson.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {lesson.duration} min
                        </span>
                        
                        {/* Reorder Controls */}
                        <div className="flex items-center gap-1 ml-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveLesson(index, 'up')
                            }}
                            disabled={index === 0}
                            className="h-8 w-8 p-0"
                            title="Move up (Ctrl+↑)"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveLesson(index, 'down')
                            }}
                            disabled={index === orderedLessons.length - 1}
                            className="h-8 w-8 p-0"
                            title="Move down (Ctrl+↓)"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Action Controls */}
                        <div className="flex items-center gap-1 ml-2">
                          <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              title="Preview lesson"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}/edit`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              title="Edit lesson"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          {/* Delete Lesson with Confirmation */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete lesson"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-sm sm:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base sm:text-lg">Delete Lesson</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm">
                                  Are you sure you want to delete "{lesson.title}"? This action cannot be undone and will permanently remove the lesson from the course.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="h-8 sm:h-9 text-xs sm:text-sm">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteLesson(lesson.id, lesson.title)}
                                  className="h-8 sm:h-9 text-xs sm:text-sm bg-red-600 hover:bg-red-700"
                                >
                                  Delete Lesson
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Mobile: Action buttons on separate row */}
                      <div className="flex items-center gap-1 sm:hidden">
                        {/* Reorder Controls */}
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveLesson(index, 'up')
                            }}
                            disabled={index === 0}
                            className="h-7 w-7 p-0"
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveLesson(index, 'down')
                            }}
                            disabled={index === orderedLessons.length - 1}
                            className="h-7 w-7 p-0"
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Action Controls */}
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              title="Preview lesson"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}/edit`}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              title="Edit lesson"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </Link>
                          
                          {/* Delete Lesson with Confirmation */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                title="Delete lesson"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-sm sm:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base sm:text-lg">Delete Lesson</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm">
                                  Are you sure you want to delete "{lesson.title}"? This action cannot be undone and will permanently remove the lesson from the course.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="h-8 sm:h-9 text-xs sm:text-sm">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteLesson(lesson.id, lesson.title)}
                                  className="h-8 sm:h-9 text-xs sm:text-sm bg-red-600 hover:bg-red-700"
                                >
                                  Delete Lesson
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}

            {/* Lesson Management Help */}
            {orderedLessons.length > 0 && (
              <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <GripVertical className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                        Lesson Reordering
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        • Click on a lesson to select it, then use <kbd className="px-1 py-0.5 text-xs bg-emerald-200 dark:bg-emerald-800 rounded">Ctrl+↑</kbd>/<kbd className="px-1 py-0.5 text-xs bg-emerald-200 dark:bg-emerald-800 rounded">Ctrl+↓</kbd> to move it
                        • Use the ↑↓ arrow buttons to move lessons up or down
                        • Changes are saved automatically and will update the lesson sequence for students
                        • You can also manually set lesson order when editing individual lessons
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics dashboard will be implemented with backend integration</p>
                  <p className="text-sm mt-2">This will include completion rates, engagement metrics, and learning progress charts</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enrolled Students ({enrolledUsers.length})</CardTitle>
                <CardDescription>Manage student enrollments and track progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Student management interface will be implemented with backend</p>
                  <p className="text-sm mt-2">View individual progress, send messages, and manage enrollments</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Settings</CardTitle>
                <CardDescription>Configure course properties and access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Course settings panel will be implemented with backend</p>
                  <p className="text-sm mt-2">Manage pricing, access levels, certificates, and course metadata</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
