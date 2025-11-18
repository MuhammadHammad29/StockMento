import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  CourseEnrollmentStatus,
  LessonProgressStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const courseInclude = Prisma.validator<Prisma.CourseInclude>()({
  sections: {
    orderBy: { position: 'asc' },
    include: {
      lessons: {
        orderBy: { position: 'asc' },
        include: {
          lesson: {
            include: {
              text: true,
              video: true,
            },
          },
        },
      },
    },
  },
});

type CourseWithRelations = Prisma.CourseGetPayload<{
  include: typeof courseInclude;
}>;

const enrollmentInclude = Prisma.validator<Prisma.CourseEnrollmentInclude>()({
  course: {
    include: courseInclude,
  },
});

type EnrollmentWithCourse = Prisma.CourseEnrollmentGetPayload<{
  include: typeof enrollmentInclude;
}>;

const lessonDetailInclude = Prisma.validator<Prisma.CourseLessonInclude>()({
  section: true,
  course: {
    include: courseInclude,
  },
  lesson: {
    include: {
      text: true,
      video: true,
      quizLink: {
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { position: 'asc' },
                include: {
                  choices: true,
                },
              },
            },
          },
        },
      },
      labLink: {
        include: {
          lab: true,
        },
      },
    },
  },
});

type LessonDetailLink = Prisma.CourseLessonGetPayload<{
  include: typeof lessonDetailInclude;
}>;

type StudentActivityType =
  | 'course_enrolled'
  | 'course_completed'
  | 'lesson_completed';

type StudentActivityEvent = {
  id: string;
  type: StudentActivityType;
  courseId: string;
  courseTitle: string;
  lessonId?: string | null;
  lessonTitle?: string | null;
  timestamp: Date;
};
@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublishedCourses() {
    const courses = await this.prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { updatedAt: 'desc' },
      include: courseInclude,
    });
    return courses.map((course) => this.mapCourseSummary(course));
  }

  async getCourseDetail(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: courseInclude,
    });
    if (!course || !course.isPublished) {
      throw new NotFoundException('Course not found');
    }
    const summary = this.mapCourseSummary(course);
    return {
      ...summary,
      description: course.description,
      mediaUrl: course.mediaUrl,
      sections: course.sections.map((section) => ({
        id: section.id,
        title: section.title,
        position: section.position,
        lessons: section.lessons.map((sectionLesson) => ({
          id: sectionLesson.lessonId,
          title: sectionLesson.lesson.title,
          contentType: sectionLesson.lesson.contentType,
          durationMinutes: sectionLesson.lesson.durationMinutes,
          description: this.extractSummary(sectionLesson.lesson.text?.bodyHtml),
        })),
      })),
    };
  }

  async listUserEnrollments(userId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: enrollmentInclude,
    });

    return enrollments.map((enrollment) =>
      this.mapEnrollmentResponse(enrollment),
    );
  }

  async getLearningStreak(userId: string) {
    const progressEntries = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        status: {
          not: LessonProgressStatus.not_started,
        },
      },
      select: { updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (progressEntries.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        lastActivityDate: null,
      };
    }

    const startOfDayUTC = (value: Date) =>
      new Date(
        Date.UTC(
          value.getUTCFullYear(),
          value.getUTCMonth(),
          value.getUTCDate(),
        ),
      );

    const uniqueDayStrings = Array.from(
      new Set(
        progressEntries.map((entry) =>
          startOfDayUTC(entry.updatedAt).toISOString(),
        ),
      ),
    ).sort();

    const msInDay = 24 * 60 * 60 * 1000;
    let bestStreak = 0;
    let rollingStreak = 0;
    let previousDay: Date | null = null;

    uniqueDayStrings.forEach((iso) => {
      const current = new Date(iso);
      if (!previousDay) {
        rollingStreak = 1;
      } else {
        const diff = Math.round(
          (current.getTime() - previousDay.getTime()) / msInDay,
        );
        rollingStreak = diff === 1 ? rollingStreak + 1 : 1;
      }
      if (rollingStreak > bestStreak) {
        bestStreak = rollingStreak;
      }
      previousDay = current;
    });

    const activitySet = new Set(uniqueDayStrings);
    let currentStreak = 0;
    let cursor = startOfDayUTC(new Date());

    while (activitySet.has(cursor.toISOString())) {
      currentStreak += 1;
      cursor = new Date(cursor.getTime() - msInDay);
    }

    return {
      currentStreak,
      bestStreak,
      lastActivityDate:
        uniqueDayStrings.length > 0
          ? uniqueDayStrings[uniqueDayStrings.length - 1]
          : null,
    };
  }

  async getRecentActivity(userId: string) {
    const [lessonEvents, enrollmentEvents] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: {
          userId,
          status: LessonProgressStatus.completed,
          completedAt: { not: null },
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
        include: {
          lesson: {
            select: {
              title: true,
              courseLinks: {
                include: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.courseEnrollment.findMany({
        where: { userId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    const events: StudentActivityEvent[] = [];

    lessonEvents.forEach((entry) => {
      if (!entry.completedAt) {
        return;
      }
      const link = entry.lesson.courseLinks[0];
      if (!link) {
        return;
      }
      events.push({
        id: `lesson-${entry.id}`,
        type: 'lesson_completed',
        courseId: link.courseId,
        courseTitle: link.course.title,
        lessonId: entry.lessonId,
        lessonTitle: entry.lesson.title,
        timestamp: entry.completedAt,
      });
    });

    enrollmentEvents.forEach((enrollment) => {
      if (enrollment.startedAt) {
        events.push({
          id: `enroll-${enrollment.id}`,
          type: 'course_enrolled',
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          timestamp: enrollment.startedAt,
        });
      }
      if (enrollment.completedAt) {
        events.push({
          id: `complete-${enrollment.id}`,
          type: 'course_completed',
          courseId: enrollment.courseId,
          courseTitle: enrollment.course.title,
          timestamp: enrollment.completedAt,
        });
      }
    });

    return events
      .filter((event) => event.timestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map((event) => ({
        ...event,
        timestamp: event.timestamp.toISOString(),
      }));
  }

  async getUserEnrollment(courseId: string, userId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: enrollmentInclude,
    });

    return enrollment ? this.mapEnrollmentResponse(enrollment) : null;
  }

  async enrollInCourse(courseId: string, userId: string) {
    await this.ensureCourseIsPublished(courseId);

    const existing = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: enrollmentInclude,
    });

    if (existing) {
      if (existing.status === CourseEnrollmentStatus.dropped) {
        const reactivated = await this.prisma.courseEnrollment.update({
          where: { id: existing.id },
          data: {
            status: CourseEnrollmentStatus.active,
            startedAt: existing.startedAt ?? new Date(),
            completedAt: null,
          },
          include: enrollmentInclude,
        });
        return this.mapEnrollmentResponse(reactivated);
      }

      return this.mapEnrollmentResponse(existing);
    }

    const created = await this.prisma.courseEnrollment.create({
      data: {
        userId,
        courseId,
        status: CourseEnrollmentStatus.active,
        startedAt: new Date(),
        progressPercent: 0,
      },
      include: enrollmentInclude,
    });

    return this.mapEnrollmentResponse(created);
  }

  async dropEnrollment(courseId: string, userId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      include: enrollmentInclude,
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status === CourseEnrollmentStatus.dropped) {
      return this.mapEnrollmentResponse(enrollment);
    }

    const updated = await this.prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: CourseEnrollmentStatus.dropped,
      },
      include: enrollmentInclude,
    });

    return this.mapEnrollmentResponse(updated);
  }

  async getCourseProgress(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: courseInclude,
    });
    if (!course || !course.isPublished) {
      throw new NotFoundException('Course not found');
    }

    const lessonIds = course.sections.flatMap((section) =>
      section.lessons.map((sectionLesson) => sectionLesson.lessonId),
    );

    if (lessonIds.length === 0) {
      return {
        courseId,
        totalLessons: 0,
        completedLessons: 0,
        percentComplete: 0,
        sections: [],
        lessons: {},
      };
    }

    const progressEntries = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
      },
    });

    const progressMap = new Map(
      progressEntries.map((entry) => [entry.lessonId, entry]),
    );

    const sections = course.sections.map((section) => {
      const lessons = section.lessons.map((sectionLesson) => {
        const entry = progressMap.get(sectionLesson.lessonId);
        const status = entry?.status ?? LessonProgressStatus.not_started;
        return {
          id: sectionLesson.lessonId,
          title: sectionLesson.lesson.title,
          status,
          completedAt: entry?.completedAt ?? null,
        };
      });
      const completedLessons = lessons.filter(
        (lesson) => lesson.status === LessonProgressStatus.completed,
      ).length;
      return {
        id: section.id,
        title: section.title,
        position: section.position,
        totalLessons: lessons.length,
        completedLessons,
        lessons,
      };
    });

    const completedLessons = sections.reduce(
      (sum, section) => sum + section.completedLessons,
      0,
    );

    const lessonsRecord = Object.fromEntries(
      sections.flatMap((section) =>
        section.lessons.map((lesson) => [
          lesson.id,
          {
            status: lesson.status,
            completedAt: lesson.completedAt,
          },
        ]),
      ),
    );

    const percentComplete =
      lessonIds.length === 0
        ? 0
        : Math.round((completedLessons / lessonIds.length) * 100);

    return {
      courseId,
      totalLessons: lessonIds.length,
      completedLessons,
      percentComplete,
      sections,
      lessons: lessonsRecord,
    };
  }

  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    userId: string,
    status: LessonProgressStatus,
  ) {
    await this.ensureCourseIsPublished(courseId);

    const courseLesson = await this.prisma.courseLesson.findUnique({
      where: {
        courseId_lessonId: {
          courseId,
          lessonId,
        },
      },
    });

    if (!courseLesson) {
      throw new NotFoundException('Lesson not found');
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const now = new Date();

    await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        status,
        startedAt: now,
        completedAt: status === LessonProgressStatus.completed ? now : null,
      },
      update: {
        status,
        updatedAt: now,
        completedAt: status === LessonProgressStatus.completed ? now : null,
      },
    });

    await this.recalculateEnrollmentProgress(courseId, userId);

    return this.getCourseProgress(courseId, userId);
  }

  async getLessonDetail(courseId: string, lessonId: string) {
    const courseLesson = await this.prisma.courseLesson.findUnique({
      where: {
        courseId_lessonId: {
          courseId,
          lessonId,
        },
      },
      include: lessonDetailInclude,
    });

    if (!courseLesson || !courseLesson.course.isPublished) {
      throw new NotFoundException('Lesson not found');
    }

    return this.mapLessonDetail(courseLesson);
  }

  private mapCourseSummary(course: CourseWithRelations) {
    const lessons = course.sections.flatMap((section) =>
      section.lessons.map((sectionLesson) => sectionLesson.lesson),
    );
    const totalLessons = lessons.length;
    const durationMinutes = lessons.reduce(
      (sum, lesson) => sum + (lesson?.durationMinutes ?? 0),
      0,
    );

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      level: course.level,
      mediaUrl: course.mediaUrl,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      isPublished: course.isPublished,
      totalLessons,
      sectionsCount: course.sections.length,
      durationMinutes,
    };
  }

  private mapEnrollmentResponse(enrollment: EnrollmentWithCourse) {
    return {
      id: enrollment.id,
      status: enrollment.status,
      courseId: enrollment.courseId,
      progressPercent:
        enrollment.progressPercent !== null
          ? Number(enrollment.progressPercent)
          : null,
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt,
      course: this.mapCourseSummary(enrollment.course),
    };
  }

  private async ensureCourseIsPublished(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true },
    });

    if (!course || !course.isPublished) {
      throw new NotFoundException('Course not found');
    }
  }

  private async recalculateEnrollmentProgress(
    courseId: string,
    userId: string,
  ) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return null;
    }

    const lessonIds = await this.prisma.courseLesson.findMany({
      where: { courseId },
      select: { lessonId: true },
    });

    if (lessonIds.length === 0) {
      return this.prisma.courseEnrollment.update({
        where: { id: enrollment.id },
        data: {
          progressPercent: 0,
          status: CourseEnrollmentStatus.active,
          completedAt: null,
        },
      });
    }

    const completedLessons = await this.prisma.lessonProgress.count({
      where: {
        userId,
        lessonId: { in: lessonIds.map((lesson) => lesson.lessonId) },
        status: LessonProgressStatus.completed,
      },
    });

    const percent = Math.round((completedLessons / lessonIds.length) * 100);

    return this.prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent: percent,
        status:
          percent >= 100
            ? CourseEnrollmentStatus.completed
            : CourseEnrollmentStatus.active,
        completedAt: percent >= 100 ? new Date() : null,
      },
    });
  }

  private mapLessonDetail(link: LessonDetailLink) {
    const { lesson, section, course } = link;
    return {
      id: lesson.id,
      title: lesson.title,
      contentType: lesson.contentType,
      durationMinutes: lesson.durationMinutes,
      description: this.extractSummary(lesson.text?.bodyHtml),
      course: this.mapCourseSummary(course),
      section: {
        id: section.id,
        title: section.title,
        position: section.position,
      },
      text: lesson.text
        ? {
            bodyHtml: lesson.text.bodyHtml,
            readTimeMinutes: lesson.text.readTimeMinutes,
          }
        : null,
      video: lesson.video
        ? {
            videoUrl: lesson.video.videoUrl,
            thumbnailUrl: lesson.video.thumbnailUrl,
            durationSeconds: lesson.video.durationSeconds,
            transcript: lesson.video.transcript,
          }
        : null,
      quiz: lesson.quizLink
        ? {
            id: lesson.quizLink.quiz.id,
            title: lesson.quizLink.quiz.title,
            passScore: lesson.quizLink.quiz.passScore,
            questions: lesson.quizLink.quiz.questions.map((question) => ({
              id: question.id,
              promptHtml: question.promptHtml,
              type: question.type,
              points: question.points,
              choices: question.choices.map((choice) => ({
                id: choice.id,
                choiceHtml: choice.choiceHtml,
                isCorrect: choice.isCorrect,
              })),
            })),
          }
        : null,
      lab: lesson.labLink
        ? {
            id: lesson.labLink.lab.id,
            title: lesson.labLink.lab.title,
            labUrl: lesson.labLink.lab.labUrl,
            instructionsHtml: lesson.labLink.lab.instructionsHtml,
            metadata: lesson.labLink.lab.metadata,
          }
        : null,
    };
  }

  private extractSummary(html?: string | null) {
    if (!html) {
      return null;
    }
    const plain = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.slice(0, 180);
  }
}
