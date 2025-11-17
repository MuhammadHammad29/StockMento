import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, CourseEnrollmentStatus } from '@prisma/client';
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
