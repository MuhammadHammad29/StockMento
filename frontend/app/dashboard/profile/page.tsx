"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  Target,
  Settings,
  Camera,
  Save,
  BarChart3,
  Star,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { profileApi, studentCoursesApi } from "@/lib/api"
import { getAvatarPath, getDefaultAvatarId } from "@/lib/avatar-utils"
import { formatTimeAgo } from "@/lib/data-utils"
import type { CourseEnrollmentSummary } from "@/lib/types"
import { isPasswordValid } from "@/lib/password-utils"
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator"
import { toast } from "sonner"
import AvatarPicker from "@/components/avatar-picker"
import { UserNavbar } from "@/components/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const formatJoinedDate = (iso?: string | null) => {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth()
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarUpdating, setAvatarUpdating] = useState(false)
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    bio: "",
    joinDate: "",
    avatarId: user?.avatarId ?? null,
  })
  const [enrollments, setEnrollments] = useState<CourseEnrollmentSummary[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [coursesError, setCoursesError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setProfileLoading(false)
      return
    }

    let isMounted = true

    const loadProfile = async () => {
      setProfileLoading(true)
      try {
        const profile = await profileApi.getProfile()
        if (!isMounted) return

        // Only update profile data if user is not actively editing
        // This prevents losing unsaved changes when avatar updates trigger refreshUser()
        setProfileData((prev) => {
          if (isEditing) {
            // Preserve edited fields, only update avatar if changed
            return {
              ...prev,
              avatarId: profile.avatarId ?? prev.avatarId,
            }
          }
          // Not editing, safe to load all data
          return {
            firstName: profile.firstName ?? "",
            lastName: profile.lastName ?? "",
            email: profile.email,
            bio: profile.bio ?? "",
            joinDate: formatJoinedDate(profile.createdAt),
            avatarId: profile.avatarId ?? null,
          }
        })
      } catch (error) {
        if (!isMounted) return
        console.error(error)
        toast.error(error instanceof Error ? error.message : "Failed to load profile details")
      } finally {
        if (isMounted) {
          setProfileLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [user, isEditing])

  useEffect(() => {
    if (!user) {
      setEnrollments([])
      return
    }

    let cancelled = false

    const loadEnrollments = async () => {
      setIsLoadingCourses(true)
      try {
        const data = await studentCoursesApi.list()
        if (cancelled) return
        setEnrollments(data.filter((enrollment) => enrollment.status !== "dropped"))
        setCoursesError(null)
      } catch (error) {
        console.error("Failed to load enrollments", error)
        if (!cancelled) {
          setEnrollments([])
          setCoursesError("Unable to load your courses right now.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCourses(false)
        }
      }
    }

    void loadEnrollments()

    return () => {
      cancelled = true
    }
  }, [user])

  const overviewSummary = useMemo(() => {
    if (enrollments.length === 0) {
      return {
        totalCourses: 0,
        completedCourses: 0,
        completedLessons: 0,
        averageProgress: 0,
      }
    }

    const completedCourses = enrollments.filter((enrollment) => enrollment.status === "completed").length
    const completedLessons = enrollments.reduce((sum, enrollment) => {
      const lessons = enrollment.course.totalLessons ?? 0
      const percent = enrollment.progressPercent ?? 0
      return sum + Math.round((percent / 100) * lessons)
    }, 0)
    const averageProgress = Math.round(
      enrollments.reduce((sum, enrollment) => sum + (enrollment.progressPercent ?? 0), 0) / enrollments.length,
    )

    return {
      totalCourses: enrollments.length,
      completedCourses,
      completedLessons,
      averageProgress,
    }
  }, [enrollments])

  const recentActivity = useMemo(() => {
    if (enrollments.length === 0) {
      return []
    }
    return enrollments
      .map((enrollment) => {
        const percent = enrollment.progressPercent ?? 0
        const timestamp =
          enrollment.completedAt ?? enrollment.startedAt ?? enrollment.course.updatedAt ?? enrollment.course.createdAt
        let title = ""
        let details = ""
        if (enrollment.status === "completed") {
          title = `Completed ${enrollment.course.title}`
          details = `Finished with ${percent}% progress`
        } else if (percent > 0) {
          title = `Progress in ${enrollment.course.title}`
          details = `Currently ${percent}% complete`
        } else {
          title = `Enrolled in ${enrollment.course.title}`
          details = "Getting started"
        }
        return {
          id: enrollment.id,
          title,
          details,
          date: timestamp,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
  }, [enrollments])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Please sign in to access your profile</h1>
          <Link href="/signin">
            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const resolvedAvatarId = profileData.avatarId ?? user.avatarId ?? getDefaultAvatarId()

  const handleSaveProfile = async () => {
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      toast.error("Please provide both first and last name")
      return
    }

    setSavingProfile(true)
    try {
      const updated = await profileApi.updateProfile({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        bio: profileData.bio.trim() ? profileData.bio.trim() : null,
        avatarId: profileData.avatarId ?? null,
      })

      setProfileData({
        firstName: updated.firstName ?? "",
        lastName: updated.lastName ?? "",
        email: updated.email,
        bio: updated.bio ?? "",
        joinDate: formatJoinedDate(updated.createdAt),
        avatarId: updated.avatarId ?? null,
      })

      await refreshUser()
      toast.success("Profile updated successfully!")
      setIsEditing(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarSelect = async (avatarId: string) => {
    if (!avatarId) {
      setShowAvatarPicker(false)
      return
    }

    setAvatarUpdating(true)
    try {
      const updated = await profileApi.updateProfile({ avatarId })

      // Update local state with new avatar
      setProfileData((prev) => ({
        ...prev,
        avatarId: updated.avatarId ?? avatarId,
      }))

      // Refresh user context to update navbar without losing form data
      await refreshUser()
      toast.success("Avatar updated successfully!")
      setShowAvatarPicker(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to update avatar")
    } finally {
      setAvatarUpdating(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      toast.error("Please enter your current password")
      return
    }

    if (!passwordData.newPassword) {
      toast.error("Please enter a new password")
      return
    }

    if (!isPasswordValid(passwordData.newPassword)) {
      toast.error("Password does not meet security requirements. Please check the password strength indicator.")
      return
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      toast.error("New password must be different from the current password")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setPasswordUpdating(true)
    try {
      const response = await profileApi.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      toast.success(response.message || "Password updated successfully!")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowChangePassword(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Unable to update password")
    } finally {
      setPasswordUpdating(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error("Please enter your password to confirm")
      return
    }

    setDeletingAccount(true)
    try {
      const response = await profileApi.deleteProfile({ password: deletePassword })
      toast.success(response.message || "Account deleted successfully.")
      setShowDeleteDialog(false)
      setDeletePassword("")
      await logout()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to delete account")
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <UserNavbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col space-y-4 sm:space-y-6">
                <div className="relative flex justify-center sm:justify-start">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                    <AvatarImage src={getAvatarPath(resolvedAvatarId)} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback className="text-xl sm:text-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="text-center sm:text-left space-y-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {user.firstName} {user.lastName}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1 px-2 sm:px-0">
                      {profileData.bio || "Add a short bio to personalize your profile."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center justify-center sm:justify-start">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </span>
                    <span className="flex items-center justify-center sm:justify-start">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      Joined {profileData.joinDate || "Recently"}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {user.role === "admin" ? "Administrator" : "Student"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-xs sm:text-sm">
              Courses
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Courses Enrolled</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{overviewSummary.totalCourses}</p>
                    </div>
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Lessons Completed</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{overviewSummary.completedLessons}</p>
                    </div>
                    <Target className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Average Progress</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{overviewSummary.averageProgress}%</p>
                    </div>
                    <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Courses Completed</p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{overviewSummary.completedCourses}</p>
                    </div>
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
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
                  <div className="space-y-3 sm:space-y-4">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm sm:text-base truncate">{activity.title}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">{activity.details}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(new Date(activity.date))}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {isLoadingCourses ? "Loading your activity..." : "No recent activity yet."}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Learning Progress</CardTitle>
                  <CardDescription>Overall completion status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span>Overall Completion</span>
                      <span className="font-semibold">{overviewSummary.averageProgress}%</span>
                    </div>
                    <Progress value={overviewSummary.averageProgress} className="h-3" />
                  </div>

                  <div className="space-y-3">
                    {enrollments.slice(0, 3).map((enrollment) => {
                      const completion = enrollment.progressPercent ?? 0
                      return (
                        <div key={enrollment.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground truncate">{enrollment.course.title}</span>
                            <span>{completion}%</span>
                          </div>
                          <Progress value={completion} className="h-2" />
                        </div>
                      )
                    })}

                    {enrollments.length === 0 && !isLoadingCourses && (
                      <p className="text-sm text-muted-foreground">
                        Enroll in a course to start tracking your progress.
                      </p>
                    )}
                    {isLoadingCourses && (
                      <p className="text-sm text-muted-foreground">Loading your courses...</p>
                    )}
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
                <div className="space-y-3 sm:space-y-4">
                  {coursesError && <p className="text-sm text-destructive">{coursesError}</p>}

                  {isLoadingCourses && (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading courses...
                    </div>
                  )}

                  {enrollments.map((enrollment) => {
                    const { course } = enrollment
                    const progress = enrollment.progressPercent ?? 0
                    return (
                      <div
                        key={enrollment.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 border rounded-lg"
                      >
                        <div className="relative w-full sm:w-16 h-32 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {course.mediaUrl ? (
                            <Image src={course.mediaUrl} alt={course.title} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <h3 className="text-base font-semibold text-foreground truncate">{course.title}</h3>
                            <span className="text-xs sm:text-sm text-muted-foreground">{progress}% complete</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                            <span>Lessons: {course.totalLessons}</span>
                            <span>Sections: {course.sectionsCount}</span>
                            <span>Level: {course.level}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {enrollments.length === 0 && !isLoadingCourses && (
                    <div className="text-center py-10">
                      <p className="text-sm text-muted-foreground mb-3">
                        You haven&apos;t enrolled in any courses yet. Start your learning journey today!
                      </p>
                      <Link href="/courses">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">Browse Courses</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Manage your personal details and preferences</CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant="outline"
                    size="sm"
                    disabled={profileLoading || savingProfile}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Profile Avatar</Label>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={getAvatarPath(resolvedAvatarId)} alt="Profile" />
                      <AvatarFallback>
                        <User className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        onClick={() => setShowAvatarPicker(true)}
                        variant="outline"
                        size="sm"
                        disabled={avatarUpdating}
                      >
                        {avatarUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Change Avatar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(event) => setProfileData({ ...profileData, firstName: event.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(event) => setProfileData({ ...profileData, lastName: event.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Email changes require support assistance.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm">
                    Bio
                  </Label>
                  <Input
                    id="bio"
                    value={profileData.bio}
                    onChange={(event) => setProfileData({ ...profileData, bio: event.target.value })}
                    disabled={!isEditing}
                    placeholder="Share a short introduction (optional)"
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-sm font-semibold">Password</Label>
                      <p className="text-xs text-muted-foreground">Update your account password</p>
                    </div>
                    <Button
                      onClick={() => setShowChangePassword(!showChangePassword)}
                      variant="outline"
                      size="sm"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {showChangePassword ? "Cancel" : "Change Password"}
                    </Button>
                  </div>

                  {showChangePassword && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(event) => setPasswordData({ ...passwordData, currentPassword: event.target.value })}
                            placeholder="Enter current password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm">
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(event) => setPasswordData({ ...passwordData, newPassword: event.target.value })}
                            placeholder="Enter new password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        
                        {/* Password Strength Indicator */}
                        <PasswordStrengthIndicator 
                          password={passwordData.newPassword} 
                          showRequirements={true}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(event) => setPasswordData({ ...passwordData, confirmPassword: event.target.value })}
                            placeholder="Confirm new password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        onClick={handleChangePassword}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        disabled={passwordUpdating}
                      >
                        {passwordUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Danger Zone</h3>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full sm:w-auto">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will remove all of your data from the platform. Enter your password to confirm.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="delete-password" className="text-sm">
                            Confirm with password
                          </Label>
                          <div className="relative">
                            <Input
                              id="delete-password"
                              type={showDeletePassword ? "text" : "password"}
                              value={deletePassword}
                              onChange={(event) => setDeletePassword(event.target.value)}
                              placeholder="Enter your current password"
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowDeletePassword(!showDeletePassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={deletingAccount}
                            onClick={async (event) => {
                              event.preventDefault()
                              await handleDeleteAccount()
                            }}
                          >
                            {deletingAccount ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <Button
                      onClick={handleSaveProfile}
                      className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                      disabled={savingProfile || profileLoading}
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={savingProfile}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showAvatarPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full max-h-[90vh] overflow-auto">
            <AvatarPicker
              selectedAvatarId={resolvedAvatarId}
              onAvatarSelect={(avatarId) => {
                void handleAvatarSelect(avatarId)
              }}
              onCancel={() => setShowAvatarPicker(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
