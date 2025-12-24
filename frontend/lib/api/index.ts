// API service functions ready for NestJS backend integration
// These functions will replace the mock data calls when backend is implemented

import {
  User,
  UserProgress,
  AuthUser,
  ProfileDetails,
  UpdateProfilePayload,
  DeleteAccountPayload,
  AdminCourse,
  AdminCourseSection,
  AdminLesson,
  CreateCoursePayload,
  UpdateCoursePayload,
  CreateSectionPayload,
  UpdateSectionPayload,
  ReorderSectionsPayload,
  CreateLessonPayload,
  UpdateLessonPayload,
  ReorderLessonsPayload,
  PublicCourseSummary,
  PublicCourseDetail,
  CourseEnrollmentSummary,
  PublicLessonDetail,
  CourseProgressSummary,
  LessonProgressState,
  LearningStreakSummary,
  StudentActivityItem,
  AdminDashboardSummary,
  SimPortfolio,
  SimTick,
  SimKlinePoint,
  SimAccountStatusResponse,
} from '../types'
import { STORAGE_KEYS } from '../data-utils'

type ApiJson = Record<string, unknown>

type AuthSuccessResponse = {
  user: AuthUser
  tokens: {
    accessToken: string
    refreshToken?: string
  }
}

type MessageResponse = {
  message: string
}

type UpdatePasswordPayload = {
  currentPassword: string
  newPassword: string
}

type UpdateLessonProgressPayload = {
  status: LessonProgressState
}

type SimulatorOrderPayload = {
  symbol: string
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit' | 'stop_limit'
  quantity: number
  limitPrice?: number
  triggerPrice?: number
  stopLimitPrice?: number
  currentPrice?: number
  buyVolume?: number
  sellVolume?: number
}

type SimulatorStartResponse = {
  portfolio: SimPortfolio
  ticks: SimTick[]
  symbol: string
}

type SimulatorTickerResponse = Record<string, SimTick | null>

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const isBrowser = typeof window !== 'undefined'

const buildQueryString = (params: Record<string, string | number | undefined | null>) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

// Track if a token refresh is already in progress to avoid multiple simultaneous refresh attempts
let isRefreshing = false
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = []

const getStoredAccessToken = (): string | null => {
  if (!isBrowser) {
    return null
  }

  const sessionRole = localStorage.getItem(STORAGE_KEYS.SESSION_ROLE)

  if (sessionRole === 'admin') {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)
  }

  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
}

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

async function refreshAccessToken(): Promise<string> {
  // Refresh token is now in HttpOnly cookie, no need to send it in body
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Send cookies with request
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  const data = await response.json() as AuthSuccessResponse

  // Store only the access token (refresh token is in HttpOnly cookie)
  if (isBrowser) {
    if (data.user.role === 'admin') {
      localStorage.setItem(STORAGE_KEYS.SESSION_ROLE, 'admin')
      localStorage.setItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN, data.tokens.accessToken)
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER)
    } else {
      localStorage.setItem(STORAGE_KEYS.SESSION_ROLE, 'student')
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken)
      localStorage.removeItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.ADMIN_USER)
    }
  }

  return data.tokens.accessToken
}

/**
 * Checks if an endpoint is an authentication endpoint that should NOT trigger automatic token refresh.
 * These endpoints return 401 for auth failures (wrong credentials, invalid tokens), not expired tokens.
 */
function isAuthenticationEndpoint(endpoint: string): boolean {
  const authEndpoints = [
    '/auth/login',           // User login - 401 means invalid credentials
    '/auth/register',        // User registration - 401 means validation error
    '/auth/refresh',         // Token refresh - 401 means refresh token invalid (prevents infinite loop)
    '/auth/admin/login',     // Admin login - 401 means invalid credentials
  ]
  
  return authEndpoints.some(authEndpoint => endpoint === authEndpoint)
}

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
    let token = getStoredAccessToken()

    if (!token) {
      token =
        localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ??
        localStorage.getItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)
    }

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  let response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    body,
    credentials: 'include', // Always include cookies (for refresh token)
  })

  // Handle 401 Unauthorized - Token might be expired
  // Don't try to refresh on authentication endpoints - those 401s are auth failures, not expired tokens
  if (response.status === 401 && isBrowser && !isAuthenticationEndpoint(endpoint)) {
    if (isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        // Retry with new token
        const newToken = getStoredAccessToken() ?? localStorage.getItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)
        if (newToken) {
          requestHeaders.set('Authorization', `Bearer ${newToken}`)
        }
        return fetch(url, { ...rest, headers: requestHeaders, body, credentials: 'include' }).then(async (retryResponse) => {
          if (!retryResponse.ok) {
            const errorText = await retryResponse.text().catch(() => '')
            let message = `${retryResponse.status} ${retryResponse.statusText}`
            if (errorText) {
              try {
                const parsed = JSON.parse(errorText)
                if (parsed && typeof parsed === 'object' && 'message' in parsed && parsed.message) {
                  message = String(parsed.message)
                }
              } catch {
                message = errorText
              }
            }
            throw new Error(message)
          }
          if (retryResponse.status === 204) return undefined as T
          const text = await retryResponse.text()
          return (text ? JSON.parse(text) : undefined) as T
        })
      }) as Promise<T>
    }

    isRefreshing = true

    try {
      const newAccessToken = await refreshAccessToken()
      requestHeaders.set('Authorization', `Bearer ${newAccessToken}`)
      processQueue(null, newAccessToken)

      // Retry the original request with new token
      response = await fetch(url, {
        ...rest,
        headers: requestHeaders,
        body,
        credentials: 'include', // Include cookies for retry
      })
    } catch (refreshError) {
      processQueue(refreshError as Error, null)
      // Clear tokens and redirect to login
      if (isBrowser) {
        const sessionRole = localStorage.getItem(STORAGE_KEYS.SESSION_ROLE)

        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        localStorage.removeItem(STORAGE_KEYS.ADMIN_USER)

        if (sessionRole === 'admin') {
          window.location.href = '/admin/login'
        } else {
          window.location.href = '/signin'
        }

        localStorage.removeItem(STORAGE_KEYS.SESSION_ROLE)
      }
      throw refreshError
    } finally {
      isRefreshing = false
    }
  }

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
  getAllCourses: async (): Promise<AdminCourse[]> => {
    return apiCall<AdminCourse[]>('/admin/courses')
  },

  // Get single course (admin)
  getCourse: async (courseId: string): Promise<AdminCourse> => {
    return apiCall<AdminCourse>(`/admin/courses/${courseId}`)
  },

  // Create new course
  createCourse: async (courseData: CreateCoursePayload): Promise<AdminCourse> => {
    return apiCall<AdminCourse>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    })
  },

  // Update course
  updateCourse: async (courseId: string, courseData: UpdateCoursePayload): Promise<AdminCourse> => {
    return apiCall<AdminCourse>(`/admin/courses/${courseId}`, {
      method: 'PATCH',
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

// Course sections management
export const courseSectionApi = {
  createSection: async (
    courseId: string,
    payload: CreateSectionPayload,
  ): Promise<AdminCourseSection> => {
    return apiCall<AdminCourseSection>(`/admin/courses/${courseId}/sections`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateSection: async (
    courseId: string,
    sectionId: string,
    payload: UpdateSectionPayload,
  ): Promise<AdminCourseSection> => {
    return apiCall<AdminCourseSection>(
      `/admin/courses/${courseId}/sections/${sectionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    )
  },

  reorderSections: async (
    courseId: string,
    payload: ReorderSectionsPayload,
  ): Promise<void> => {
    return apiCall<void>(`/admin/courses/${courseId}/sections`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  deleteSection: async (
    courseId: string,
    sectionId: string,
  ): Promise<AdminCourseSection> => {
    return apiCall<AdminCourseSection>(
      `/admin/courses/${courseId}/sections/${sectionId}`,
      {
        method: 'DELETE',
      },
    )
  },
}

// Public Courses APIs
export const publicCoursesApi = {
  list: async (): Promise<PublicCourseSummary[]> => {
    return apiCall<PublicCourseSummary[]>('/courses')
  },

  detail: async (courseId: string): Promise<PublicCourseDetail> => {
    return apiCall<PublicCourseDetail>(`/courses/${courseId}`)
  },

  lessonDetail: async (
    courseId: string,
    lessonId: string,
  ): Promise<PublicLessonDetail> => {
    return apiCall<PublicLessonDetail>(`/courses/${courseId}/lessons/${lessonId}`)
  },
}

// Student-facing course APIs
export const studentCoursesApi = {
  enroll: async (courseId: string): Promise<CourseEnrollmentSummary> => {
    return apiCall<CourseEnrollmentSummary>(`/courses/${courseId}/enroll`, {
      method: 'POST',
    })
  },

  drop: async (courseId: string): Promise<CourseEnrollmentSummary> => {
    return apiCall<CourseEnrollmentSummary>(`/courses/${courseId}/enroll`, {
      method: 'DELETE',
    })
  },

  list: async (): Promise<CourseEnrollmentSummary[]> => {
    return apiCall<CourseEnrollmentSummary[]>('/courses/me/enrollments')
  },

  get: async (courseId: string): Promise<CourseEnrollmentSummary | null> => {
    return apiCall<CourseEnrollmentSummary | null>(
      `/courses/${courseId}/enrollment`,
    )
  },

  getLearningStreak: async (): Promise<LearningStreakSummary> => {
    return apiCall<LearningStreakSummary>('/courses/me/streak')
  },

  getRecentActivity: async (): Promise<StudentActivityItem[]> => {
    return apiCall<StudentActivityItem[]>('/courses/me/activity')
  },

  getProgress: async (courseId: string): Promise<CourseProgressSummary> => {
    return apiCall<CourseProgressSummary>(`/courses/${courseId}/progress`)
  },

  updateLessonProgress: async (
    courseId: string,
    lessonId: string,
    payload: UpdateLessonProgressPayload,
  ): Promise<CourseProgressSummary> => {
    return apiCall<CourseProgressSummary>(
      `/courses/${courseId}/lessons/${lessonId}/progress`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    )
  },
}

// Lesson Management APIs
export const lessonApi = {
  createLesson: async (
    courseId: string,
    sectionId: string,
    payload: CreateLessonPayload,
  ): Promise<AdminLesson> => {
    return apiCall<AdminLesson>(
      `/admin/courses/${courseId}/sections/${sectionId}/lessons`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
  },

  updateLesson: async (
    courseId: string,
    sectionId: string,
    lessonId: string,
    payload: UpdateLessonPayload,
  ): Promise<AdminLesson> => {
    return apiCall<AdminLesson>(
      `/admin/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    )
  },

  reorderLessons: async (
    courseId: string,
    sectionId: string,
    payload: ReorderLessonsPayload,
  ): Promise<void> => {
    return apiCall<void>(
      `/admin/courses/${courseId}/sections/${sectionId}/lessons`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    )
  },

  deleteLesson: async (
    courseId: string,
    sectionId: string,
    lessonId: string,
  ): Promise<AdminLesson> => {
    return apiCall<AdminLesson>(
      `/admin/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
      {
        method: 'DELETE',
      },
    )
  },
}
// Simulator APIs
export const simulatorApi = {
  account: async (): Promise<SimAccountStatusResponse> => {
    return apiCall<SimAccountStatusResponse>('/simulator/account')
  },
  start: async (symbol = 'ATRL'): Promise<SimulatorStartResponse> => {
    const query = buildQueryString({ symbol })
    return apiCall<SimulatorStartResponse>(`/simulator/start_simulator${query}`)
  },
  tickers: async (symbols?: string): Promise<SimulatorTickerResponse> => {
    const query = buildQueryString({ symbols })
    return apiCall<SimulatorTickerResponse>(`/simulator/tickers${query}`)
  },
  klines: async (symbol = 'ATRL', timeframe: '1d' | '15m' = '1d'): Promise<SimKlinePoint[]> => {
    const query = buildQueryString({ symbol, timeframe })
    return apiCall<SimKlinePoint[]>(`/simulator/klines${query}`)
  },
  placeOrder: async (payload: SimulatorOrderPayload): Promise<SimPortfolio> => {
    return apiCall<SimPortfolio>(`/simulator/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  cancelOrder: async (orderId: string): Promise<SimPortfolio> => {
    return apiCall<SimPortfolio>(`/simulator/orders/${orderId}`, {
      method: 'DELETE',
    })
  },
}


// Analytics APIs
export const analyticsApi = {
  // Get dashboard stats
  getDashboardStats: async (): Promise<AdminDashboardSummary> => {
    return apiCall<AdminDashboardSummary>('/admin/analytics/dashboard')
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
  refreshToken: async (refreshToken?: string): Promise<AuthSuccessResponse> => {
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
  publicCourses: publicCoursesApi,
  studentCourses: studentCoursesApi,
  courses: courseApi,
  courseSections: courseSectionApi,
  lessons: lessonApi,
  analytics: analyticsApi,
  files: fileApi,
  auth: authApi,
  profile: profileApi,
  progress: progressApi,
  simulator: simulatorApi,
}

export default api





