"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp,
  User,
  Mail,
  Calendar,
  BookOpen,
  Target,
  Settings,
  Camera,
  Save,
  ArrowLeft,
  Trophy,
  Clock,
  Star
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { mockUserProgress, getUserCourses } from "@/lib/mock-data"
import { getActivitySummary, formatTimeAgo } from "@/lib/data-utils"
import { toast } from "sonner"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: 'Passionate about learning the Pakistan Stock Exchange and building a strong investment portfolio.',
    location: 'Karachi, Pakistan',
    joinDate: 'January 2024'
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Please sign in to access your profile</h1>
          <Link href="/signin">
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  const userProgressData = mockUserProgress.filter(p => p.userId === user.id)
  const enrolledCourses = getUserCourses(user.id)
  const activitySummary = getActivitySummary(userProgressData)

  const achievements = [
    {
      id: 1,
      title: 'First Course Complete',
      description: 'Completed your first course',
      icon: BookOpen,
      earned: activitySummary.completedCourses > 0,
      earnedDate: '2024-01-15'
    },
    {
      id: 2,
      title: 'Quiz Master',
      description: 'Scored 90% or higher on 5 quizzes',
      icon: Target,
      earned: false,
      earnedDate: null
    },
    {
      id: 4,
      title: 'Consistent Learner',
      description: '7-day learning streak',
      icon: Trophy,
      earned: true,
      earnedDate: '2024-02-10'
    }
  ]

  const recentActivity = [
    {
      id: 1,
      type: 'course_complete',
      title: 'Completed PSX Fundamentals',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      details: 'Completed with 88% average score'
    },
    {
      id: 2,
      type: 'quiz_complete',
      title: 'Quiz: Support and Resistance',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      details: 'Scored 92% (23/25 correct)'
    },
    {
      id: 3,
      type: 'lesson_complete',
      title: 'Understanding Market Participants',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      details: 'Completed in 18 minutes'
    }
  ]

  const handleSaveProfile = () => {
    // In a real app, this would make an API call
    toast.success('Profile updated successfully!')
    setIsEditing(false)
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
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
            
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback className="text-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-background/90 backdrop-blur dark:bg-background/60"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground">
                        {user.firstName} {user.lastName}
                      </h1>
                      <p className="text-muted-foreground mt-1">{profileData.bio}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {user.email}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Joined {profileData.joinDate}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                        {user.role === 'admin' ? 'Administrator' : 'Student'}
                      </Badge>
                      <Button onClick={() => setIsEditing(!isEditing)} variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Courses Enrolled</p>
                      <p className="text-3xl font-bold text-foreground">{activitySummary.totalCourses}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Lessons Completed</p>
                      <p className="text-3xl font-bold text-foreground">{activitySummary.totalLessons}</p>
                    </div>
                    <Target className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Progress</p>
                      <p className="text-3xl font-bold text-foreground">{activitySummary.averageProgress}%</p>
                    </div>
                    <Trophy className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest learning activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.details}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(activity.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Learning Streak</CardTitle>
                  <CardDescription>Keep up the great work!</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-6xl font-bold text-yellow-600 mb-4">7</div>
                    <p className="text-lg font-medium text-foreground mb-2">Days in a row</p>
                    <p className="text-muted-foreground mb-4">You're on fire! 🔥</p>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-amber-500/20 dark:text-amber-200">
                      Streak Master
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
                <CardDescription>Track your progress across all enrolled courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrolledCourses.map((course) => {
                    const progress = userProgressData.find(p => p.courseId === course.id)
                    return (
                      <div key={course.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{course.title}</h3>
                          <p className="text-sm text-muted-foreground">StockMento Instructor</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Progress value={progress?.overallProgress || 0} className="flex-1" />
                            <span className="text-sm text-muted-foreground">{progress?.overallProgress || 0}%</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span>{progress?.completedLessons.length || 0} lessons completed</span>
                            <span>{progress?.completedQuizzes.length || 0} quizzes taken</span>
                          </div>
                        </div>
                        <Link href={`/courses/${course.id}`}>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            Continue
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>Your learning milestones and accomplishments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div 
                      key={achievement.id} 
                      className={`p-4 border rounded-lg ${
                        achievement.earned 
                          ? 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200 dark:from-emerald-500/10 dark:to-blue-500/10 dark:border-emerald-500/30' 
                          : 'bg-muted/40 border-border/60 dark:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          achievement.earned ? 'bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-muted/60 dark:bg-muted/40'
                        }`}>
                          <achievement.icon className={`h-6 w-6 ${
                            achievement.earned ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${
                            achievement.earned ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {achievement.title}
                          </h3>
                          <p className={`text-sm ${
                            achievement.earned ? 'text-muted-foreground' : 'text-muted-foreground'
                          }`}>
                            {achievement.description}
                          </p>
                          {achievement.earned && achievement.earnedDate && (
                            <p className="text-xs text-emerald-600 mt-1">
                              Earned on {achievement.earnedDate}
                            </p>
                          )}
                        </div>
                        {achievement.earned && (
                          <Star className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                {isEditing && (
                  <div className="flex space-x-3 pt-4">
                    <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
