"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getYouTubeEmbedUrl, isYouTubeUrl } from "@/lib/youtube-utils"
import { 
  TrendingUp, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  PlayCircle, 
  FileText, 
  Clock,
  BookOpen,
  MessageCircle,
  Download,
  Trophy,
  Timer,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { mockCourses, mockUserProgress, getLessonsByCourseId } from "@/lib/mock-data"
import { formatDuration } from "@/lib/data-utils"
import { toast } from "sonner"

export default function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const { user } = useAuth()
  const courseId = params.id
  const lessonId = params.lessonId
  
  const [lessonCompleted, setLessonCompleted] = useState(false)
  
  // Quiz-related state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState<number | null>(null)

  // Find the course and lesson
  const course = mockCourses.find(c => c.id === courseId)
  const courseLessons = course ? getLessonsByCourseId(courseId) : []
  const lesson = courseLessons.find(l => l.id === lessonId)
  
  if (!course || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Lesson Not Found</h1>
          <Link href="/courses">
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">Back to Courses</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get user progress
  const userProgress = user ? mockUserProgress.find(p => p.userId === user.id && p.courseId === courseId) : null
  const isLessonCompleted = userProgress?.completedLessons.includes(lessonId) || false

  // Mock quiz data for quiz-type lessons
  const mockQuizData = lesson.type === 'quiz' ? {
    id: lesson.quizId || `quiz-${lessonId}`,
    title: `${lesson.title} Quiz`,
    description: `Test your understanding of ${lesson.title}`,
    timeLimit: 15,
    passingScore: 70,
    questions: [
      {
        id: '1',
        question: `What is the main concept covered in ${lesson.title}?`,
        type: 'multiple-choice' as const,
        options: [
          'Understanding market fundamentals',
          'Technical trading strategies',
          'Risk management principles',
          'All of the above'
        ],
        correctAnswer: 3,
        explanation: 'This lesson covers comprehensive concepts including market fundamentals, trading strategies, and risk management.',
        points: 10
      },
      {
        id: '2',
        question: 'True or False: Diversification helps reduce portfolio risk.',
        type: 'true-false' as const,
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation: 'Diversification is a fundamental risk management strategy that helps reduce portfolio risk by spreading investments across different assets.',
        points: 10
      },
      {
        id: '3',
        question: `Which strategy is most important when applying ${lesson.title.toLowerCase()}?`,
        type: 'multiple-choice' as const,
        options: [
          'Always follow market trends',
          'Conduct thorough research and analysis',
          'Invest all money in one stock',
          'Ignore market fundamentals'
        ],
        correctAnswer: 1,
        explanation: 'Thorough research and analysis is always the most important strategy for successful investing.',
        points: 10
      }
    ]
  } : null

  // Get next and previous lessons
  const currentIndex = courseLessons.findIndex(l => l.id === lessonId)
  const previousLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null

  useEffect(() => {
    setLessonCompleted(isLessonCompleted)
  }, [isLessonCompleted])

  const handleCompleteLesson = () => {
    if (!user) {
      toast.error("Please sign in to track your progress")
      return
    }
    
    setLessonCompleted(true)
    toast.success("Lesson completed! Great job!")
  }

  // Quiz handling functions
  const handleQuizAnswer = (questionIndex: number, answer: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }))
  }

  const handleQuizSubmit = () => {
    if (!mockQuizData) return
    
    let correctAnswers = 0
    mockQuizData.questions.forEach((question, index) => {
      const userAnswer = quizAnswers[index]
      if (userAnswer !== undefined && parseInt(userAnswer) === question.correctAnswer) {
        correctAnswers++
      }
    })
    
    const score = Math.round((correctAnswers / mockQuizData.questions.length) * 100)
    setQuizScore(score)
    setQuizSubmitted(true)
    
    if (score >= mockQuizData.passingScore) {
      setLessonCompleted(true)
      toast.success(`Quiz completed! You scored ${score}%`)
    } else {
      toast.error(`Quiz completed. You scored ${score}%. Need ${mockQuizData.passingScore}% to pass.`)
    }
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href={`/courses/${courseId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-0 lg:mr-2 h-4 w-4" />
                  <span className="hidden lg:inline">Back to Course</span>
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
                <span className="text-xl font-bold text-foreground">StockMento</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant="outline">{lesson.type === "video" ? "Video Lesson" : "Text Lesson"}</Badge>
              <span className="text-sm text-muted-foreground">{formatDuration(lesson.duration)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Lesson Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-foreground">{lesson.title}</h1>
                {lessonCompleted && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-6">
                <span className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {course.title}
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDuration(lesson.duration)}
                </span>
                {lesson.type === "video" && (
                  <span className="flex items-center">
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Video Lesson
                  </span>
                )}
                {lesson.type === "quiz" && (
                  <span className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    Quiz
                  </span>
                )}
                {lesson.type === "text" && (
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    Text Lesson
                  </span>
                )}
              </div>
            </div>

            {/* Lesson Content */}
            <Card className="mb-8">
              <CardContent className="p-8">
                {lesson.type === "quiz" ? (
                  // Quiz Content
                  <div>
                    {!quizSubmitted ? (
                      <div>
                        {/* Quiz Header */}
                        <div className="mb-6">
                          <h2 className="text-2xl font-bold text-foreground mb-2">{mockQuizData?.title}</h2>
                          <p className="text-muted-foreground mb-4">{mockQuizData?.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Timer className="h-4 w-4 mr-1" />
                              {mockQuizData?.timeLimit} minutes
                            </span>
                            <span className="flex items-center">
                              <Trophy className="h-4 w-4 mr-1" />
                              Passing Score: {mockQuizData?.passingScore}%
                            </span>
                          </div>
                        </div>

                        {/* Quiz Questions */}
                        {mockQuizData?.questions.map((question, index) => (
                          <div key={question.id} className="mb-6 p-6 border border-border/60 rounded-lg">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                              Question {index + 1}: {question.question}
                            </h3>
                            
                            <RadioGroup 
                              value={quizAnswers[index] || ""} 
                              onValueChange={(value) => handleQuizAnswer(index, value)}
                            >
                              {question.options?.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <RadioGroupItem value={optionIndex.toString()} id={`q${index}_o${optionIndex}`} />
                                  <Label htmlFor={`q${index}_o${optionIndex}`} className="cursor-pointer">
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        ))}

                        {/* Quiz Submit Button */}
                        <div className="flex justify-center">
                          <Button 
                            onClick={handleQuizSubmit}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={Object.keys(quizAnswers).length < (mockQuizData?.questions.length || 0)}
                          >
                            <Trophy className="mr-2 h-4 w-4" />
                            Submit Quiz
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Quiz Results
                      <div className="text-center">
                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                          (quizScore || 0) >= (mockQuizData?.passingScore || 70) ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <Trophy className={`h-10 w-10 ${
                            (quizScore || 0) >= (mockQuizData?.passingScore || 70) ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-foreground mb-2">Quiz Completed!</h3>
                        <p className="text-lg text-muted-foreground mb-4">Your Score: {quizScore}%</p>
                        
                        {(quizScore || 0) >= (mockQuizData?.passingScore || 70) ? (
                          <p className="text-green-600 font-semibold mb-6">Congratulations! You passed the quiz.</p>
                        ) : (
                          <p className="text-red-600 font-semibold mb-6">You need {mockQuizData?.passingScore}% to pass. Try again!</p>
                        )}

                        {/* Show Answers */}
                        <div className="text-left space-y-4 mb-6">
                          {mockQuizData?.questions.map((question, index) => {
                            const userAnswer = parseInt(quizAnswers[index])
                            const isCorrect = userAnswer === question.correctAnswer
                            
                            return (
                              <div key={question.id} className="p-4 border border-border/60 rounded-lg">
                                <h4 className="font-semibold text-foreground mb-2">
                                  Question {index + 1}: {question.question}
                                </h4>
                                <p className={`mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  Your answer: {question.options?.[userAnswer] || 'Not answered'} 
                                  {isCorrect ? ' ✓' : ' ✗'}
                                </p>
                                <p className="text-green-600 mb-2">
                                  Correct answer: {question.options?.[question.correctAnswer as number]}
                                </p>
                                {question.explanation && (
                                  <p className="text-muted-foreground text-sm italic">
                                    {question.explanation}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <Button onClick={resetQuiz} variant="outline" className="mr-3">
                          Retake Quiz
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Regular lesson(Video or Text)
                  <div>
                    {lesson.type === "video" ? (
                      <div className="aspect-video bg-slate-900 relative rounded-lg overflow-hidden mb-6">
                        {lesson.videoUrl ? (
                          <iframe
                            src={isYouTubeUrl(lesson.videoUrl) 
                              ? getYouTubeEmbedUrl(lesson.videoUrl) || lesson.videoUrl 
                              : lesson.videoUrl
                            }
                            title={lesson.title}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-white">
                            <div className="text-center">
                              <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <h3 className="text-lg font-medium mb-2">Video Content Coming Soon</h3>
                              <p className="text-muted-foreground opacity-60">This lesson&apos;s video content is being prepared.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                   {/* Lesson Text Content */}
                    <div className="prose prose-emerald max-w-none">
                      {lesson.content ? (
                        <div className="text-foreground leading-relaxed">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                          >
                            {lesson.content}
                          </ReactMarkdown>
                        </div>
                        ) : (
                    <div className="text-foreground leading-relaxed">
                      <p className="mb-6">
                        Welcome to this comprehensive lesson on {lesson.title.toLowerCase()}. In this lesson, we&apos;ll explore the fundamental concepts that every investor should understand when navigating the Pakistan Stock Exchange.
                      </p>

                      <h3 className="text-xl font-semibold text-foreground mb-3">Key Learning Objectives</h3>
                      <p className="mb-4">By the end of this lesson, you will be able to:</p>
                      <ul className="mb-6 space-y-2">
                        <li>• Understand the basic principles behind {lesson.title.toLowerCase()}</li>
                        <li>• Apply these concepts to real-world trading scenarios</li>
                        <li>• Make informed decisions based on market analysis</li>
                        <li>• Recognize opportunities and risks in the PSX market</li>
                      </ul>

                        <h3 className="text-xl font-semibold text-foreground mb-3">Core Concepts</h3>
                      
                      <p className="mb-4"><strong className="font-semibold">Market Fundamentals:</strong> The Pakistan Stock Exchange operates on principles of supply and demand, where prices are determined by the collective actions of buyers and sellers. Understanding these dynamics is crucial for successful investing.</p>

                      <p className="mb-4"><strong className="font-semibold">Risk Assessment:</strong> Every investment carries inherent risks. Learning to assess and manage these risks is fundamental to long-term success in the stock market.</p>
        
                      <p className="mb-6"><strong className="font-semibold">Market Analysis:</strong> There are two primary approaches to analyzing stocks: Fundamental Analysis (examining company financials, industry trends, and economic indicators) and Technical Analysis (using charts and statistical indicators to predict price movements).</p>
            
                      <h3 className="text-xl font-semibold text-foreground mb-3">Practical Examples</h3>
                      
                      <p className="mb-4"><strong className="font-semibold">Blue-Chip Stocks:</strong> Companies like Oil & Gas Development Company Limited (OGDC) and Pakistan Petroleum Limited (PPL) represent stable, established businesses that often form the backbone of investment portfolios.</p>
    
                              <p className="mb-6"><strong className="font-semibold">Emerging Sectors:</strong> The technology and financial sectors in Pakistan have shown significant growth potential, with companies like Systems Limited and MCB Bank leading the way.</p>

                              <h3 className="text-xl font-semibold text-foreground mb-3">Key Takeaways</h3>
                              <ul className="mb-6 space-y-2">
                                <li>- Always conduct thorough research before making investment decisions</li>
                                <li>- Diversification is crucial for risk management</li>
                                <li>- Stay informed about market trends and economic indicators</li>
                                <li>- Consider your risk tolerance and investment timeline</li>
                              </ul>

                              <div className="text-sm text-muted-foreground p-4 bg-amber-100/80 border-l-4 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/40 rounded italic">
                                Remember: This is educational content and should not be considered as financial advice. Always consult with qualified financial advisors before making investment decisions.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
              </CardContent>
            </Card>

            {/* Lesson Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {previousLesson && (
                  <Link href={`/courses/${courseId}/lessons/${previousLesson.id}`}>
                    <Button variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {!lessonCompleted && (
                  <Button onClick={handleCompleteLesson} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Complete
                  </Button>
                )}
                
                {nextLesson && (
                  <Link href={`/courses/${courseId}/lessons/${nextLesson.id}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Next Lesson
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Course Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Course Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Progress</span>
                        <span>{courseLessons.length > 0 ? Math.round(((userProgress?.completedLessons.length || 0) / courseLessons.length) * 100) : 0}%</span>
                      </div>
                      <Progress 
                        value={courseLessons.length > 0 ? ((userProgress?.completedLessons.length || 0) / courseLessons.length) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {userProgress?.completedLessons.length || 0} of {courseLessons.length} lessons completed
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lesson List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Course Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {courseLessons.map((courseLesson) => {
                      const isCompleted = userProgress?.completedLessons.includes(courseLesson.id)
                      const isCurrent = courseLesson.id === lessonId
                      
                      return (
                        <Link 
                          key={courseLesson.id} 
                          href={`/courses/${courseId}/lessons/${courseLesson.id}`}
                          className={`block p-3 rounded-lg border transition-colors ${
                            isCurrent 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'hover:bg-muted/40 dark:hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                              ) : isCurrent ? (
                                <div className="h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center">
                                  <div className="h-2 w-2 rounded-full bg-background" />
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-border" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                {courseLesson.type === "video" ? (
                                  <PlayCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                ) : courseLesson.type === "quiz" ? (
                                  <Trophy className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className={`text-sm font-medium truncate ${
                                  isCurrent ? 'text-emerald-700' : 'text-foreground'
                                }`}>
                                  {courseLesson.title}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDuration(courseLesson.duration)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Lesson Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lesson Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="mr-2 h-4 w-4" />
                    Download Notes
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Exercise Files
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Ask Questions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
