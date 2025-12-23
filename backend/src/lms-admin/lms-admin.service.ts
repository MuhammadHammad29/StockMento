import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  CreateLessonDto,
  UpdateLessonDto,
  ReorderLessonsDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LmsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses() {
    return this.prisma.course.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: {
                lesson: {
                  include: {
                    video: true,
                    text: true,
                    quizLink: {
                      include: {
                        quiz: {
                          include: {
                            questions: {
                              orderBy: { position: 'asc' },
                              include: { choices: true },
                            },
                          },
                        },
                      },
                    },
                    labLink: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createCourse(dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException('Slug already exists.');
    }
    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        level: dto.level,
        mediaUrl: dto.mediaUrl,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  async getCourseOrThrow(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              include: {
                lesson: {
                  include: {
                    video: true,
                    text: true,
                    quizLink: {
                      include: {
                        quiz: {
                          include: {
                            questions: {
                              orderBy: { position: 'asc' },
                              include: { choices: true },
                            },
                          },
                        },
                      },
                    },
                    labLink: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async updateCourse(courseId: string, dto: UpdateCourseDto) {
    if (dto.slug) {
      const slugOwner = await this.prisma.course.findUnique({
        where: { slug: dto.slug },
      });
      if (slugOwner && slugOwner.id !== courseId) {
        throw new BadRequestException('Slug already exists.');
      }
    }
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...dto,
        publishedAt:
          dto.isPublished === undefined
            ? undefined
            : dto.isPublished
              ? new Date()
              : null,
      },
    });
  }

  async deleteCourse(courseId: string) {
    return this.prisma.course.delete({ where: { id: courseId } });
  }

  async createSection(courseId: string, dto: CreateSectionDto) {
    await this.getCourseOrThrow(courseId);
    const nextPosition = await this.prisma.courseSection.count({
      where: { courseId },
    });
    return this.prisma.courseSection.create({
      data: {
        courseId,
        title: dto.title,
        position: dto.position ?? nextPosition + 1,
      },
    });
  }

  async updateSection(
    courseId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    await this.ensureSection(courseId, sectionId);
    return this.prisma.courseSection.update({
      where: { id: sectionId },
      data: dto,
    });
  }

  async reorderSections(courseId: string, dto: ReorderSectionsDto) {
    await this.getCourseOrThrow(courseId);
    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        dto.sections.map(({ sectionId }, index) =>
          tx.courseSection.update({
            where: { id: sectionId },
            data: { position: -(index + 1) },
          }),
        ),
      );
      await Promise.all(
        dto.sections.map(({ sectionId, position }) =>
          tx.courseSection.update({
            where: { id: sectionId },
            data: { position },
          }),
        ),
      );
    });
  }

  async deleteSection(courseId: string, sectionId: string) {
    await this.ensureSection(courseId, sectionId);
    return this.prisma.courseSection.delete({ where: { id: sectionId } });
  }

  async createLesson(
    courseId: string,
    sectionId: string,
    dto: CreateLessonDto,
  ) {
    await this.ensureSection(courseId, sectionId);
    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          title: dto.title,
          contentType: dto.contentType,
          durationMinutes: dto.durationMinutes,
        },
      });

      const nextPosition =
        dto.position ??
        (((await tx.courseLesson.aggregate({
          where: { sectionId },
          _max: { position: true },
        }))._max.position ?? 0) + 1);

      await tx.courseLesson.create({
        data: {
          courseId,
          sectionId,
          lessonId: lesson.id,
          position: nextPosition,
        },
      });

      await this.upsertLessonContent(tx, lesson.id, dto);
      return lesson;
    });
  }

  async updateLesson(
    courseId: string,
    sectionId: string,
    lessonId: string,
    dto: UpdateLessonDto,
  ) {
    await this.ensureLesson(courseId, sectionId, lessonId);
    if (dto.contentType === undefined || dto.durationMinutes === undefined) {
      throw new BadRequestException(
        'contentType and durationMinutes are required to update a lesson.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.LessonUpdateInput = {};
      if (dto.title !== undefined) {
        updateData.title = dto.title;
      }
      if (dto.contentType !== undefined) {
        updateData.contentType = dto.contentType;
      }
      if (dto.durationMinutes !== undefined) {
        updateData.durationMinutes = dto.durationMinutes;
      }
      const lesson = await tx.lesson.update({
        where: { id: lessonId },
        data: updateData,
      });
      await this.upsertLessonContent(tx, lesson.id, dto);
      return lesson;
    });
  }

  async reorderLessons(
    courseId: string,
    sectionId: string,
    dto: ReorderLessonsDto,
  ) {
    await this.ensureSection(courseId, sectionId);
    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        dto.lessons.map(({ lessonId }, index) =>
          tx.courseLesson.update({
            where: { courseId_lessonId: { courseId, lessonId } },
            data: { position: -(index + 1) },
          }),
        ),
      );
      await Promise.all(
        dto.lessons.map(({ lessonId, position }) =>
          tx.courseLesson.update({
            where: { courseId_lessonId: { courseId, lessonId } },
            data: { position },
          }),
        ),
      );
    });
  }

  async deleteLesson(courseId: string, sectionId: string, lessonId: string) {
    await this.ensureLesson(courseId, sectionId, lessonId);
    return this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  private async ensureSection(courseId: string, sectionId: string) {
    const section = await this.prisma.courseSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.courseId !== courseId) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  private async ensureLesson(
    courseId: string,
    sectionId: string,
    lessonId: string,
  ) {
    const link = await this.prisma.courseLesson.findUnique({
      where: { courseId_lessonId: { courseId, lessonId } },
    });
    if (!link || link.sectionId !== sectionId) {
      throw new NotFoundException('Lesson not found');
    }
  }

  private async upsertLessonContent(
    tx: Prisma.TransactionClient,
    lessonId: string,
    dto: CreateLessonDto | UpdateLessonDto,
  ) {
    const contentType = dto.contentType;
    if (!contentType) {
      throw new BadRequestException(
        'contentType is required for lesson content.',
      );
    }
    if (dto.durationMinutes === undefined) {
      throw new BadRequestException(
        'durationMinutes is required for lesson content.',
      );
    }
    const durationMinutes = dto.durationMinutes;
    const readTimeMinutes = dto.readTimeMinutes ?? durationMinutes;
    const durationSeconds = dto.durationSeconds ?? durationMinutes * 60;
    if (contentType !== 'quiz') {
      await this.removeQuiz(tx, lessonId);
    }
    switch (contentType) {
      case 'text':
        await tx.lessonText.upsert({
          where: { lessonId },
          update: {
            bodyHtml: dto.bodyHtml ?? '',
            readTimeMinutes,
          },
          create: {
            lessonId,
            bodyHtml: dto.bodyHtml ?? '',
            readTimeMinutes,
          },
        });
        break;
      case 'video':
        await tx.lessonVideo.upsert({
          where: { lessonId },
          update: {
            videoUrl: dto.videoUrl ?? '',
            thumbnailUrl: dto.thumbnailUrl,
            durationSeconds,
            transcript: dto.transcript,
          },
          create: {
            lessonId,
            videoUrl: dto.videoUrl ?? '',
            thumbnailUrl: dto.thumbnailUrl,
            durationSeconds,
            transcript: dto.transcript,
          },
        });
        break;
      case 'quiz':
        await this.upsertQuiz(tx, lessonId, dto);
        break;
      default:
        break;
    }
  }

  private async removeQuiz(tx: Prisma.TransactionClient, lessonId: string) {
    const existing = await tx.lessonQuiz.findUnique({
      where: { lessonId },
    });
    if (!existing) {
      return;
    }
    await tx.lessonQuiz.delete({ where: { lessonId } });
    await tx.quiz.delete({ where: { id: existing.quizId } }).catch(() => {
      /* ignore */
    });
  }

  private async upsertQuiz(
    tx: Prisma.TransactionClient,
    lessonId: string,
    dto: CreateLessonDto | UpdateLessonDto,
  ) {
    const quizInput = dto.quiz;
    if (!quizInput) {
      throw new BadRequestException('Quiz payload is required.');
    }
    if (!quizInput.questions?.length) {
      throw new BadRequestException('Quiz must include at least one question.');
    }
    const normalizedQuestions = quizInput.questions.map((question) => {
      if (!question.choices?.length) {
        throw new BadRequestException(
          'Each quiz question requires at least one choice.',
        );
      }
      if (!question.choices.some((choice) => choice.isCorrect)) {
        throw new BadRequestException(
          'Each quiz question must have at least one correct choice.',
        );
      }
      return question;
    });

    await this.removeQuiz(tx, lessonId);

    const quiz = await tx.quiz.create({
      data: {
        title: quizInput.title,
        passScore: quizInput.passScore,
      },
    });

    await Promise.all(
      normalizedQuestions.map((question, index) =>
        tx.quizQuestion.create({
          data: {
            quizId: quiz.id,
            promptHtml: question.promptHtml,
            type: question.type,
            position: index + 1,
            points: question.points,
            choices: {
              create: question.choices.map((choice) => ({
                choiceHtml: choice.choiceHtml,
                isCorrect: choice.isCorrect,
              })),
            },
          },
        }),
      ),
    );

    await tx.lessonQuiz.upsert({
      where: { lessonId },
      update: { quizId: quiz.id },
      create: { lessonId, quizId: quiz.id },
    });
  }
}
