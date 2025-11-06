"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  CheckCircle, 
  Lock, 
  FileText, 
  Video, 
  Play,
  GraduationCap
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { 
  mockCourses, 
  getSectionsByCourseId, 
  getLessonsBySectionId,
  mockUserProgress 
} from "@/lib/mock-data"
import { calculateCourseProgress, formatDuration } from "@/lib/data-utils"
import { UserNavbar } from "@/components/navigation"
import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function CourseSectionsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const courseId = params.id
  const [expandedSections, setExpandedSections] = useState<string[]>(['section-1-1'])
  
  // Find the course
  const course = mockCourses.find(c => c.id === courseId)
  
  // Get sections for this course
  const sections = getSectionsByCourseId(courseId)
  
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Course Not Found</h1>
          <Link href="/courses">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Back to Courses</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get user progress
  const userProgress = user ? mockUserProgress.find(p => p.userId === user.id && p.courseId === courseId) : null
  const isEnrolled = !!userProgress
  const overallProgress = userProgress ? calculateCourseProgress(
    courseId,
    userProgress.completedLessons,
    userProgress.completedQuizzes,
    course.totalLessons,
    0
  ) : 0

  const getLessonIcon = (type: string) => {
    return type === "video" ? Video : type === "quiz" ? GraduationCap : FileText
  }

  const getLessonStatus = (lessonId: string) => {
    if (!userProgress) return "locked"
    if (userProgress.completedLessons.includes(lessonId)) return "completed"
    if (userProgress.currentLesson === lessonId) return "current"
    return "locked"
  }

  const getSectionProgress = (sectionId: string) => {
    if (!userProgress) return 0
    const sectionLessons = getLessonsBySectionId(sectionId)
    if (sectionLessons.length === 0) return 0
    
    const completedCount = sectionLessons.filter(lesson => 
      userProgress.completedLessons.includes(lesson.id)
    ).length
    
    return Math.round((completedCount / sectionLessons.length) * 100)
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
            <Link href={`/courses/${courseId}`} className="hover:text-foreground truncate max-w-[150px] sm:max-w-none">
              {course.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Sections</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
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

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {course.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">
            {course.longDescription || course.description}
          </p>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 text-sm text-muted-foreground mb-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{formatDuration(course.duration)}</span>
            </div>
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{sections.length} sections</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{course.enrollmentCount || Math.floor(Math.random() * 2000) + 500} students</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1.5 flex-shrink-0 text-yellow-400" />
              <span>{course.rating.toFixed(1)} rating</span>
            </div>
          </div>

          {isEnrolled && (
            <div className="bg-background/80 border border-border/60 rounded-lg p-4 sm:p-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm font-bold text-emerald-600">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {userProgress?.completedLessons.length || 0} of {course.totalLessons} lessons completed
              </p>
            </div>
          )}
        </div>

        {/* Sections Accordion */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Course Curriculum</h2>
            {!isEnrolled && (
              <Link href={`/courses/${courseId}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Enroll to Access
                </Button>
              </Link>
            )}
          </div>

          {sections.length > 0 ? (
            <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-4">
              {sections.map((section, sectionIndex) => {
                const sectionLessons = getLessonsBySectionId(section.id)
                const sectionProgress = getSectionProgress(section.id)
                const completedLessons = sectionLessons.filter(lesson => 
                  userProgress?.completedLessons.includes(lesson.id)
                ).length

                return (
                  <AccordionItem 
                    key={section.id} 
                    value={section.id}
                    className="border border-border/60 rounded-lg overflow-hidden bg-background/80"
                  >
                    <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3 sm:gap-4 w-full text-left">
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300">
                            {sectionIndex + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 pr-4">
                            {section.title}
                          </h3>
                          {section.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                              {section.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {sectionLessons.length} lessons
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {formatDuration(section.totalDuration)}
                            </span>
                            {isEnrolled && (
                              <span className="flex items-center text-emerald-600 font-medium">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                {completedLessons}/{sectionLessons.length}
                              </span>
                            )}
                          </div>
                          
                          {isEnrolled && sectionProgress > 0 && (
                            <div className="mt-3">
                              <Progress value={sectionProgress} className="h-1.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-4 sm:px-6 pb-4">
                      <div className="space-y-2 pt-2">
                        {sectionLessons.map((lesson, lessonIndex) => {
                          const status = getLessonStatus(lesson.id)
                          const LessonIcon = getLessonIcon(lesson.type)
                          
                          return (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                status === "current" 
                                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30" 
                                  : "bg-background border-border/40 hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
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
                                
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                                    {sectionIndex + 1}.{lessonIndex + 1}
                                  </span>
                                  <LessonIcon className={`h-4 w-4 flex-shrink-0 ${
                                    lesson.type === "video" 
                                      ? "text-blue-600" 
                                      : lesson.type === "quiz"
                                      ? "text-purple-600"
                                      : "text-muted-foreground"
                                  }`} />
                                  <span className={`font-medium text-sm sm:text-base truncate ${
                                    status === "current" ? "text-emerald-700 dark:text-emerald-300" : ""
                                  }`}>
                                    {lesson.title}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                <span className="hidden sm:block text-sm text-muted-foreground">
                                  {formatDuration(lesson.duration)}
                                </span>
                                {isEnrolled && (status === "completed" || status === "current") && (
                                  <Link href={`/courses/${courseId}/lessons/${lesson.id}`}>
                                    <Button 
                                      size="sm" 
                                      variant={status === "current" ? "default" : "outline"}
                                      className="text-xs sm:text-sm"
                                    >
                                      <span className="hidden sm:inline">
                                        {status === "completed" ? "Review" : "Continue"}
                                      </span>
                                      <Play className="h-3 w-3 sm:ml-1.5" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          ) : (
            <Card className="p-8 sm:p-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg sm:text-xl font-medium text-foreground">
                No Sections Available
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                The curriculum for this course is being prepared.
              </p>
            </Card>
          )}
        </div>

        {/* Back to Course Button */}
        <div className="mt-8 flex justify-center">
          <Link href={`/courses/${courseId}`}>
            <Button variant="outline" size="lg">
              Back to Course Overview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
