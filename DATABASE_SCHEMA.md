# Database Schema for StockMento PSX Learning App

This document outlines the PostgreSQL database schema ready for NestJS backend integration.

## Tables Overview

### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFDATABASE_USERNAME=stockmento_user
DATABASE_PASSWORD=your_password_here
DATABASE_NAME=stockmento_dbT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    is_active BOOLEAN DEFAULT true,
    profile_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
```

### 2. Courses Table
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    long_description TEXT,
    level VARCHAR(20) NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    thumbnail_url VARCHAR(500),
    price DECIMAL(10,2) DEFAULT 0.00,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_students INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    tags TEXT[], -- PostgreSQL array type
    category VARCHAR(100),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_courses_level ON courses(level);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_price ON courses(price);
```

### 3. Lessons Table
```sql
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'video', 'quiz')),
    content TEXT, -- Markdown content for text lessons
    video_url VARCHAR(500), -- YouTube or other video URLs
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL,
    is_locked BOOLEAN DEFAULT false,
    prerequisite_lesson_ids UUID[], -- Array of prerequisite lesson IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_type ON lessons(type);
CREATE INDEX idx_lessons_order ON lessons(course_id, order_index);
```

### 4. Quizzes Table
```sql
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER,
    passing_score INTEGER DEFAULT 70, -- Percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);
```

### 5. Quiz Questions Table
```sql
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('multiple-choice', 'true-false', 'short-answer')),
    options JSONB, -- Store answer options as JSON array
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);
```

### 6. User Progress Table
```sql
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_lessons UUID[], -- Array of completed lesson IDs
    completed_quizzes UUID[], -- Array of completed quiz IDs
    overall_progress INTEGER DEFAULT 0, -- Percentage
    total_time_spent INTEGER DEFAULT 0, -- Minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX idx_user_progress_enrollment ON user_progress(enrollment_date);
```

### 7. Lesson Progress Table
```sql
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    progress_percentage INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_course_id ON lesson_progress(course_id);
```

### 8. Quiz Attempts Table
```sql
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- Percentage
    answers JSONB NOT NULL, -- Store user answers as JSON
    is_passed BOOLEAN NOT NULL,
    time_taken_minutes INTEGER DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_course_id ON quiz_attempts(course_id);
```

### 9. Case Studies Table
```sql
CREATE TABLE case_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown content
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    estimated_time_minutes INTEGER DEFAULT 30,
    tags TEXT[],
    scenario TEXT NOT NULL,
    objectives TEXT[],
    key_takeaways TEXT[],
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_studies_difficulty ON case_studies(difficulty);
CREATE INDEX idx_case_studies_published ON case_studies(is_published);
```

### 10. File Uploads Table
```sql
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    entity_type VARCHAR(50), -- 'course', 'lesson', 'user_avatar', etc.
    entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
CREATE INDEX idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
```

## NestJS Entity Relationships

### Key Relationships:
- **User** → **UserProgress** (One-to-Many)
- **Course** → **Lessons** (One-to-Many)
- **Course** → **Quizzes** (One-to-Many)
- **Quiz** → **QuizQuestions** (One-to-Many)
- **User** → **QuizAttempts** (One-to-Many)
- **User** → **LessonProgress** (One-to-Many)

### Cascade Operations:
- Deleting a course deletes all related lessons, quizzes, and progress
- Deleting a user deletes all their progress and attempts
- Deleting a lesson deletes all related progress

## Environment Variables for NestJS

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=stockmento_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=stockmento_db

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h

# File Upload
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=50MB

# API
API_PREFIX=api
API_VERSION=v1
```

## Sample Data Seeding

The existing mock data in `lib/mock-data.ts` and `lib/lessons-data.ts` can be used to seed the database with initial course content.

## Database Migrations

When setting up NestJS with TypeORM/Prisma, these table structures should be created as migration files to ensure proper database versioning and deployment.