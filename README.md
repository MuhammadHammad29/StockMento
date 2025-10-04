# StockMento - Pakistan Stock Exchange Learning Platform

## 📚 Overview

StockMento is a comprehensive online learning platform designed specifically for Pakistani investors who want to master the Pakistan Stock Exchange (PSX). The platform offers interactive courses, video lessons, case studies, and progress tracking to help users develop their trading and investment skills.

## 🚀 Features

### Core Learning Features
- **Interactive Courses**: Structured learning paths for different skill levels
- **Video Lessons**: Expert-led video content covering trading strategies
- **Case Studies**: Real-world PSX scenarios and analysis
- **Progress Tracking**: Detailed learning analytics and achievements
- **Quiz System**: Knowledge assessment and skill validation

### User Management
- **Authentication System**: Secure login/signup with persistent sessions
- **User Profiles**: Customizable profiles with progress tracking
- **Role-based Access**: Student and admin user roles
- **Dashboard**: Personalized learning dashboard

### Admin Features
- **Content Management**: Create and edit courses, lessons, and quizzes
- **User Management**: Monitor user activity and progress
- **Analytics**: Platform usage and engagement metrics
- **Course Publishing**: Control course visibility and availability

### Technical Features
- **Dark/Light Mode**: Theme toggle with system preference support
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Component Library**: Radix UI components with custom styling

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14.2.33 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Radix UI
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Mono
- **Theme**: next-themes
- **Toast**: Sonner

### Backend (Planned)
- **Framework**: NestJS
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **API**: RESTful endpoints

## 📁 Project Structure

```
app/
├── admin/              # Admin dashboard and management
│   ├── courses/        # Course management interface
│   ├── users/         # User management
│   ├── analytics/     # Platform analytics
│   └── login/         # Admin authentication
├── courses/           # Course listing and details
├── dashboard/         # User dashboard
├── signin/            # User authentication
├── signup/            # User registration
├── progress/          # Progress tracking
├── case-studies/      # Case study content
└── layout.tsx         # Root layout with providers

components/
├── ui/                # Reusable UI components
├── theme-provider.tsx # Theme management
└── theme-toggle.tsx   # Theme switcher

lib/
├── types.ts           # TypeScript type definitions
├── auth-context.tsx   # Authentication context
├── mock-data.ts       # Development data
├── data-utils.ts      # Data manipulation utilities
└── utils.ts           # General utility functions
```

## 🎯 Key Pages

### Public Pages
- **Landing Page** (`/`): Marketing page with features and CTA
- **Courses** (`/courses`): Browse available courses with filtering
- **Sign In** (`/signin`): User authentication
- **Sign Up** (`/signup`): User registration

### Authenticated Pages
- **Dashboard** (`/dashboard`): Personal learning overview
- **Course Details** (`/courses/[id]`): Individual course content
- **Lessons** (`/courses/[id]/lessons/[lessonId]`): Lesson content
- **Progress** (`/progress`): Learning progress tracking

### Admin Pages
- **Admin Dashboard** (`/admin`): Administrative overview
- **Course Management** (`/admin/courses`): Create/edit courses
- **User Management** (`/admin/users`): User administration
- **Analytics** (`/admin/analytics`): Platform metrics

## 💻 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd psx-learning-app1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the root directory:

```env
# Add environment variables here when backend is integrated
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Theme Configuration
The app supports automatic dark/light mode switching based on system preferences. Users can manually toggle themes using the floating button.

## 📊 Data Structure

### User Types
- **Student**: Regular learners with access to courses
- **Admin**: Platform administrators with management access

### Content Types
- **Courses**: Main learning containers with metadata
- **Lessons**: Individual learning units (text, video, quiz)
- **Quizzes**: Assessment tools with multiple choice questions
- **Case Studies**: Real-world trading scenarios

### Progress Tracking
- **Enrollment**: User course registrations
- **Completion**: Lesson and course completion status
- **Scores**: Quiz results and performance metrics

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Vercel Deployment
The app is optimized for Vercel deployment with analytics integration included.

## 🔄 Backend Integration

The frontend is prepared for backend integration with:
- API service layer (`lib/api/`)
- Database schema documentation (`DATABASE_SCHEMA.md`)
- Admin interface specifications (`ADMIN_INTERFACE.md`)
- TypeScript types for all entities

### Backend Setup (When Ready)
1. Create NestJS backend using provided schema
2. Set up PostgreSQL database
3. Configure JWT authentication
4. Update API endpoints in frontend
5. Replace mock data with API calls

## 🎨 Design System

### Color Scheme
- **Primary**: Emerald (trading/growth theme)
- **Secondary**: Blue, Purple, Amber for accents
- **Neutral**: Slate colors for text and backgrounds

### Typography
- **Headings**: Geist Sans (bold, modern)
- **Body**: Geist Sans (readable, clean)
- **Code**: Geist Mono (monospace)

### Components
All components are built with:
- Accessibility in mind
- Dark mode support
- Responsive design
- Type safety

## 📝 Contributing

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Add comments for complex logic

### Git Workflow
1. Create feature branches from main
2. Use descriptive commit messages
3. Test changes before pushing
4. Create pull requests for review

## 📄 License

This project is proprietary software for StockMento platform.

## 📞 Support

For development questions or issues, please refer to:
- TypeScript documentation for type issues
- Next.js documentation for framework questions
- Tailwind CSS documentation for styling
- Radix UI documentation for components

---

**StockMento** - Empowering Pakistani investors through comprehensive stock market education.