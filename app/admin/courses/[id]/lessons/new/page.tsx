"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrendingUp, 
  ArrowLeft, 
  Save, 
  FileText,
  PlayCircle,
  BookOpen,
  AlertCircle,
  Plus
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { mockCourses, getLessonsByCourseId } from "@/lib/mock-data"
import { toast } from "sonner"

interface NewLessonFormData {
  title: string
  description: string
  type: 'text' | 'video' | 'quiz'
  content?: string
  videoUrl?: string
  duration: number
  isLocked: boolean
}

export default function AdminNewLessonPage({ params }: { params: { id: string } }) {
  const { adminUser } = useAdminAuth()
  const router = useRouter()
  const courseId = params.id
  
  // Find course - in future this will be an API call
  const course = mockCourses.find(c => c.id === courseId)
  const existingLessons = getLessonsByCourseId(courseId)
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<NewLessonFormData>({
    title: '',
    description: '',
    type: 'text',
    content: '',
    videoUrl: '',
    duration: 10,
    isLocked: false
  })

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

  const handleInputChange = (field: keyof NewLessonFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a lesson title')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a lesson description')
      return
    }

    setIsLoading(true)
    
    try {
      // TODO: Replace with actual API call to NestJS backend
      // const newLesson = {
      //   ...formData,
      //   courseId,
      //   order: existingLessons.length + 1,
      //   id: `lesson_${Date.now()}`,
      //   prerequisiteIds: [],
      //   createdAt: new Date(),
      //   updatedAt: new Date()
      // }
      
      // const response = await fetch(`/api/admin/courses/${courseId}/lessons`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newLesson)
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Lesson created successfully!')
      
      // Navigate back to course management
      router.push(`/admin/courses/${courseId}`)
      
    } catch (error) {
      console.error('Error creating lesson:', error)
      toast.error('Failed to create lesson. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
              <Link href="/admin/courses" className="text-muted-foreground hover:text-foreground">
                Courses
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link href={`/admin/courses/${courseId}`} className="text-muted-foreground hover:text-foreground truncate max-w-32">
                {course.title}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">New Lesson</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/courses/${courseId}`}>
                <Button variant="outline" className="bg-background/60">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create New Lesson</h1>
            <p className="text-muted-foreground">Add a new lesson to "{course.title}"</p>
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Creating...' : 'Create Lesson'}
          </Button>
        </div>

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
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter lesson title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of what students will learn"
                  rows={3}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Lesson Type</Label>
                  <Select value={formData.type} onValueChange={(value: any) => handleInputChange('type', value)}>
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
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 10)}
                    placeholder="Estimated time"
                    min="1"
                    max="180"
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

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {formData.type === 'text' && <FileText className="h-5 w-5" />}
                {formData.type === 'video' && <PlayCircle className="h-5 w-5" />}
                {formData.type === 'quiz' && <BookOpen className="h-5 w-5" />}
                Content Setup
              </CardTitle>
              <CardDescription>
                Initial content configuration for your {formData.type} lesson
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Text Content */}
              {formData.type === 'text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="content">Initial Content (Markdown)</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="# Lesson Title&#10;&#10;Write your lesson content here using Markdown formatting...&#10;&#10;## Key Points&#10;- Point 1&#10;- Point 2&#10;&#10;**Bold text** and *italic text* are supported."
                      rows={10}
                      className="font-mono"
                    />
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You can add basic content now and enhance it later with the full content editor.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Video Content */}
              {formData.type === 'video' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Video URL (Optional)</Label>
                    <Input
                      id="videoUrl"
                      value={formData.videoUrl}
                      onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You can add the video URL now or later when editing the lesson. Video upload functionality will be available with backend integration.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Quiz Content */}
              {formData.type === 'quiz' && (
                <div className="space-y-4">
                  <Alert>
                    <BookOpen className="h-4 w-4" />
                    <AlertDescription>
                      Quiz questions will be added after creating the lesson. You'll be able to add multiple questions with different types and explanations.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Context */}
          <Card>
            <CardHeader>
              <CardTitle>Course Context</CardTitle>
              <CardDescription>This lesson will be added to "{course.title}"</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground">Current Lessons</p>
                  <p className="text-2xl font-bold">{existingLessons.length}</p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground">New Position</p>
                  <p className="text-2xl font-bold">{existingLessons.length + 1}</p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground">Course Level</p>
                  <Badge variant="secondary">{course.level}</Badge>
                </div>
              </div>
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
                <p>This lesson creation form is prepared for NestJS backend integration:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Form data structure matches PostgreSQL schema requirements</li>
                  <li>API endpoint ready: <code>POST /api/admin/courses/:courseId/lessons</code></li>
                  <li>Automatic lesson ordering and position management</li>
                  <li>Validation and error handling implemented</li>
                  <li>Content type switching with appropriate fields</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}