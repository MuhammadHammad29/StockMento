# Course Sections Feature Implementation

## Overview
Implemented a comprehensive course sections feature for the StockMento PSX Learning App, aligned with the database schema (`lms.course_sections` table). This feature allows courses to be organized into logical sections, each containing grouped lessons for better course structure and learning experience.

## Database Schema Alignment

### Database Tables Used
Based on the PostgreSQL schema in `db/schema.sql`:

```sql
CREATE TABLE lms.course_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  position int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_course_sections_course FOREIGN KEY (course_id) REFERENCES lms.courses(id) ON DELETE CASCADE,
  CONSTRAINT uq_course_sections_position UNIQUE (course_id, position)
);

CREATE TABLE lms.course_lessons (
  course_id uuid NOT NULL,
  section_id uuid NOT NULL,  -- Links lesson to section
  lesson_id uuid NOT NULL,
  position int NOT NULL,
  ...
);
```

## Implementation Details

### 1. Type Definitions (`lib/types.ts`)

#### New Interface: `CourseSection`
```typescript
export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  position: number;              // Order within the course
  lessons?: Lesson[];            // Lessons within this section
  totalLessons: number;          // Count of lessons
  totalDuration: number;         // Total duration in minutes
  description?: string;          // Optional description
  createdAt: Date;
  updatedAt: Date;
}
```

#### Updated `Course` Interface
- Added `sections?: CourseSection[]` field to include section relationships

#### Updated `Lesson` Interface
- Added `sectionId?: string` to link lesson to parent section
- Added `position: number` for position within section (aligned with DB schema)

### 2. Mock Data (`lib/mock-data.ts`)

Created comprehensive mock data for testing:

```typescript
export const mockCourseSections: CourseSection[] = [
  // 9 sections across 3 courses
  // PSX Fundamentals (3 sections)
  // Technical Analysis (3 sections)
  // Risk Management (3 sections)
];
```

#### Helper Functions Added
```typescript
// Get all sections for a course
export const getSectionsByCourseId = (courseId: string): CourseSection[]

// Get a specific section by ID
export const getSectionById = (sectionId: string): CourseSection | undefined

// Get all lessons within a section
export const getLessonsBySectionId = (sectionId: string): Lesson[]
```

### 3. Sections Page (`app/courses/[id]/sections/page.tsx`)

#### Features
- **Accordion Layout**: Collapsible sections using shadcn/ui Accordion component
- **Progress Tracking**: Shows section-level and overall course progress
- **Lesson Display**: Each section shows its lessons with status indicators
- **Responsive Design**: Mobile-first design with breakpoints for tablets and desktop
- **Interactive Elements**: 
  - Expandable/collapsible sections
  - Quick navigation to lessons
  - Visual progress bars
  - Status badges (completed, current, locked)

#### Key Components

**Section Header**:
- Section number badge
- Section title and description
- Lesson count and total duration
- Progress indicator (for enrolled users)

**Lesson List**:
- Lesson number (section.lesson format)
- Lesson type icon (Video, Text, Quiz)
- Lesson title
- Duration
- Status indicator (Completed ✓, Current ●, Locked 🔒)
- Action buttons (Continue/Review)

#### Progress Calculation
```typescript
const getSectionProgress = (sectionId: string) => {
  const sectionLessons = getLessonsBySectionId(sectionId)
  const completedCount = sectionLessons.filter(lesson => 
    userProgress.completedLessons.includes(lesson.id)
  ).length
  return Math.round((completedCount / sectionLessons.length) * 100)
}
```

### 4. Course Detail Page Updates (`app/courses/[id]/page.tsx`)

Added navigation to sections view:
- "View by Sections" button in course curriculum header
- Imports `getSectionsByCourseId` helper function

## User Experience Flow

### For Unenrolled Users
1. Visit course detail page
2. See course overview and lesson list
3. Click "View by Sections" to see structured curriculum
4. See all sections but cannot access lessons
5. "Enroll to Access" button displayed

### For Enrolled Users
1. Visit course with progress tracking enabled
2. Navigate to sections view
3. See overall progress bar at top
4. Each section shows:
   - Individual section progress
   - Completed/Total lesson count
   - Expandable lesson list
5. Click lessons to continue learning
6. Visual indicators show current position

## Visual Design

### Color Coding
- **Completed Lessons**: Green checkmark (✓)
- **Current Lesson**: Green dot (●) with emerald background
- **Locked Lessons**: Lock icon (🔒) with muted appearance
- **Video Lessons**: Blue icon
- **Text Lessons**: Gray icon
- **Quiz Lessons**: Purple icon

### Progress Indicators
- **Overall Progress**: Large progress bar with percentage
- **Section Progress**: Thin progress bar under section header
- **Lesson Count**: "X/Y completed" badge in emerald color

### Responsive Breakpoints
- **Mobile**: Stacked layout, compact spacing, essential info only
- **Tablet (sm)**: Wider cards, more spacing, show durations
- **Desktop (lg)**: Full sidebar, expanded content, all details visible

## File Structure
```
lib/
├── types.ts                        # Updated with CourseSection interface
└── mock-data.ts                    # Added section mock data & helpers

app/courses/[id]/
├── page.tsx                        # Updated with sections navigation
└── sections/
    └── page.tsx                    # NEW: Sections view page
```

## Mock Data Structure

### Sample Section
```typescript
{
  id: 'section-1-1',
  courseId: 'course-1',
  title: 'Introduction to PSX',
  position: 1,
  totalLessons: 3,
  totalDuration: 65,
  description: 'Get started with the basics of Pakistan Stock Exchange...',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-12-01'),
}
```

### Courses with Sections
- **PSX Fundamentals** (course-1): 3 sections, 8 lessons total
- **Technical Analysis** (course-2): 3 sections, 10 lessons total  
- **Risk Management** (course-3): 3 sections, 9 lessons total

## Future Enhancements

### Backend Integration
When connecting to NestJS backend:
1. Create section endpoints in course controller
2. Add section queries to Prisma service
3. Update lesson queries to include `section_id`
4. Implement section-based progress tracking

### Recommended API Endpoints
```typescript
GET    /courses/:id/sections           // Get all sections for a course
GET    /courses/:id/sections/:sectionId // Get specific section with lessons
POST   /courses/:id/sections           // Create new section (admin)
PATCH  /sections/:id                   // Update section (admin)
DELETE /sections/:id                   // Delete section (admin)
```

### Potential Features
- [ ] Drag-and-drop section reordering (admin)
- [ ] Section prerequisites (unlock sections sequentially)
- [ ] Section completion certificates
- [ ] Estimated time to complete section
- [ ] Section-level quizzes/assessments
- [ ] Downloadable section resources
- [ ] Section bookmarks/favorites
- [ ] Search within sections

## Testing

### Manual Testing Checklist
- [x] TypeScript compilation (no errors)
- [x] ESLint validation (no warnings)
- [x] Sections page loads correctly
- [x] Accordion expand/collapse works
- [x] Progress bars display correctly
- [x] Lesson navigation works
- [x] Responsive design on mobile
- [x] Breadcrumb navigation functional
- [x] Back to course overview works

### Test URLs
```
/courses/course-1/sections   # PSX Fundamentals (3 sections)
/courses/course-2/sections   # Technical Analysis (3 sections)
/courses/course-3/sections   # Risk Management (3 sections)
```

## Technical Notes

### Accordion Component
- Uses shadcn/ui `Accordion` with `type="multiple"` for independent section control
- Default expanded section: `section-1-1` (first section)
- Smooth animations for expand/collapse

### Performance Considerations
- Sections lazy-load lessons only when expanded (future optimization)
- Progress calculations memoized per section
- Efficient filtering using array methods

### Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support (accordion)
- Screen reader friendly status indicators

## Code Quality
- ✅ TypeScript strict mode compatible
- ✅ ESLint compliant
- ✅ Consistent code formatting
- ✅ Comprehensive comments
- ✅ Reusable helper functions
- ✅ Type-safe implementations

## Summary
Successfully implemented a complete course sections feature that:
1. Aligns with database schema (`lms.course_sections`)
2. Provides excellent user experience with visual progress tracking
3. Maintains responsive design across all devices
4. Integrates seamlessly with existing course structure
5. Ready for backend API integration
6. Follows best practices for React/Next.js development
