import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  publishedCourses: number;
  totalLessons: number;
  totalSections: number;
  avgCompletionRate: number;
  completedEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
  totalEnrollments: number;
};

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary() {
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalLessons,
      totalSections,
      enrollmentAggregate,
      activeEnrollments,
      completedEnrollments,
    ] = await this.prisma.$transaction([
      this.prisma.identity.count(),
      this.prisma.identity.count({
        where: { status: 'active' },
      }),
      this.prisma.course.count(),
      this.prisma.course.count({
        where: { isPublished: true },
      }),
      this.prisma.lesson.count(),
      this.prisma.courseSection.count(),
      this.prisma.courseEnrollment.aggregate({
        _avg: { progressPercent: true },
        _count: { _all: true },
      }),
      this.prisma.courseEnrollment.count({
        where: { status: 'active' },
      }),
      this.prisma.courseEnrollment.count({
        where: { status: 'completed' },
      }),
    ]);

    const totalEnrollments = enrollmentAggregate._count._all;
    const avgCompletionRate = this.resolveAverageCompletion(
      enrollmentAggregate._avg.progressPercent,
    );
    const completionRate = this.resolveCompletionRate(
      completedEnrollments,
      activeEnrollments,
    );

    const recentUsersRaw = await this.prisma.identity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        profile: true,
      },
    });

    const recentUsers = recentUsersRaw.map((user) => ({
      id: user.id,
      name:
        [user.profile?.firstName ?? '', user.profile?.lastName ?? '']
          .join(' ')
          .trim() || user.email,
      email: user.email,
      status: user.status,
      joinedAt: user.createdAt,
      avatarUrl: user.profile?.avatarUrl ?? null,
    }));

    const enrollmentFeed = await this.prisma.courseEnrollment.findMany({
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
      take: 6,
      include: {
        course: {
          select: {
            title: true,
            level: true,
            createdAt: true,
          },
        },
        user: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });

    const recentActivity = enrollmentFeed.slice(0, 4).map((record) => {
      const timestamp =
        record.completedAt ?? record.startedAt ?? record.course.createdAt;

      return {
        id: record.id,
        userName:
          [
            record.user.profile?.firstName ?? '',
            record.user.profile?.lastName ?? '',
          ]
            .join(' ')
            .trim() || record.user.email,
        courseTitle: record.course.title,
        progressPercent: record.progressPercent ?? 0,
        status: record.status,
        timestamp,
        action: this.resolveActivityAction(record.status),
      };
    });

    const recentEnrollments = enrollmentFeed.map((record) => ({
      id: record.id,
      courseTitle: record.course.title,
      studentName:
        [
          record.user.profile?.firstName ?? '',
          record.user.profile?.lastName ?? '',
        ]
          .join(' ')
          .trim() || record.user.email,
      timestamp:
        record.startedAt ?? record.completedAt ?? record.course.createdAt,
      level: record.course.level,
      status: record.status,
    }));

    const stats: DashboardStats = {
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalLessons,
      totalSections,
      avgCompletionRate,
      completedEnrollments,
      activeEnrollments,
      completionRate,
      totalEnrollments,
    };

    return {
      stats,
      recentUsers,
      recentActivity,
      recentEnrollments,
    };
  }

  private resolveAverageCompletion(value?: Prisma.Decimal | null) {
    if (!value) {
      return 0;
    }
    const asNumber = Number(value);
    if (Number.isNaN(asNumber)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(asNumber)));
  }

  private resolveCompletionRate(completed: number, active: number): number {
    const total = completed + active;
    if (total === 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
  }

  private resolveActivityAction(status: string) {
    switch (status) {
      case 'completed':
        return 'Completed a course';
      case 'active':
        return 'In progress';
      default:
        return 'Enrollment updated';
    }
  }
}
