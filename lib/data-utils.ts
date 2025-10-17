import { Course, Lesson, Quiz, UserProgress, User, CourseFilter } from './types';

// Local storage keys
export const STORAGE_KEYS = {
  USER: 'psx_user',
  PROGRESS: 'psx_progress',
  COURSES: 'psx_courses',
  PREFERENCES: 'psx_preferences',
} as const;

// Progress calculation utilities
export const calculateCourseProgress = (
  courseId: string,
  completedLessons: string[],
  completedQuizzes: string[],
  totalLessons: number,
  totalQuizzes: number
): number => {
  const lessonWeight = 0.7; // 70% weight for lessons
  const quizWeight = 0.3; // 30% weight for quizzes

  const lessonProgress = totalLessons > 0 ? (completedLessons.length / totalLessons) * 100 : 0;
  const quizProgress = totalQuizzes > 0 ? (completedQuizzes.length / totalQuizzes) * 100 : 0;

  return Math.round((lessonProgress * lessonWeight) + (quizProgress * quizWeight));
};

export const calculateOverallProgress = (userProgress: UserProgress[]): number => {
  if (userProgress.length === 0) return 0;
  
  const totalProgress = userProgress.reduce((sum, progress) => sum + progress.overallProgress, 0);
  return Math.round(totalProgress / userProgress.length);
};

export const getCompletionRate = (completed: number, total: number): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

// Time formatting utilities
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

export const formatTimeAgo = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
  }
};

// Course filtering and searching utilities
export const filterCourses = (courses: Course[], filters: CourseFilter): Course[] => {
  return courses.filter(course => {
    // Level filter
    if (filters.level && filters.level.length > 0) {
      if (!filters.level.includes(course.level)) {
        return false;
      }
    }
    
    // Category filter
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.includes(course.category)) {
        return false;
      }
    }
    
    // Rating filter
    if (filters.rating && course.rating < filters.rating) {
      return false;
    }
    
    return true;
  });
};

export const sortCourses = (
  courses: Course[], 
  sortBy: 'title' | 'rating' | 'students' | 'date' = 'title',
  sortOrder: 'asc' | 'desc' = 'asc'
): Course[] => {
  return [...courses].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'rating':
        comparison = a.rating - b.rating;
        break;
      case 'students':
        comparison = a.totalStudents - b.totalStudents;
        break;
      case 'date':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

// Local storage utilities
export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromStorage = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// Progress tracking utilities
export const markLessonComplete = (
  userProgress: UserProgress[],
  userId: string,
  courseId: string,
  lessonId: string
): UserProgress[] => {
  const progressIndex = userProgress.findIndex(
    p => p.userId === userId && p.courseId === courseId
  );
  
  if (progressIndex === -1) {
    // Create new progress record
    const newProgress: UserProgress = {
      userId,
      courseId,
      enrollmentDate: new Date(),
      lastAccessedAt: new Date(),
      completedLessons: [lessonId],
      completedQuizzes: [],
      overallProgress: 0, // Will be calculated
    };
    return [...userProgress, newProgress];
  }
  
  // Update existing progress
  const updatedProgress = [...userProgress];
  const current = updatedProgress[progressIndex];
  
  if (!current.completedLessons.includes(lessonId)) {
    current.completedLessons.push(lessonId);
    current.lastAccessedAt = new Date();
  }
  
  return updatedProgress;
};

export const markQuizComplete = (
  userProgress: UserProgress[],
  userId: string,
  courseId: string,
  quizId: string
): UserProgress[] => {
  const progressIndex = userProgress.findIndex(
    p => p.userId === userId && p.courseId === courseId
  );
  
  if (progressIndex === -1) {
    const newProgress: UserProgress = {
      userId,
      courseId,
      enrollmentDate: new Date(),
      lastAccessedAt: new Date(),
      completedLessons: [],
      completedQuizzes: [quizId],
      overallProgress: 0,
    };
    return [...userProgress, newProgress];
  }
  
  const updatedProgress = [...userProgress];
  const current = updatedProgress[progressIndex];
  
  if (!current.completedQuizzes.includes(quizId)) {
    current.completedQuizzes.push(quizId);
    current.lastAccessedAt = new Date();
  }
  
  return updatedProgress;
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// URL utilities
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};

export const getYouTubeVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Analytics utilities
export const calculateAverageRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
};

export const getActivitySummary = (userProgress: UserProgress[]) => {
  const totalCourses = userProgress.length;
  const completedCourses = userProgress.filter(p => p.overallProgress === 100).length;
  const totalLessons = userProgress.reduce((sum, p) => sum + p.completedLessons.length, 0);
  const totalQuizzes = userProgress.reduce((sum, p) => sum + p.completedQuizzes.length, 0);
  
  return {
    totalCourses,
    completedCourses,
    totalLessons,
    totalQuizzes,
    averageProgress: calculateOverallProgress(userProgress),
  };
};