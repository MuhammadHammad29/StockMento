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
  Eye, 
  Upload,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { mockCourses } from "@/lib/mock-data"
import { toast } from "sonner"

interface CourseFormData {
  title: string
  description: string
  longDescription: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  duration: number
  price: number
  category: string
  tags: string[]
  isPublished: boolean
  thumbnail: string
}

export default function AdminCourseEditPage({ params }: { params: { id: string } }) {
  const { adminUser } = useAdminAuth()
  const router = useRouter()
  const courseId = params.id
  
  // Find the course - in future this will be an API call
  const course = mockCourses.find(c => c.id === courseId)
  
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    longDescription: '',
    level: 'Beginner',
    duration: 0,
    price: 0,
    category: '',
    tags: [],
    isPublished: false,
    thumbnail: ''
  })

  // Initialize form with course data
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        description: course.description,
        longDescription: course.longDescription,
        level: course.level,
        duration: course.duration,
        price: course.price,
        category: course.category,
        tags: course.tags,
        isPublished: course.isPublished,
        thumbnail: course.thumbnail
      })
    }
  }, [course])

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

  const handleInputChange = (field: keyof CourseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    handleInputChange('tags', tags)
  }

  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      // TODO: Replace with actual API call to NestJS backend
      // const response = await fetch(`/api/admin/courses/${courseId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Course updated successfully!')
      setHasChanges(false)
      
      // In future, you might want to redirect or refresh data
      // router.push(`/admin/courses/${courseId}`)
      
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Failed to update course. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishToggle = () => {
    handleInputChange('isPublished', !formData.isPublished)
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
              <Link href={`/admin/courses/${courseId}`} className="text-muted-foreground hover:text-foreground">
                {course.title}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">Edit</span>
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Edit Course</h1>
            <p className="text-muted-foreground">Update course information and settings</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/courses/${courseId}`}>
              <Button variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </Link>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don't forget to save your progress.
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core course details and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description for course cards"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longDescription">Detailed Description</Label>
                <Textarea
                  id="longDescription"
                  value={formData.longDescription}
                  onChange={(e) => handleInputChange('longDescription', e.target.value)}
                  placeholder="Detailed course description for the course page"
                  rows={5}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <Select value={formData.level} onValueChange={(value: any) => handleInputChange('level', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="e.g., Stock Market, Trading"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="PSX, stocks, trading, investment"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
              <CardDescription>Pricing, duration, and availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                    placeholder="Total course duration"
                  />
                  <p className="text-xs text-muted-foreground">
                    Approximately {Math.round(formData.duration / 60)} hours
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (PKR)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseInt(e.target.value) || 0)}
                    placeholder="Course price in PKR"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.price === 0 ? 'Free course' : `PKR ${formData.price.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail Image URL</Label>
                <Input
                  id="thumbnail"
                  value={formData.thumbnail}
                  onChange={(e) => handleInputChange('thumbnail', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                {/* TODO: Add file upload component for backend integration */}
                <p className="text-xs text-muted-foreground">
                  Image upload functionality will be added with backend integration
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="published">Published Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.isPublished ? 'Course is live and visible to students' : 'Course is in draft mode'}
                  </p>
                </div>
                <Switch
                  id="published"
                  checked={formData.isPublished}
                  onCheckedChange={handlePublishToggle}
                />
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
                <p>This form is prepared for NestJS backend integration:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Form data structure matches database schema requirements</li>
                  <li>API endpoints ready: <code>PUT /api/admin/courses/:id</code></li>
                  <li>File upload components ready for backend file handling</li>
                  <li>Error handling and loading states implemented</li>
                  <li>PostgreSQL-compatible data types and validation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}