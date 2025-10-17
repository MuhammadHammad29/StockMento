/**
 * Type Definitions for StockMento Learning App
 * 
 * This file contains all TypeScript interfaces and types used throughout
 * the application for type safety and better development experience.
 * Includes user management, course content, progress tracking, and more.
 */

// Core type definitions for the StockMento Learning App

/**
 * User Interface
 * Represents a user account with authentication and profile information
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarId: string; // Selected avatar ID from predefined avatars
  role: 'student' | 'admin'; // User role for permission management
  createdAt: Date;
  lastLogin?: Date; // Track user activity
  isActive: boolean; // Account status
  profileCompleted: boolean; // Profile completion status
}

/**
 * Course Interface
 * Represents a complete trading course with all metadata and content structure
 */
export interface Course {
  id: string;
  title: string;
  description: string; // Short description for cards/lists
  longDescription: string; // Detailed description for course page
  level: 'Beginner' | 'Intermediate' | 'Advanced'; // Difficulty level
  duration: number; // Total duration in minutes for consistency with NestJS
  thumbnail: string; // Course image/thumbnail URL
  rating: number; // Average user rating (0-5)
  totalStudents: number; // Number of enrolled students
  totalLessons: number; // Count of lessons in course
  totalQuizzes: number; // Number of quizzes in the course
  lessons?: Lesson[]; // Optional array of lessons for detailed views
  enrollmentCount?: number; // Current active enrollments
  tags: string[]; // Course tags for filtering/searching
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean; // Publication status
  category: string; // Course category (e.g., "Technical Analysis", "Risk Management")
}

/**
 * Lesson Interface
 * Individual lesson within a course containing learning materials and metadata
 */
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: 'text' | 'video' | 'quiz'; // Lesson content type
  content?: string; // Markdown content for text lessons
  videoUrl?: string; // YouTube URL for video lessons
  quizId?: string; // ID of embedded quiz for quiz lessons
  duration: number; // Duration in minutes
  order: number; // Lesson order within course
  isLocked: boolean; // Whether lesson requires prerequisites
  prerequisiteIds?: string[]; // IDs of prerequisite lessons
  createdAt: Date;
  updatedAt: Date;
}

export interface Quiz {
  id: string;
  courseId: string; // Required - quiz must belong to a course
  title: string;
  description: string;
  timeLimit?: number; // in minutes
  passingScore: number; // percentage
  questions: QuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[]; // for multiple choice
  correctAnswer: string | number;
  explanation?: string;
  points: number;
}

export interface UserProgress {
  userId: string;
  courseId: string;
  enrollmentDate: Date;
  lastAccessedAt: Date;
  completedLessons: string[];
  completedQuizzes: string[];
  currentLesson?: string; // ID of current lesson being accessed
  overallProgress: number; // percentage
}

export interface QuizAnswer {
  questionId: string;
  userAnswer: string | number;
  isCorrect: boolean;
  timeSpent: number; // in seconds
}

export interface LessonProgress {
  userId: string;
  lessonId: string;
  startedAt: Date;
  completedAt?: Date;
  watchTime?: number; // for video lessons in seconds
  readingProgress?: number; // for text lessons in percentage
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}
export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalQuizzes: number;
  totalLessons: number;
  activeUsers: number;
  courseCompletions: number;
  averageQuizScore: number;
  popularCourses: Course[];
  recentActivities: AdminActivity[];
}

export interface AdminActivity {
  id: string;
  type: 'user_signup' | 'course_completion' | 'quiz_attempt' | 'lesson_completion';
  userId: string;
  userName: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Review Interface
 * User reviews and ratings for completed courses
 */
export interface Review {
  id: string;
  userId: string; // User who wrote the review
  courseId: string; // Course being reviewed
  userName: string; // Display name for the review
  userAvatarId: string; // User's avatar for display
  rating: number; // 1-5 star rating
  comment: string; // Review comment/text
  isVerifiedCompletion: boolean; // Whether user completed the course
  helpfulVotes?: number; // Number of users who found this helpful
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Review Submission Interface
 * Data structure for submitting new reviews
 */
export interface ReviewSubmission {
  courseId: string;
  rating: number;
  comment: string;
}

/**
 * Review Summary Interface
 * Aggregated review data for courses
 */
export interface ReviewSummary {
  courseId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin';
  avatarId: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatarId: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and search types
export interface CourseFilter {
  level?: string[];
  category?: string[];
  rating?: number;
  duration?: string;
}

export interface SearchParams {
  query?: string;
  filters?: CourseFilter;
  sortBy?: 'title' | 'rating' | 'students' | 'date';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
