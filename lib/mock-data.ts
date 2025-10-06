/**
 * Mock Data for StockMento Learning Platform
 * 
 * Contains sample data for development and testing purposes.
 * Includes users, courses, lessons, quizzes, and progress tracking.
 * This data will be replaced with database queries when backend is integrated.
 */

import { Course, Lesson, Quiz, QuizQuestion, User, UserProgress } from './types';
import { comprehensiveLessons } from './lessons-data';

/**
 * Mock Users Data
 * Sample user accounts for testing authentication and user management features
 */
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatar: '/professional-user-photo.jpg',
    role: 'student',
    createdAt: new Date('2024-01-15'),
    lastLogin: new Date('2024-12-15'),
    isActive: true,
    profileCompleted: true,
  },
  {
    id: 'user-2',
    email: 'admin@psxacademy.com',
    firstName: 'Admin',
    lastName: 'User',
    avatar: '/professional-woman-instructor.jpg',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-12-17'),
    isActive: true,
    profileCompleted: true,
  },
  {
    id: 'user-3',
    email: 'sarah.ahmed@example.com',
    firstName: 'Sarah',
    lastName: 'Ahmed',
    avatar: '/user-profile-photo.png',
    role: 'student',
    createdAt: new Date('2024-02-20'),
    lastLogin: new Date('2024-12-16'),
    isActive: true,
    profileCompleted: true,
  }
];

// Mock Courses - 10 comprehensive PSX courses
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'PSX Fundamentals',
    description: 'Learn the basics of Pakistan Stock Exchange, market structure, and trading principles.',
    longDescription: 'This comprehensive course covers the fundamentals of Pakistan Stock Exchange, including market structure, key participants, trading mechanisms, and basic investment principles. Perfect for beginners who want to understand how PSX works.',
    level: 'Beginner',
    thumbnail: '/stock-market-basics.png',
    category: 'Market Basics',
    price: 0, // Free course
    rating: 4.8,
    totalStudents: 1250,
    totalLessons: 8,
    totalQuizzes: 1,
    duration: 178, // 8 lessons: 4 text (78 min) + 3 video (80 min) + 1 quiz (20 min)
    tags: ['PSX', 'Basics', 'Market Structure', 'Beginner'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
    isPublished: true,
  },
  {
    id: 'course-2',
    title: 'Technical Analysis',
    description: 'Master the art of reading charts, patterns, and technical indicators for PSX trading.',
    longDescription: 'Comprehensive technical analysis course covering chart patterns, indicators, and trading strategies specifically designed for Pakistan Stock Exchange. Learn to analyze price movements and make informed trading decisions.',
    level: 'Intermediate',
    thumbnail: '/technical-analysis-chart.png',
    category: 'Technical Analysis',
    price: 4999,
    rating: 4.7,
    totalStudents: 980,
    totalLessons: 10,
    totalQuizzes: 1,
    duration: 271, // 10 lessons: 5 text (131 min) + 4 video (115 min) + 1 quiz (25 min)
    tags: ['Technical Analysis', 'Charts', 'Patterns', 'Indicators'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
    isPublished: true,
  },
  {
    id: 'course-3',
    title: 'Risk Management',
    description: 'Learn essential risk management strategies for Pakistani stock market investing.',
    longDescription: 'Master risk management techniques including portfolio diversification, position sizing, and risk assessment tools specifically for PSX investing. Protect your capital while maximizing returns.',
    level: 'Intermediate',
    thumbnail: '/risk-management-concept.png',
    category: 'Risk Management',
    price: 3999,
    rating: 4.6,
    totalStudents: 720,
    totalLessons: 6,
    totalQuizzes: 1,
    duration: 130, // 6 lessons: 3 text (65 min) + 2 video (65 min) + 1 quiz (20 min)
    tags: ['Risk Management', 'Portfolio', 'Diversification', 'Protection'],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
    isPublished: true,
  },
  {
    id: 'course-4',
    title: 'Fundamental Analysis',
    description: 'Deep dive into company financials, valuation methods, and economic analysis.',
    longDescription: 'Comprehensive fundamental analysis course covering financial statement analysis, valuation models, industry analysis, and economic indicators relevant to Pakistani markets.',
    level: 'Advanced',
    thumbnail: '/technical-analysis-charts.png',
    category: 'Fundamental Analysis',
    price: 5999,
    rating: 4.9,
    totalStudents: 540,
    totalLessons: 12,
    totalQuizzes: 1,
    duration: 403, // 12 lessons: 6 text (150 min) + 5 video (223 min) + 1 quiz (30 min)
    tags: ['Fundamental Analysis', 'Valuation', 'Financial Statements', 'Economy'],
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
    isPublished: true,
  },
  {
    id: 'course-5',
    title: 'Options Trading',
    description: 'Advanced options strategies and derivatives trading in Pakistani markets.',
    longDescription: 'Learn options trading strategies, risk management with derivatives, and advanced trading techniques for experienced investors in Pakistani financial markets.',
    level: 'Advanced',
    thumbnail: '/risk-management-portfolio.jpg',
    category: 'Advanced Trading',
    price: 7999,
    rating: 4.8,
    totalStudents: 320,
    totalLessons: 15,
    totalQuizzes: 2,
    duration: 520,
    tags: ['Options', 'Derivatives', 'Advanced Trading', 'Strategies'],
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-12-08'),
    isPublished: true,
  },
  {
    id: 'course-6',
    title: 'Sector Analysis',
    description: 'Comprehensive analysis of key Pakistani economic sectors and industry trends.',
    longDescription: 'Deep dive into major Pakistani sectors including banking, textiles, energy, and technology. Learn sector-specific analysis techniques and investment opportunities.',
    level: 'Intermediate',
    thumbnail: '/diverse-user-avatars.png',
    category: 'Sector Analysis',
    price: 4499,
    rating: 4.5,
    totalStudents: 650,
    totalLessons: 10,
    totalQuizzes: 2,
    duration: 380,
    tags: ['Sectors', 'Industry Analysis', 'Banking', 'Energy'],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-12-14'),
    isPublished: true,
  },
  {
    id: 'course-7',
    title: 'Trading Psychology',
    description: 'Master the mental aspects of trading and investment decision-making.',
    longDescription: 'Understand behavioral finance, emotional control, and psychological factors affecting trading decisions. Develop a disciplined approach to investing.',
    level: 'Intermediate',
    thumbnail: '/placeholder-user.jpg',
    category: 'Psychology',
    price: 3499,
    rating: 4.4,
    totalStudents: 890,
    totalLessons: 8,
    totalQuizzes: 1,
    duration: 240,
    tags: ['Psychology', 'Behavioral Finance', 'Emotions', 'Discipline'],
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-12-13'),
    isPublished: true,
  },
  {
    id: 'course-8',
    title: 'Market Microstructure',
    description: 'Understanding PSX market mechanics, liquidity, and trading systems.',
    longDescription: 'Advanced course on market microstructure, order flow, market making, and the technical aspects of how PSX operates.',
    level: 'Advanced',
    thumbnail: '/placeholder-bbgaf.png',
    category: 'Market Structure',
    price: 6499,
    rating: 4.7,
    totalStudents: 280,
    totalLessons: 12,
    totalQuizzes: 2,
    duration: 450,
    tags: ['Market Structure', 'Liquidity', 'Order Flow', 'Advanced'],
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-12-09'),
    isPublished: true,
  },
  {
    id: 'course-9',
    title: 'Economic Indicators',
    description: 'Macroeconomic analysis and its impact on Pakistani stock markets.',
    longDescription: 'Learn to analyze economic indicators, monetary policy, and macroeconomic trends affecting Pakistani markets and investment decisions.',
    level: 'Intermediate',
    thumbnail: '/placeholder-twa2v.png',
    category: 'Economics',
    price: 4299,
    rating: 4.6,
    totalStudents: 440,
    totalLessons: 10,
    totalQuizzes: 2,
    duration: 350,
    tags: ['Economics', 'Indicators', 'Monetary Policy', 'Analysis'],
    createdAt: new Date('2024-09-01'),
    updatedAt: new Date('2024-12-07'),
    isPublished: true,
  },
  {
    id: 'course-10',
    title: 'Advanced Portfolio Management',
    description: 'Professional portfolio management techniques and institutional strategies.',
    longDescription: 'Advanced portfolio management course covering asset allocation, performance measurement, risk-adjusted returns, and institutional investment strategies.',
    level: 'Advanced',
    thumbnail: '/placeholder-x2x1n.png',
    category: 'Portfolio Management',
    price: 8999,
    rating: 4.9,
    totalStudents: 180,
    totalLessons: 18,
    totalQuizzes: 3,
    duration: 720,
    tags: ['Portfolio Management', 'Asset Allocation', 'Institutional', 'Advanced'],
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-12-11'),
    isPublished: true,
  }
];

// Mock Lessons - Import from separate file
export const mockLessons = comprehensiveLessons;

// Mock Quizzes
export const mockQuizzes: Quiz[] = [
  {
    id: 'quiz-1-1',
    courseId: 'course-1',
    title: 'PSX Fundamentals Assessment',
    description: 'Test your understanding of PSX basics and market fundamentals.',
    timeLimit: 20,
    passingScore: 70,
    questions: [
      {
        id: 'q1-1',
        question: 'When was the Pakistan Stock Exchange (PSX) formed through integration?',
        type: 'multiple-choice',
        options: ['2014', '2015', '2016', '2017'],
        correctAnswer: '2016',
        explanation: 'PSX was formed in 2016 through the integration of three former exchanges.',
        points: 10,
      },
      {
        id: 'q1-2',
        question: 'What are the trading hours of PSX?',
        type: 'multiple-choice',
        options: ['9:00 AM to 3:00 PM', '9:15 AM to 3:30 PM', '9:30 AM to 4:00 PM', '10:00 AM to 4:30 PM'],
        correctAnswer: '9:15 AM to 3:30 PM',
        explanation: 'PSX trading hours are from 9:15 AM to 3:30 PM, Monday to Friday.',
        points: 10,
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'quiz-2-1',
    courseId: 'course-2',
    title: 'Technical Analysis Mastery Quiz',
    description: 'Comprehensive assessment of technical analysis skills.',
    timeLimit: 25,
    passingScore: 70,
    questions: [
      {
        id: 'q2-1',
        question: 'What is the primary assumption of technical analysis?',
        type: 'multiple-choice',
        options: [
          'Market action discounts everything',
          'Prices move randomly',
          'Fundamental analysis is superior',
          'Volume is irrelevant'
        ],
        correctAnswer: 'Market action discounts everything',
        explanation: 'Technical analysis assumes that all market fundamentals are reflected in price.',
        points: 10,
      },
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-05'),
  },
  {
    id: 'quiz-3-1',
    courseId: 'course-3',
    title: 'Risk Management Assessment',
    description: 'Test your understanding of risk management principles.',
    timeLimit: 20,
    passingScore: 70,
    questions: [
      {
        id: 'q3-1',
        question: 'What is the main benefit of portfolio diversification?',
        type: 'multiple-choice',
        options: [
          'Guaranteed profits',
          'Risk reduction',
          'Higher returns',
          'Lower costs'
        ],
        correctAnswer: 'Risk reduction',
        explanation: 'Diversification helps reduce portfolio risk by spreading investments across different assets.',
        points: 10,
      },
    ],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-12-10'),
  },
  {
    id: 'quiz-4-1',
    courseId: 'course-4',
    title: 'Fundamental Analysis Mastery Test',
    description: 'Comprehensive assessment of fundamental analysis skills.',
    timeLimit: 30,
    passingScore: 70,
    questions: [
      {
        id: 'q4-1',
        question: 'What does P/E ratio measure?',
        type: 'multiple-choice',
        options: [
          'Price to Equity',
          'Price to Earnings',
          'Profit to Expenses',
          'Portfolio to Equity'
        ],
        correctAnswer: 'Price to Earnings',
        explanation: 'P/E ratio measures the market price per share divided by earnings per share.',
        points: 10,
      },
    ],
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-12-12'),
  }
];

// Mock User Progress
export const mockUserProgress: UserProgress[] = [
  {
    userId: 'user-1',
    courseId: 'course-1',
    enrollmentDate: new Date('2024-11-01'),
    lastAccessedAt: new Date('2024-12-15'),
    completedLessons: ['lesson-1-1', 'lesson-1-2', 'lesson-1-3'],
    completedQuizzes: [],
    currentLesson: 'lesson-1-4',
    overallProgress: 38, // 3 out of 8 lessons
  },
  {
    userId: 'user-1',
    courseId: 'course-2',
    enrollmentDate: new Date('2024-11-15'),
    lastAccessedAt: new Date('2024-12-10'),
    completedLessons: ['lesson-2-1'],
    completedQuizzes: [],
    currentLesson: 'lesson-2-2',
    overallProgress: 10, // 1 out of 10 lessons
  },
  {
    userId: 'user-3',
    courseId: 'course-1',
    enrollmentDate: new Date('2024-10-15'),
    lastAccessedAt: new Date('2024-12-16'),
    completedLessons: ['lesson-1-1', 'lesson-1-2', 'lesson-1-3', 'lesson-1-4', 'lesson-1-5', 'lesson-1-6', 'lesson-1-7', 'lesson-1-8'],
    completedQuizzes: ['quiz-1-1'],
    overallProgress: 100, // All lessons completed
  }
];

// Helper functions
export const getCourseById = (id: string): Course | undefined => {
  return mockCourses.find(course => course.id === id);
};

export const getLessonsByCourseId = (courseId: string): Lesson[] => {
  return mockLessons.filter(lesson => lesson.courseId === courseId);
};

export const getQuizzesByCourseId = (courseId: string): Quiz[] => {
  return mockQuizzes.filter(quiz => quiz.courseId === courseId);
};

export const getUserProgress = (userId: string, courseId: string): UserProgress | undefined => {
  return mockUserProgress.find(progress => progress.userId === userId && progress.courseId === courseId);
};

export const searchCourses = (query: string, level?: string, category?: string): Course[] => {
  return mockCourses.filter(course => {
    const matchesQuery = course.title.toLowerCase().includes(query.toLowerCase()) ||
                        course.description.toLowerCase().includes(query.toLowerCase()) ||
                        course.category.toLowerCase().includes(query.toLowerCase()) ||
                        course.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
    
    const matchesLevel = !level || course.level === level;
    const matchesCategory = !category || course.category === category;
    
    return matchesQuery && matchesLevel && matchesCategory;
  });
};

export const getUserCourses = (userId: string): Course[] => {
  const userProgressList = mockUserProgress.filter(progress => progress.userId === userId);
  return userProgressList.map(progress => {
    const course = mockCourses.find(c => c.id === progress.courseId);
    return course;
  }).filter(Boolean) as Course[];
};