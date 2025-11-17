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
  sections?: CourseSection[]; // Optional array of sections (aligned with lms.course_sections)
  lessons?: Lesson[]; // Optional array of lessons for detailed views
  enrollmentCount?: number; // Current active enrollments
  tags: string[]; // Course tags for filtering/searching
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean; // Publication status
  category: string; // Course category (e.g., "Technical Analysis", "Risk Management")
}

/**
 * Course Section Interface
 * Represents a section within a course containing grouped lessons
 * Aligned with lms.course_sections table in database
 */
export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  position: number; // Order within the course
  lessons?: Lesson[]; // Lessons within this section
  totalLessons: number; // Count of lessons in this section
  totalDuration: number; // Total duration in minutes
  description?: string; // Optional section description
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lesson Interface
 * Individual lesson within a course containing learning materials and metadata
 */
export interface Lesson {
  id: string;
  courseId: string;
  sectionId?: string; // Section this lesson belongs to (aligned with lms.course_lessons.section_id)
  title: string;
  description: string;
  type: 'text' | 'video' | 'quiz'; // Lesson content type
  content?: string; // Markdown content for text lessons
  videoUrl?: string; // YouTube URL for video lessons
  quizId?: string; // ID of embedded quiz for quiz lessons
  duration: number; // Duration in minutes
  order: number; // Lesson order within course or section
  position: number; // Position within section (aligned with lms.course_lessons.position)
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
  metadata?: Record<string, unknown>;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin';
  avatarId: string | null;
  status: 'active' | 'disabled' | 'pending';
}

export interface ProfileDetails {
  id: string;
  email: string;
  status: 'active' | 'disabled' | 'pending';
  firstName: string;
  lastName: string;
  avatarId: string | null;
  bio: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string | null;
  avatarId?: string | null;
  meta?: Record<string, unknown>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string | null;
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
  bio?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
}

export interface DeleteAccountPayload {
  password: string;
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

// ----------------------------------------
// Admin LMS (courses/sections/lessons) types
// ----------------------------------------

export type AdminCourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type AdminLessonContentType = 'video' | 'text' | 'quiz' | 'lab';

export interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: AdminCourseLevel;
  mediaUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sections?: AdminCourseSection[];
}

export interface AdminCourseSection {
  id: string;
  courseId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  lessons?: AdminCourseLessonLink[];
}

export interface AdminCourseLessonLink {
  courseId: string;
  sectionId: string;
  lessonId: string;
  position: number;
  lesson: AdminLesson;
}

export interface AdminLesson {
  id: string;
  title: string;
  contentType: AdminLessonContentType;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
  video?: AdminLessonVideo | null;
  text?: AdminLessonText | null;
  quizLink?: AdminLessonQuizLink | null;
  labLink?: AdminLessonLabLink | null;
}

export interface AdminLessonVideo {
  lessonId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds: number;
  transcript?: string | null;
}

export interface AdminLessonText {
  lessonId: string;
  bodyHtml: string;
  readTimeMinutes: number;
}

export type AdminQuizQuestionType = 'single' | 'multiple' | 'true_false';

export interface AdminLessonQuizLink {
  lessonId: string;
  quizId: string;
  quiz: AdminQuiz | null;
}

export interface AdminQuiz {
  id: string;
  title: string;
  passScore: number;
  questions: AdminQuizQuestion[];
}

export interface AdminQuizQuestion {
  id: string;
  promptHtml: string;
  type: AdminQuizQuestionType;
  position: number;
  points: number;
  choices: AdminQuizChoice[];
}

export interface AdminQuizChoice {
  id: string;
  choiceHtml: string;
  isCorrect: boolean;
}

export interface AdminLessonLabLink {
  lessonId: string;
  labId: string;
}

export interface CreateCoursePayload {
  title: string;
  slug: string;
  description: string;
  level: AdminCourseLevel;
  mediaUrl?: string | null;
  isPublished?: boolean;
}

export type UpdateCoursePayload = Partial<CreateCoursePayload>;

export interface CreateSectionPayload {
  title: string;
  position?: number;
}

export type UpdateSectionPayload = Partial<CreateSectionPayload>;

export interface ReorderSectionsPayload {
  sections: Array<{
    sectionId: string;
    position: number;
  }>;
}

export interface CreateLessonPayload {
  title: string;
  contentType: AdminLessonContentType;
  durationMinutes: number;
  position?: number;
  bodyHtml?: string;
  readTimeMinutes?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  transcript?: string;
  quiz?: QuizPayload;
}

export type UpdateLessonPayload = Partial<CreateLessonPayload>;

export interface ReorderLessonsPayload {
  lessons: Array<{
    lessonId: string;
    position: number;
  }>;
}

export interface QuizPayload {
  title: string;
  passScore: number;
  questions: QuizPayloadQuestion[];
}

export interface QuizPayloadQuestion {
  promptHtml: string;
  type: AdminQuizQuestionType;
  points: number;
  choices: QuizPayloadChoice[];
}

export interface QuizPayloadChoice {
  choiceHtml: string;
  isCorrect: boolean;
}

// ----------------------------------------
// Public course shapes
// ----------------------------------------

export interface PublicCourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: AdminCourseLevel;
  mediaUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  totalLessons: number;
  sectionsCount: number;
  durationMinutes: number;
}

export interface PublicCourseDetail extends PublicCourseSummary {
  sections: PublicCourseSection[];
}

export interface PublicCourseSection {
  id: string;
  title: string;
  position: number;
  lessons: PublicCourseLesson[];
}

export interface PublicCourseLesson {
  id: string;
  title: string;
  contentType: AdminLessonContentType;
  durationMinutes: number;
  description?: string | null;
}

export interface PublicLessonText {
  bodyHtml: string;
  readTimeMinutes: number;
}

export interface PublicLessonVideo {
  videoUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds: number;
  transcript?: string | null;
}

export interface PublicLessonQuizChoice {
  id: string;
  choiceHtml: string;
  isCorrect: boolean;
}

export interface PublicLessonQuizQuestion {
  id: string;
  promptHtml: string;
  type: AdminQuizQuestionType;
  points: number;
  choices: PublicLessonQuizChoice[];
}

export interface PublicLessonQuiz {
  id: string;
  title: string;
  passScore: number;
  questions: PublicLessonQuizQuestion[];
}

export interface PublicLessonLab {
  id: string;
  title: string;
  labUrl: string;
  instructionsHtml: string;
  metadata?: Record<string, unknown> | null;
}

export interface PublicLessonDetail {
  id: string;
  title: string;
  contentType: AdminLessonContentType;
  durationMinutes: number;
  description?: string | null;
  course: PublicCourseSummary;
  section: {
    id: string;
    title: string;
    position: number;
  };
  text: PublicLessonText | null;
  video: PublicLessonVideo | null;
  quiz: PublicLessonQuiz | null;
  lab: PublicLessonLab | null;
}

export type CourseEnrollmentStatus = 'active' | 'completed' | 'dropped';

export interface CourseEnrollmentSummary {
  id: string;
  courseId: string;
  status: CourseEnrollmentStatus;
  progressPercent: number | null;
  startedAt: string | null;
  completedAt: string | null;
  course: PublicCourseSummary;
}

export type LessonProgressState = 'not_started' | 'in_progress' | 'completed';

export interface LessonProgressRecord {
  status: LessonProgressState;
  completedAt: string | null;
}

export interface SectionProgressSummary {
  id: string;
  title: string;
  position: number;
  totalLessons: number;
  completedLessons: number;
  lessons: Array<{
    id: string;
    title: string;
    status: LessonProgressState;
    completedAt: string | null;
  }>;
}

export interface CourseProgressSummary {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  sections: SectionProgressSummary[];
  lessons: Record<string, LessonProgressRecord>;
}

export interface LearningStreakSummary {
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
}
