import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CourseEnrollmentStatus,
  LabRunStatus,
  LessonProgressStatus,
  Prisma,
} from '@prisma/client';
import type { JwtPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteLabDto } from './dto/complete-lab.dto';

@Injectable()
export class LabsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublishedLabs() {
    const labs = await this.prisma.lab.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    return labs.map((lab) => this.mapLabSummary(lab));
  }

  async getLab(slugOrId: string) {
    const lab = await this.findPublishedLab(slugOrId);

    return this.mapLabSummary(lab);
  }

  async startLab(slugOrId: string, user: JwtPayload) {
    const lab = await this.findPublishedLab(slugOrId);
    const lastRun = await this.prisma.labRun.findFirst({
      where: {
        userId: user.sub,
        labId: lab.id,
      },
      orderBy: { attemptNo: 'desc' },
    });

    if (
      lastRun &&
      (lastRun.status === LabRunStatus.started ||
        lastRun.status === LabRunStatus.completed)
    ) {
      return this.mapLabRunResult(lastRun);
    }

    const run = await this.prisma.labRun.create({
      data: {
        userId: user.sub,
        labId: lab.id,
        attemptNo: (lastRun?.attemptNo ?? 0) + 1,
        status: LabRunStatus.started,
      },
    });

    return this.mapLabRunResult(run);
  }

  async completeLab(slugOrId: string, user: JwtPayload, dto: CompleteLabDto) {
    const lab = await this.findPublishedLab(slugOrId);
    const lastRun = await this.prisma.labRun.findFirst({
      where: {
        userId: user.sub,
        labId: lab.id,
      },
      orderBy: { attemptNo: 'desc' },
    });

    const status =
      dto.status === 'failed' || dto.passed === false
        ? LabRunStatus.failed
        : LabRunStatus.completed;

    const completedTasks: Prisma.InputJsonObject = {
      tasks: dto.completedTasks ?? [],
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
    };

    const run = await this.prisma.$transaction(async (tx) => {
      const terminalData = {
        lessonId: dto.lessonId,
        status,
        completedTasks,
        totalTasks: dto.totalTasks,
        score:
          dto.score === undefined
            ? undefined
            : new Prisma.Decimal(dto.score),
        completedAt: new Date(),
      };

      const created =
        lastRun?.status === LabRunStatus.started
          ? await tx.labRun.update({
              where: { id: lastRun.id },
              data: terminalData,
            })
          : await tx.labRun.create({
              data: {
                userId: user.sub,
                labId: lab.id,
                attemptNo: (lastRun?.attemptNo ?? 0) + 1,
                ...terminalData,
              },
            });

      if (status === LabRunStatus.completed && dto.courseId && dto.lessonId) {
        await this.markLinkedLessonComplete(tx, user.sub, dto.courseId, dto.lessonId);
      }

      return created;
    });

    return this.mapLabRunResult(run);
  }

  private async markLinkedLessonComplete(
    tx: Prisma.TransactionClient,
    userId: string,
    courseId: string,
    lessonId: string,
  ) {
    const courseLesson = await tx.courseLesson.findUnique({
      where: {
        courseId_lessonId: {
          courseId,
          lessonId,
        },
      },
    });

    if (!courseLesson) {
      return;
    }

    const now = new Date();
    await tx.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        status: LessonProgressStatus.completed,
        startedAt: now,
        completedAt: now,
      },
      update: {
        status: LessonProgressStatus.completed,
        completedAt: now,
      },
    });

    const lessonIds = await tx.courseLesson.findMany({
      where: { courseId },
      select: { lessonId: true },
    });

    const totalLessons = lessonIds.length;
    if (totalLessons === 0) {
      return;
    }

    const completedLessons = await tx.lessonProgress.count({
      where: {
        userId,
        lessonId: { in: lessonIds.map((entry) => entry.lessonId) },
        status: LessonProgressStatus.completed,
      },
    });

    const percent = new Prisma.Decimal(
      Math.round((completedLessons / totalLessons) * 100),
    );

    await tx.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      create: {
        userId,
        courseId,
        status:
          completedLessons >= totalLessons
            ? CourseEnrollmentStatus.completed
            : CourseEnrollmentStatus.active,
        progressPercent: percent,
        startedAt: now,
        completedAt: completedLessons >= totalLessons ? now : null,
      },
      update: {
        status:
          completedLessons >= totalLessons
            ? CourseEnrollmentStatus.completed
            : CourseEnrollmentStatus.active,
        progressPercent: percent,
        completedAt: completedLessons >= totalLessons ? now : null,
      },
    });
  }

  private buildLabLookup(slugOrId: string): Prisma.LabWhereInput {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slugOrId,
      );

    const routePath = slugOrId.startsWith('/labs/')
      ? slugOrId
      : `/labs/${slugOrId}`;
    const lookup: Prisma.LabWhereInput[] = [{ slug: slugOrId }, { routePath }];

    if (isUuid) {
      lookup.unshift({ id: slugOrId });
    }

    return {
      isPublished: true,
      OR: lookup,
    };
  }

  private async findPublishedLab(slugOrId: string) {
    const lab = await this.prisma.lab.findFirst({
      where: this.buildLabLookup(slugOrId),
    });

    if (!lab) {
      throw new NotFoundException('Lab not found');
    }

    return lab;
  }

  private mapLabRunResult(run: {
    id: string;
    labId: string;
    attemptNo: number;
    status: LabRunStatus;
    completedAt: Date | null;
  }) {
    return {
      id: run.id,
      labId: run.labId,
      attemptNo: run.attemptNo,
      status: run.status,
      completedAt: run.completedAt,
    };
  }

  private mapLabSummary(lab: {
    id: string;
    slug: string;
    title: string;
    description: string;
    module: string;
    difficulty: string;
    estimatedMinutes: number;
    stockSymbol: string | null;
    routePath: string;
    labUrl: string;
    instructionsHtml: string;
    isPublished: boolean;
    sortOrder: number;
    metadata: Prisma.JsonValue | null;
  }) {
    return {
      id: lab.id,
      slug: lab.slug,
      title: lab.title,
      description: lab.description,
      module: lab.module,
      difficulty: lab.difficulty,
      estimatedMinutes: lab.estimatedMinutes,
      stockSymbol: lab.stockSymbol,
      routePath: lab.routePath,
      labUrl: lab.labUrl,
      instructionsHtml: lab.instructionsHtml,
      isPublished: lab.isPublished,
      sortOrder: lab.sortOrder,
      metadata: lab.metadata,
    };
  }
}
