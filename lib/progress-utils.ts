export interface UserProgress {
  userId: string
  courseId: string
  lessonId?: string
  progress: number
  timeSpent: number
  completed: boolean
  score?: number
  attempts?: number
  lastUpdated: Date
}

export interface CourseStats {
  totalLessons: number
  completedLessons: number
  totalQuizzes: number
  completedQuizzes: number
  averageScore: number
  totalTimeSpent: number
  completionRate: number
}

export interface CompletionEvent {
  userId: string
  courseId: string
  completedAt: Date
  finalProgress: number
  shouldShowDialog: boolean
}

export const checkCourseCompletion = (
  userId: string,
  courseId: string,
  currentProgress: number,
  previousProgress: number
): CompletionEvent | null => {
  // Check if user just completed the course (reached 100% for the first time)
  const justCompleted = currentProgress >= 100 && previousProgress < 100;
  
  if (justCompleted) {
    return {
      userId,
      courseId,
      completedAt: new Date(),
      finalProgress: currentProgress,
      shouldShowDialog: true
    };
  }
  
  return null;
};

export class ProgressManager {
  private static instance: ProgressManager
  private progressData: Map<string, UserProgress> = new Map()

  static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager()
    }
    return ProgressManager.instance
  }

  // Save progress to localStorage (in production, this would be an API call)
  saveProgress(progress: UserProgress): void {
    const key = `${progress.userId}_${progress.courseId}_${progress.lessonId || "course"}`
    this.progressData.set(key, progress)

    // Persist to localStorage
    localStorage.setItem("user_progress", JSON.stringify(Array.from(this.progressData.entries())))
  }

  // Load progress from localStorage
  loadProgress(userId: string, courseId: string, lessonId?: string): UserProgress | null {
    const key = `${userId}_${courseId}_${lessonId || "course"}`
    return this.progressData.get(key) || null
  }

  // Get course statistics
  getCourseStats(userId: string, courseId: string): CourseStats {
    const courseProgress = Array.from(this.progressData.values()).filter(
      (p) => p.userId === userId && p.courseId === courseId,
    )

    const lessons = courseProgress.filter((p) => p.lessonId && !p.lessonId.includes("quiz"))
    const quizzes = courseProgress.filter((p) => p.lessonId && p.lessonId.includes("quiz"))

    return {
      totalLessons: lessons.length,
      completedLessons: lessons.filter((l) => l.completed).length,
      totalQuizzes: quizzes.length,
      completedQuizzes: quizzes.filter((q) => q.completed).length,
      averageScore: quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length || 0,
      totalTimeSpent: courseProgress.reduce((sum, p) => sum + p.timeSpent, 0),
      completionRate: (courseProgress.filter((p) => p.completed).length / courseProgress.length) * 100 || 0,
    }
  }

  // Get user's overall progress across all courses
  getOverallProgress(userId: string): {
    totalCourses: number
    completedCourses: number
    totalLessons: number
    completedLessons: number
    averageScore: number
    totalStudyTime: number
  } {
    const userProgress = Array.from(this.progressData.values()).filter((p) => p.userId === userId)

    const courses = new Set(userProgress.map((p) => p.courseId))
    const lessons = userProgress.filter((p) => p.lessonId && !p.lessonId.includes("quiz"))
    const quizzes = userProgress.filter((p) => p.lessonId && p.lessonId.includes("quiz"))

    return {
      totalCourses: courses.size,
      completedCourses: Array.from(courses).filter((courseId) => {
        const courseProgress = userProgress.filter((p) => p.courseId === courseId)
        return courseProgress.every((p) => p.completed)
      }).length,
      totalLessons: lessons.length,
      completedLessons: lessons.filter((l) => l.completed).length,
      averageScore: quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length || 0,
      totalStudyTime: userProgress.reduce((sum, p) => sum + p.timeSpent, 0),
    }
  }

  // Calculate study streak
  getStudyStreak(userId: string): number {
    const userProgress = Array.from(this.progressData.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())

    let streak = 0
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (const progress of userProgress) {
      const progressDate = new Date(progress.lastUpdated)
      progressDate.setHours(0, 0, 0, 0)

      const daysDiff = Math.floor((currentDate.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === streak) {
        streak++
      } else if (daysDiff > streak) {
        break
      }
    }

    return streak
  }

  // Initialize with sample data
  initializeSampleData(userId: string): void {
    const sampleProgress: UserProgress[] = [
      {
        userId,
        courseId: "1",
        lessonId: "lesson-1",
        progress: 100,
        timeSpent: 1800,
        completed: true,
        lastUpdated: new Date(),
      },
      {
        userId,
        courseId: "1",
        lessonId: "quiz-1",
        progress: 100,
        timeSpent: 600,
        completed: true,
        score: 92,
        attempts: 1,
        lastUpdated: new Date(),
      },
      {
        userId,
        courseId: "2",
        lessonId: "lesson-1",
        progress: 75,
        timeSpent: 1200,
        completed: false,
        lastUpdated: new Date(),
      },
    ]

    sampleProgress.forEach((progress) => this.saveProgress(progress))
  }
}

// Export singleton instance
export const progressManager = ProgressManager.getInstance()
