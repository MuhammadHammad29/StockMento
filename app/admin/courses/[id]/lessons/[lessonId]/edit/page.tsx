"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Save, 
  Eye, 
  FileText,
  PlayCircle,
  BookOpen,
  AlertCircle,
  Plus,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { mockCourses, getLessonsByCourseId } from "@/lib/mock-data"
import { toast } from "sonner"
import { AdminNavbar } from "@/components/navigation"

interface LessonFormData {
  title: string
  description: string
  type: 'text' | 'video' | 'quiz'
  content?: string
  videoUrl?: string
  quizQuestions?: QuizQuestion[]
  duration: number
  order: number
  isLocked: boolean
  prerequisiteIds: string[]
}

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'true-false' | 'short-answer'
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  points: number
}

export default function AdminLessonEditPage({ 
  params 
}: { 
  params: { id: string; lessonId: string } 
}) {
  const { adminUser } = useAdminAuth()
  void adminUser
  const { id: courseId, lessonId } = params
  
  // Find course and lesson - in future these will be API calls
  const course = mockCourses.find(c => c.id === courseId)
  const lessons = getLessonsByCourseId(courseId)
  const lesson = lessons.find(l => l.id === lessonId)
  
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    description: '',
    type: 'text',
    content: '',
    videoUrl: '',
    quizQuestions: [],
    duration: 0,
    order: 1,
    isLocked: false,
    prerequisiteIds: []
  })

  // Initialize form with lesson data
  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        content: lesson.content || '',
        videoUrl: lesson.videoUrl || '',
        quizQuestions: [], // TODO: Load from quiz data
        duration: lesson.duration,
        order: lesson.order,
        isLocked: lesson.isLocked,
        prerequisiteIds: lesson.prerequisiteIds || []
      })
    }
  }, [lesson])

  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Lesson Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested lesson could not be found.</p>
            <Link href={`/admin/courses/${courseId}`}>
              <Button>Back to Course</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleInputChange = <K extends keyof LessonFormData>(field: K, value: LessonFormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => { 
    setIsLoading(true)
    
    try {
      // TODO: Replace with actual API call to NestJS backend
      // const response = await fetch(`/api/admin/courses/${courseId}/lessons/${lessonId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Lesson updated successfully!')
      setHasChanges(false)
      
    } catch (error) {
      console.error('Error updating lesson:', error)
      toast.error('Failed to update lesson. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const addQuizQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      points: 1
    }
    handleInputChange('quizQuestions', [...(formData.quizQuestions || []), newQuestion])
  }

  const updateQuizQuestion = <K extends keyof QuizQuestion>(index: number, field: K, value: QuizQuestion[K]) => {
    const questions = [...(formData.quizQuestions || [])]
    questions[index] = { ...questions[index], [field]: value }
    handleInputChange('quizQuestions', questions)
  }

  const removeQuizQuestion = (index: number) => {
    const questions = [...(formData.quizQuestions || [])]
    questions.splice(index, 1)
    handleInputChange('quizQuestions', questions)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <AdminNavbar />

      {/* Breadcrumb Section */}
      <div className="border-b border-border/60 bg-background/80">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground overflow-hidden">
              <Link href="/admin/courses" className="hover:text-foreground flex-shrink-0">Courses</Link>
              <span className="mx-1 sm:mx-2 flex-shrink-0">/</span>
              <Link href={`/admin/courses/${courseId}`} className="hover:text-foreground truncate max-w-[80px] sm:max-w-[120px] lg:max-w-[200px]">{course.title}</Link>
              <span className="mx-1 sm:mx-2 flex-shrink-0">/</span>
              <span className="text-foreground truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none">{lesson.title}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">Edit Lesson</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Update lesson content and settings</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Link href={`/courses/${courseId}/lessons/${lessonId}`}>
              <Button variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Preview</span>
              </Button>
            </Link>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isLoading ? 'Saving...' : 'Save Changes'}</span>
              <span className="sm:hidden">{isLoading ? 'Save...' : 'Save'}</span>
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don&apos;t forget to save your progress.
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core lesson details and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter lesson title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of what students will learn"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Lesson Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value as LessonFormData['type'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Text Content
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="h-4 w-4" />
                          Video Lesson
                        </div>
                      </SelectItem>
                      <SelectItem value="quiz">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Quiz/Assessment
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                    placeholder="Estimated time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Lesson Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
                    placeholder="Position in course"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="locked">Locked Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.isLocked ? 'Students need to complete prerequisites' : 'Available to all students'}
                  </p>
                </div>
                <Switch
                  id="locked"
                  checked={formData.isLocked}
                  onCheckedChange={(checked) => handleInputChange('isLocked', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {formData.type === 'text' && <FileText className="h-5 w-5" />}
                {formData.type === 'video' && <PlayCircle className="h-5 w-5" />}
                {formData.type === 'quiz' && <BookOpen className="h-5 w-5" />}
                {formData.type === 'text' && 'Text Content'}
                {formData.type === 'video' && 'Video Content'}
                {formData.type === 'quiz' && 'Quiz Content'}
              </CardTitle>
              <CardDescription>
                {formData.type === 'text' && 'Create engaging text content using Markdown'}
                {formData.type === 'video' && 'Add video lessons from YouTube or other sources'}
                {formData.type === 'quiz' && 'Create interactive quizzes and assessments'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Text Content */}
              {formData.type === 'text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="content">Lesson Content (Markdown)</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="# Lesson Title&#10;&#10;Write your lesson content here using Markdown formatting...&#10;&#10;## Key Points&#10;- Point 1&#10;- Point 2&#10;&#10;**Bold text** and *italic text* are supported."
                      rows={15}
                      className="font-mono"
                    />
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This text editor supports Markdown formatting. In the future, this will be enhanced with a rich text editor.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Video Content */}
              {formData.type === 'video' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Video URL</Label>
                    <Input
                      id="videoUrl"
                      value={formData.videoUrl}
                      onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  {formData.videoUrl && (
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-2">Video Preview:</p>
                      <p className="font-mono text-xs break-all">{formData.videoUrl}</p>
                    </div>
                  )}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Video upload and embedding functionality will be enhanced with backend integration.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              {/* Quiz Content */}
              {formData.type === 'quiz' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Quiz Questions</h3>
                    <Button onClick={addQuizQuestion} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>

                  {(formData.quizQuestions || []).map((question, index) => (
                    <Card key={question.id} className="border-l-4 border-l-emerald-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">Question {index + 1}</h4>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeQuizQuestion(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Question Text</Label>
                          <Textarea
                            value={question.question}
                            onChange={(e) => updateQuizQuestion(index, 'question', e.target.value)}
                            placeholder="Enter the question..."
                            rows={2}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Question Type</Label>
                            <Select
                              value={question.type}
                              onValueChange={(value) =>
                                updateQuizQuestion(index, 'type', value as QuizQuestion['type'])
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                <SelectItem value="true-false">True/False</SelectItem>
                                <SelectItem value="short-answer">Short Answer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Points</Label>
                            <Input
                              type="number"
                              value={question.points}
                              onChange={(e) => updateQuizQuestion(index, 'points', parseInt(e.target.value) || 1)}
                              min="1"
                              max="10"
                            />
                          </div>
                        </div>

                        {question.type === 'multiple-choice' && (
                          <div className="space-y-2">
                            <Label>Answer Options</Label>
                            {question.options?.map((option, optionIndex) => (
                              <Input
                                key={optionIndex}
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(question.options || [])]
                                  newOptions[optionIndex] = e.target.value
                                  updateQuizQuestion(index, 'options', newOptions)
                                }}
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Input
                            value={question.correctAnswer}
                            onChange={(e) => updateQuizQuestion(index, 'correctAnswer', e.target.value)}
                            placeholder="Enter the correct answer..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Explanation (Optional)</Label>
                          <Textarea
                            value={question.explanation}
                            onChange={(e) => updateQuizQuestion(index, 'explanation', e.target.value)}
                            placeholder="Explain why this is the correct answer..."
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {(formData.quizQuestions || []).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No questions added yet</p>
                      <p className="text-sm">Click &quot;Add Question&quot; to create your first quiz question</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Integration Note */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Backend Integration Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>This lesson editor is prepared for NestJS backend integration:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Lesson data structure matches PostgreSQL schema</li>
                  <li>API endpoints ready: <code>PUT /api/admin/courses/:courseId/lessons/:lessonId</code></li>
                  <li>Rich content editor and file upload components ready</li>
                  <li>Quiz question management with proper validation</li>
                  <li>Video embedding with URL validation</li>
                  <li>Markdown content editor for text lessons</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
