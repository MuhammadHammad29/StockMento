// API service functions ready for NestJS backend integration
// These functions will replace the mock data calls when backend is implemented

import { Course, Lesson, User, UserProgress } from '../types'

// Base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Helper function for API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add authentication token if available
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
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
  getCourseAnalytics: async (courseId: string): Promise<any> => {
    return apiCall<any>(`/admin/courses/${courseId}/analytics`)
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
  getDashboardStats: async (): Promise<any> => {
    return apiCall<any>('/admin/analytics/dashboard')
  },

  // Get course analytics
  getCourseAnalytics: async (courseId?: string): Promise<any> => {
    const endpoint = courseId ? `/admin/analytics/courses/${courseId}` : '/admin/analytics/courses'
    return apiCall<any>(endpoint)
  },

  // Get user analytics
  getUserAnalytics: async (): Promise<any> => {
    return apiCall<any>('/admin/analytics/users')
  },

  // Get revenue analytics
  getRevenueAnalytics: async (): Promise<any> => {
    return apiCall<any>('/admin/analytics/revenue')
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
  adminLogin: async (credentials: { email: string; password: string }): Promise<{ token: string; user: any }> => {
    return apiCall<{ token: string; user: any }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // User login
  userLogin: async (credentials: { email: string; password: string }): Promise<{ token: string; user: any }> => {
    return apiCall<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // User registration
  userRegister: async (userData: { email: string; password: string; firstName: string; lastName: string }): Promise<{ token: string; user: any }> => {
    return apiCall<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  // Refresh token
  refreshToken: async (): Promise<{ token: string }> => {
    return apiCall<{ token: string }>('/auth/refresh', {
      method: 'POST',
    })
  },

  // Logout
  logout: async (): Promise<void> => {
    return apiCall<void>('/auth/logout', {
      method: 'POST',
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
  progress: progressApi,
}

export default api
