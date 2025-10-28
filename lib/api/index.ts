// API service functions ready for NestJS backend integration
// These functions will replace the mock data calls when backend is implemented

import { Course, Lesson, User, UserProgress, AuthUser, ProfileDetails, UpdateProfilePayload, DeleteAccountPayload } from '../types'
import { STORAGE_KEYS } from '../data-utils'

type ApiJson = Record<string, unknown>

type AuthSuccessResponse = {
  user: AuthUser
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

type MessageResponse = {
  message: string
}

type UpdatePasswordPayload = {
  currentPassword: string
  newPassword: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const isBrowser = typeof window !== 'undefined'

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Base fetch wrapper used across the app to ensure consistent headers + error parsing.
  const url = `${API_BASE_URL}${endpoint}`
  const { headers, body, ...rest } = options
  const requestHeaders = new Headers(headers as HeadersInit | undefined)
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  if (!isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (isBrowser) {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || localStorage.getItem('admin_token')
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    body,
  })

  if (!response.ok) {
    // Try to surface backend-supplied messages so the UI can show specific errors (e.g. "Please verify your email").
    const errorText = await response.text().catch(() => '')

    let message = `${response.status} ${response.statusText}`

    if (errorText) {
      try {
        const parsed = JSON.parse(errorText)
        if (parsed && typeof parsed === 'object' && 'message' in parsed && parsed.message) {
          message = String(parsed.message)
        } else {
          message = errorText
        }
      } catch {
        message = errorText
      }
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// Course Management APIs
export const courseApi = {
  // Get all courses (admin)
  getAllCourses: async (): Promise<Course[]> => {
    return apiCall<Course[]>('/admin/courses')
  },

  // Get single course (admin)
  getCourse: async (courseId: string): Promise<Course> => {
    return apiCall<Course>(`/admin/courses/${courseId}`)
  },

  // Create new course
  createCourse: async (courseData: Partial<Course>): Promise<Course> => {
    return apiCall<Course>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    })
  },

  // Update course
  updateCourse: async (courseId: string, courseData: Partial<Course>): Promise<Course> => {
    return apiCall<Course>(`/admin/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    })
  },

  // Delete course
  deleteCourse: async (courseId: string): Promise<void> => {
    return apiCall<void>(`/admin/courses/${courseId}`, {
      method: 'DELETE',
    })
  },

  // Get course analytics
  getCourseAnalytics: async (courseId: string): Promise<ApiJson> => {
    return apiCall<ApiJson>(`/admin/courses/${courseId}/analytics`)
  },

  // Get course students
  getCourseStudents: async (courseId: string): Promise<User[]> => {
    return apiCall<User[]>(`/admin/courses/${courseId}/students`)
  },
}

// Lesson Management APIs
export const lessonApi = {
  // Get lessons for a course
  getLessonsByCourse: async (courseId: string): Promise<Lesson[]> => {
    return apiCall<Lesson[]>(`/admin/courses/${courseId}/lessons`)
  },

  // Get single lesson
  getLesson: async (courseId: string, lessonId: string): Promise<Lesson> => {
    return apiCall<Lesson>(`/admin/courses/${courseId}/lessons/${lessonId}`)
  },

  // Create new lesson
  createLesson: async (courseId: string, lessonData: Partial<Lesson>): Promise<Lesson> => {
    return apiCall<Lesson>(`/admin/courses/${courseId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(lessonData),
    })
  },

  // Update lesson
  updateLesson: async (courseId: string, lessonId: string, lessonData: Partial<Lesson>): Promise<Lesson> => {
    return apiCall<Lesson>(`/admin/courses/${courseId}/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    })
  },

  // Delete lesson
  deleteLesson: async (courseId: string, lessonId: string): Promise<void> => {
    return apiCall<void>(`/admin/courses/${courseId}/lessons/${lessonId}`, {
      method: 'DELETE',
    })
  },

  // Reorder lessons
  reorderLessons: async (courseId: string, lessonOrders: { lessonId: string, order: number }[]): Promise<void> => {
    return apiCall<void>(`/admin/courses/${courseId}/lessons/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ lessonOrders }),
    })
  },
}

// Analytics APIs
export const analyticsApi = {
  // Get dashboard stats
  getDashboardStats: async (): Promise<ApiJson> => {
    return apiCall<ApiJson>('/admin/analytics/dashboard')
  },

  // Get course analytics
  getCourseAnalytics: async (courseId?: string): Promise<ApiJson> => {
    const endpoint = courseId ? `/admin/analytics/courses/${courseId}` : '/admin/analytics/courses'
    return apiCall<ApiJson>(endpoint)
  },

  // Get user analytics
  getUserAnalytics: async (): Promise<ApiJson> => {
    return apiCall<ApiJson>('/admin/analytics/users')
  },

  // Get revenue analytics
  getRevenueAnalytics: async (): Promise<ApiJson> => {
    return apiCall<ApiJson>('/admin/analytics/revenue')
  },
}

// File Upload APIs
export const fileApi = {
  // Upload course thumbnail
  uploadCourseThumbnail: async (courseId: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiCall<{ url: string }>(`/admin/courses/${courseId}/thumbnail`, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    })
  },

  // Upload lesson video
  uploadLessonVideo: async (courseId: string, lessonId: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiCall<{ url: string }>(`/admin/courses/${courseId}/lessons/${lessonId}/video`, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    })
  },

  // Upload lesson attachments
  uploadLessonAttachment: async (courseId: string, lessonId: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiCall<{ url: string }>(`/admin/courses/${courseId}/lessons/${lessonId}/attachments`, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    })
  },
}

// Authentication APIs (ready for JWT integration)
export const authApi = {
  // Admin login
  adminLogin: async (credentials: { email: string; password: string }): Promise<AuthSuccessResponse> => {
    return apiCall<AuthSuccessResponse>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // User login
  userLogin: async (credentials: { email: string; password: string }): Promise<AuthSuccessResponse> => {
    return apiCall<AuthSuccessResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // User registration
  userRegister: async (userData: { email: string; password: string; firstName: string; lastName: string; avatarId?: string; bio?: string }): Promise<MessageResponse> => {
    return apiCall<MessageResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  // Send verification code
  sendVerificationCode: async (payload: { email: string }): Promise<MessageResponse> => {
    return apiCall<MessageResponse>('/auth/verification/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Verify email with code and complete registration
  verifyEmail: async (payload: { email: string; code: string }): Promise<AuthSuccessResponse> => {
    return apiCall<AuthSuccessResponse>('/auth/verification/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<AuthSuccessResponse> => {
    return apiCall<AuthSuccessResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },

  // Logout
  logout: async (): Promise<MessageResponse> => {
    return apiCall<MessageResponse>('/auth/logout', {
      method: 'POST',
    })
  },

  // Password reset request
  requestPasswordReset: async (payload: { email: string }): Promise<MessageResponse> => {
    return apiCall<MessageResponse>('/auth/password/reset/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Password reset confirmation
  confirmPasswordReset: async (payload: { email: string; token: string; password: string }): Promise<MessageResponse> => {
    return apiCall<MessageResponse>('/auth/password/reset/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Fetch current user profile
  me: async (): Promise<AuthUser> => {
    return apiCall<AuthUser>('/auth/me')
  },
}

// Profile APIs
export const profileApi = {
  getProfile: async (): Promise<ProfileDetails> => {
    return apiCall<ProfileDetails>('/profile/me')
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<ProfileDetails> => {
    return apiCall<ProfileDetails>('/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  updatePassword: async (payload: UpdatePasswordPayload): Promise<MessageResponse> => {
    return apiCall<MessageResponse>('/profile/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  deleteProfile: async (payload: DeleteAccountPayload): Promise<MessageResponse> => {
    return apiCall<MessageResponse>('/profile/me', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    })
  },
}

// Progress Tracking APIs
export const progressApi = {
  // Update lesson progress
  updateLessonProgress: async (
    courseId: string, 
    lessonId: string, 
    progress: { completed: boolean; timeSpent: number; score?: number }
  ): Promise<void> => {
    return apiCall<void>(`/progress/courses/${courseId}/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(progress),
    })
  },

  // Get user's course progress
  getCourseProgress: async (courseId: string): Promise<UserProgress> => {
    return apiCall<UserProgress>(`/progress/courses/${courseId}`)
  },

  // Get all user progress
  getAllProgress: async (): Promise<UserProgress[]> => {
    return apiCall<UserProgress[]>('/progress')
  },
}

// Export all APIs
export const api = {
  courses: courseApi,
  lessons: lessonApi,
  analytics: analyticsApi,
  files: fileApi,
  auth: authApi,
  profile: profileApi,
  progress: progressApi,
}

export default api



