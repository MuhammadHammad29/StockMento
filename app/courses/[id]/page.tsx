"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, BookOpen, Clock, Users, Star, CheckCircle, Lock, FileText, Video, ArrowLeft, Play, Download } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { mockCourses, mockUserProgress, getUserCourses, getLessonsByCourseId } from "@/lib/mock-data"
import { calculateCourseProgress, formatDuration } from "@/lib/data-utils"
import { toast } from "sonner"

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
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

  // Sample reviews data
  const reviews = [
    {
      id: 1,
      user: { name: "Muhammad Khan", avatar: "/user-profile-photo.png" },
      rating: 5,
      date: "2 days ago",
      comment: "Excellent course for beginners! Dr. Sarah explains complex concepts in a very simple way. The practical examples really helped me understand how PSX works."
    },
    {
      id: 2,
      user: { name: "Ayesha Fatima", avatar: "/professional-user-photo.jpg" },
      rating: 4,
      date: "1 week ago",
      comment: "Great content and well-structured lessons. I wish there were more interactive exercises, but overall a solid foundation course for PSX trading."
    },
    {
      id: 3,
      user: { name: "Ali Hassan", avatar: "/placeholder-user.jpg" },
      rating: 5,
      date: "2 weeks ago",
      comment: "This course changed my understanding of the stock market completely. The instructor's expertise really shows through the content."
    }
  ]

  const handleEnroll = () => {
    if (!user) {
      toast.error("Please sign in to enroll in courses")
      return
    }
    toast.success("Successfully enrolled in the course!")
  }

  const formatPrice = (price: number) => {
    return price === 0 ? "Free" : `PKR ${price.toLocaleString()}`
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/courses">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Courses
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
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={course.level === "Beginner" ? "default" : course.level === "Intermediate" ? "secondary" : "destructive"}>
                  {course.level}
                </Badge>
                <Badge variant="outline">{formatPrice(course.price)}</Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200">
                  {course.category}
                </Badge>
              </div>

              <h1 className="text-3xl font-bold text-foreground mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{course.description}</p>

              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDuration(course.duration)}
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {lessons?.length || 0} lessons
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {course.enrollmentCount || Math.floor(Math.random() * 2000) + 500} students
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" />
                  {course.rating}
                </div>
              </div>

              {isEnrolled && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Course Progress</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>
              )}
            </div>

            {/* Course Content Tabs */}
            <Tabs defaultValue="curriculum" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="curriculum" className="space-y-6">
                {lessons && lessons.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Course Lessons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {lessons.map((lesson, index) => {
                          const status = getLessonStatus(lesson.id)
                          const LessonIcon = getLessonIcon(lesson.type)
                          
                          return (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                status === "current" ? "bg-emerald-50 border-emerald-200" : "bg-background"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {status === "completed" ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                                  ) : status === "current" ? (
                                    <div className="h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                                      <div className="h-2 w-2 rounded-full bg-background" />
                                    </div>
                                  ) : (
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <LessonIcon className={`h-4 w-4 ${lesson.type === "video" ? "text-blue-600" : "text-muted-foreground"}`} />
                                  <span className={`font-medium ${status === "current" ? "text-emerald-700" : ""}`}>
                                    {lesson.title}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-sm text-muted-foreground">{formatDuration(lesson.duration)}</span>
                                {isEnrolled && (status === "completed" || status === "current") && (
                                  <Link href={`/courses/${course.id}/lessons/${lesson.id}`}>
                                    <Button size="sm" variant={status === "current" ? "default" : "outline"}>
                                      {status === "completed" ? "Review" : "Start"}
                                      <Play className="ml-1 h-3 w-3" />
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
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Course Content Coming Soon</h3>
                    <p className="text-muted-foreground">The curriculum for this course is being prepared.</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="instructor">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/professional-woman-instructor.jpg" />
                        <AvatarFallback>PSX</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">StockMento Instructor</h3>
                        <p className="text-muted-foreground mb-3">Senior Financial Analyst & Market Expert</p>
                        <p className="text-foreground mb-4">
                          Our instructor has over 15 years of experience in financial markets and has been teaching 
                          stock market fundamentals for the past 8 years. Known for making complex financial concepts 
                          accessible to beginners while providing valuable insights for experienced traders.
                        </p>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">15+</div>
                            <div className="text-sm text-muted-foreground">Years Experience</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">5,000+</div>
                            <div className="text-sm text-muted-foreground">Students Taught</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">4.9</div>
                            <div className="text-sm text-muted-foreground">Average Rating</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <Avatar>
                            <AvatarImage src={review.user.avatar} />
                            <AvatarFallback>{review.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{review.user.name}</h4>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${
                                      i < review.rating ? "text-yellow-400 fill-current" : "text-muted-foreground opacity-60"
                                    }`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-muted-foreground text-sm mb-2">{review.date}</p>
                            <p className="text-foreground">{review.comment}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
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
                      <Button variant="outline" className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download Resources
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button onClick={handleEnroll} className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg">
                        Enroll Now - {formatPrice(course.price)}
                      </Button>
                      <Button variant="outline" className="w-full">
                        Add to Wishlist
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
                          <img
                            src={relatedCourse.thumbnail}
                            alt={relatedCourse.title}
                            className="w-20 h-15 object-cover rounded"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2">{relatedCourse.title}</h4>
                            <p className="text-xs text-muted-foreground">{relatedCourse.level} • {formatDuration(relatedCourse.duration)}</p>
                            <p className="text-xs text-emerald-600 font-medium">{formatPrice(relatedCourse.price)}</p>
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
    </div>
  )
}
