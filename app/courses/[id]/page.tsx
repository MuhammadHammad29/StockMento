"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock, Users, Star, CheckCircle, Lock, FileText, Video, Play } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { mockCourses, mockUserProgress, getUserCourses, getLessonsByCourseId } from "@/lib/mock-data"
import { calculateCourseProgress, formatDuration } from "@/lib/data-utils"
import { toast } from "sonner"
import { useState } from "react"
import CourseCompletionDialog from "@/components/course-completion-dialog"
import { UserNavbar } from "@/components/navigation"

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const courseId = params.id
  
  // Find the course
  const course = mockCourses.find(c => c.id === courseId)
  
  // Get lessons for this course
  const lessons = getLessonsByCourseId(courseId)
  
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Course Not Found</h1>
          <Link href="/courses">
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">Back to Courses</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get user enrollment and progress
  const enrolledCourses = user ? getUserCourses(user.id) : []
  const isEnrolled = enrolledCourses.some(c => c.id === courseId)
  const userProgress = user ? mockUserProgress.find(p => p.userId === user.id && p.courseId === courseId) : null
  const overallProgress = userProgress ? calculateCourseProgress(
    courseId,
    userProgress.completedLessons,
    userProgress.completedQuizzes,
    course.totalLessons,
    0 // quizzes count
  ) : 0

  const handleEnroll = () => {
    if (!user) {
      toast.error("Please sign in to enroll in courses")
      return
    }
    toast.success("Successfully enrolled in the course!")
  }

  const getLessonIcon = (type: string) => {
    return type === "video" ? Video : FileText
  }

  const getLessonStatus = (lessonId: string) => {
    if (!userProgress) return "locked"
    if (userProgress.completedLessons.includes(lessonId)) return "completed"
    if (userProgress.currentLesson === lessonId) return "current"
    return "locked"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <UserNavbar />

      {/* Breadcrumb Section */}
      <div className="border-b border-border/60 bg-background/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href="/courses" className="hover:text-foreground">Courses</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground truncate max-w-[200px] sm:max-w-none">{course.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                <Badge variant={course.level === "Beginner" ? "default" : course.level === "Intermediate" ? "secondary" : "destructive"}>
                  {course.level}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
                  {course.category}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">{course.title}</h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">{course.description}</p>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-sm text-muted-foreground mb-4 sm:mb-6">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{formatDuration(course.duration)}</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{lessons?.length || 0} lessons</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{course.enrollmentCount || Math.floor(Math.random() * 2000) + 500} students</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 flex-shrink-0 text-yellow-400" />
                  <span className="truncate">
                    {course.rating.toFixed(1)}
                    <span className="ml-1 text-muted-foreground">
                      ({course.totalStudents.toLocaleString()} learners)
                    </span>
                  </span>
                </div>
              </div>

              {isEnrolled && (
                <div className="mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Course Progress</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2 sm:h-3" />
                </div>
              )}
            </div>

            {/* Course Curriculum */}
            <div className="space-y-4 sm:space-y-6">
              {lessons && lessons.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Course Lessons</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                      {lessons.map((lesson) => {
                        const status = getLessonStatus(lesson.id)
                        const LessonIcon = getLessonIcon(lesson.type)
                        
                        return (
                          <div
                            key={lesson.id}
                            className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border ${
                              status === "current" ? "bg-emerald-50 border-emerald-200" : "bg-background"
                            }`}
                          >
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                              <div className="flex-shrink-0">
                                {status === "completed" ? (
                                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                                ) : status === "current" ? (
                                  <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-background" />
                                  </div>
                                ) : (
                                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                                <LessonIcon className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${lesson.type === "video" ? "text-blue-600" : "text-muted-foreground"}`} />
                                <span className={`font-medium text-sm sm:text-base truncate ${status === "current" ? "text-emerald-700" : ""}`}>
                                  {lesson.title}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                              <span className="hidden text-xs text-muted-foreground sm:block sm:text-sm">{formatDuration(lesson.duration)}</span>
                              {isEnrolled && (status === "completed" || status === "current") && (
                                <Link href={`/courses/${course.id}/lessons/${lesson.id}`}>
                                  <Button size="sm" variant={status === "current" ? "default" : "outline"} className="text-xs sm:text-sm px-2 sm:px-3">
                                    <span className="hidden sm:inline">{status === "completed" ? "Review" : "Start"}</span>
                                    <Play className="h-3 w-3 sm:ml-1" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-medium text-foreground">Course Content Coming Soon</h3>
                  <p className="text-muted-foreground">The curriculum for this course is being prepared.</p>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Course Actions */}
              <Card>
                <CardContent className="p-6">
                  {isEnrolled ? (
                    <div className="space-y-4">
                      {userProgress && userProgress.currentLesson ? (
                        <Link href={`/courses/${course.id}/lessons/${userProgress.currentLesson}`}>
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                            Continue Learning
                            <Play className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : lessons && lessons.length > 0 ? (
                        <Link href={`/courses/${course.id}/lessons/${lessons[0].id}`}>
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                            Start Course
                            <Play className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button disabled className="w-full" size="lg">
                          Course Content Coming Soon
                        </Button>
                      )}
                      {/* Demo Button for Testing Completion Dialog */}
                      {isEnrolled && (
                        <Button 
                          onClick={() => setShowCompletionDialog(true)}
                          variant="outline" 
                          className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          size="sm"
                        >
                          🎉 Demo: Course Completion
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button onClick={handleEnroll} className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                        Enroll Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Course Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">This course includes:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Video className="h-5 w-5 text-blue-600" />
                    <span className="text-sm">{formatDuration(course.duration)} of content</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Downloadable resources</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span className="text-sm">Lifetime access</span>
                  </div>
                </CardContent>
              </Card>

              {/* Related Courses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Courses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockCourses
                    .filter(c => c.id !== course.id && c.level === course.level)
                    .slice(0, 2)
                    .map((relatedCourse) => (
                      <Link key={relatedCourse.id} href={`/courses/${relatedCourse.id}`}>
                        <div className="flex space-x-3 hover:bg-muted/40 dark:hover:bg-muted/30 p-2 rounded-lg transition-colors">
                          <Image
                            src={relatedCourse.thumbnail}
                            alt={relatedCourse.title}
                            width={80}
                            height={60}
                            className="h-15 w-20 rounded object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2">{relatedCourse.title}</h4>
                            <p className="text-xs text-muted-foreground">{relatedCourse.level} - {formatDuration(relatedCourse.duration)}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Completion Dialog */}
      <CourseCompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        courseTitle={course.title}
      />

    </div>
  )
}
