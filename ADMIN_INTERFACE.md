# StockMento PSX Learning App - Admin Interface

## Overview

The admin interface has been fully implemented and is ready for NestJS backend integration with PostgreSQL. DATABASE_USERNAME=stockmento_user
DATABASE_PASSWORD=your_password_here
DATABASE_NAME=stockmento_dbs system provides comprehensive lesson and course management capabilities.

## Admin Features Implemented

### 1. Course Management
- **Course List** (`/admin/courses`) - View all courses with stats
- **Course Detail** (`/admin/courses/[id]`) - Detailed course view with tabs for lessons, analytics, students, and settings
- **Course Editor** (`/admin/courses/[id]/edit`) - Full course editing interface
- **Course Creation** - Ready for implementation

### 2. Lesson Management
- **Lesson Editor** (`/admin/courses/[id]/lessons/[lessonId]/edit`) - Comprehensive lesson editing
- **New Lesson** (`/admin/courses/[id]/lessons/new`) - Create new lessons
- **Lesson Types Supported**:
  - 📝 **Text Lessons** - Markdown content editor
  - 🎥 **Video Lessons** - YouTube URL integration
  - 📊 **Quiz Lessons** - Interactive quiz builder

### 3. Content Types

#### Text Lessons
- Markdown editor for rich content
- Support for headings, lists, bold, italic
- Ready for rich text editor integration

#### Video Lessons
- YouTube URL embedding
- Video preview functionality
- Ready for direct video upload

#### Quiz Lessons
- Multiple question types:
  - Multiple choice
  - True/False
  - Short answer
- Question management (add, edit, delete)
- Point assignment
- Explanations for answers

### 4. Admin Dashboard
- User statistics
- Course analytics
- Recent activity
- Revenue tracking (ready for backend)

### 5. User Management
- User listing (`/admin/users`)
- User progress tracking
- Enrollment management

## File Structure

```
app/admin/
├── page.tsx                              # Admin dashboard
├── layout.tsx                           # Admin layout with auth
├── login/
│   └── page.tsx                         # Admin login
├── courses/
│   ├── page.tsx                         # Course management
│   ├── loading.tsx                      # Loading state
│   └── [id]/
│       ├── page.tsx                     # Course detail view
│       ├── edit/
│       │   └── page.tsx                 # Course editor
│       └── lessons/
│           ├── new/
│           │   └── page.tsx             # New lesson creator
│           └── [lessonId]/
│               └── edit/
│                   └── page.tsx         # Lesson editor
├── users/
│   ├── page.tsx                         # User management
│   └── loading.tsx                      # Loading state
└── analytics/
    └── page.tsx                         # Analytics dashboard
```

## Backend Integration Ready

### 1. API Service Layer
- Complete API service in `lib/api/index.ts`
- Ready for NestJS endpoints
- JWT authentication support
- File upload handling

### 2. Database Schema
- PostgreSQL schema documented in `DATABASE_SCHEMA.md`
- UUID primary keys
- Proper relationships and indexes
- Ready for TypeORM/Prisma integration

### 3. Data Structure Compatibility
- Frontend data types match database schema
- Existing mock data can seed database
- Progress tracking system ready

## Current Admin Credentials

**Email:** `admin@stockmento.com`  
**Password:** `admin123`

## How to Edit Lessons

### Option 1: Through Admin Interface (Recommended for Backend)

1. **Login to Admin Panel**
   ```
   http://localhost:3000/admin/login
   ```

2. **Navigate to Course Management**
   ```
   Admin Dashboard → Courses → Select Course → Lessons Tab
   ```

3. **Edit Existing Lesson**
   - Click "Edit" button next to any lesson
   - Modify content, video URLs, or quiz questions
   - Save changes

4. **Create New Lesson**
   - Click "Add Lesson" button
   - Choose lesson type (Text/Video/Quiz)
   - Fill in content and settings
   - Save to create

### Option 2: Direct File Editing (Current Development)

For immediate content updates during development:

1. **Edit lesson content in:**
   ```
   lib/lessons-data.ts
   ```

2. **Find lesson by ID and modify:**
   - `content` field for text lessons
   - `videoUrl` field for video lessons
   - Quiz data in quiz objects

## Backend Integration Steps

### 1. NestJS Setup
```bash
# Create NestJS backend
npm i -g @nestjs/cli
nest new stockmento-backend
cd stockmento-backend

# Install dependencies
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/config
npm install multer @nestjs/platform-express
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb stockmento_db

# Run migrations using schema from DATABASE_SCHEMA.md
```

### 3. Environment Configuration
```env
# Backend .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=stockmento_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=stockmento_db
JWT_SECRET=your_jwt_secret
```

### 4. Frontend Configuration
```env
# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 5. API Endpoints to Implement

#### Course Management
- `GET /api/admin/courses` - List all courses
- `GET /api/admin/courses/:id` - Get course details
- `POST /api/admin/courses` - Create course
- `PUT /api/admin/courses/:id` - Update course
- `DELETE /api/admin/courses/:id` - Delete course

#### Lesson Management
- `GET /api/admin/courses/:courseId/lessons` - List lessons
- `GET /api/admin/courses/:courseId/lessons/:id` - Get lesson
- `POST /api/admin/courses/:courseId/lessons` - Create lesson
- `PUT /api/admin/courses/:courseId/lessons/:id` - Update lesson
- `DELETE /api/admin/courses/:courseId/lessons/:id` - Delete lesson

#### User Management
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user

#### Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

#### File Upload
- `POST /api/upload/course-thumbnail` - Upload course image
- `POST /api/upload/lesson-video` - Upload lesson video
- `POST /api/upload/lesson-attachment` - Upload attachments

## Frontend Features Ready for Backend

### 1. Form Handling
- All forms have proper validation
- Loading states implemented
- Error handling ready
- Success notifications

### 2. Content Management
- Markdown editor for text content
- Video URL validation and embedding
- Quiz question builder with multiple types
- File upload components (ready for backend)

### 3. Real-time Updates
- State management ready for real-time data
- Optimistic updates implemented
- Cache invalidation strategies

### 4. Authentication
- JWT token handling
- Role-based access control
- Session management
- Logout functionality

## Migration from Mock Data

When backend is ready:

1. **Replace mock imports** in admin pages:
   ```typescript
   // Remove
   import { mockCourses, mockUsers } from "@/lib/mock-data"
   
   // Replace with
   import { api } from "@/lib/api"
   ```

2. **Update data fetching**:
   ```typescript
   // Before
   const courses = mockCourses
   
   // After
   const courses = await api.courses.getAllCourses()
   ```

3. **Enable API calls** by uncommenting API calls in form handlers

## Testing the Admin Interface

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Access admin panel**:
   ```
   http://localhost:3000/admin/login
   ```

3. **Test course management**:
   - View course list
   - Edit course details
   - Manage lessons
   - Create new content

4. **Test lesson editing**:
   - Edit text content with Markdown
   - Add YouTube video URLs
   - Create quiz questions

The admin interface is fully functional with mock data and ready for seamless backend integration!