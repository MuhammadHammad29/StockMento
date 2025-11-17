import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list() {
    return this.coursesService.listPublishedCourses();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get('me/enrollments')
  listMyEnrollments(@CurrentUser() user: JwtPayload) {
    return this.coursesService.listUserEnrollments(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get(':courseId/enrollment')
  getMyEnrollment(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coursesService.getUserEnrollment(courseId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Post(':courseId/enroll')
  enroll(@Param('courseId') courseId: string, @CurrentUser() user: JwtPayload) {
    return this.coursesService.enrollInCourse(courseId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Delete(':courseId/enroll')
  drop(@Param('courseId') courseId: string, @CurrentUser() user: JwtPayload) {
    return this.coursesService.dropEnrollment(courseId, user.sub);
  }

  @Get(':courseId/lessons/:lessonId')
  getLessonDetail(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.coursesService.getLessonDetail(courseId, lessonId);
  }

  @Get(':courseId')
  getCourse(@Param('courseId') courseId: string) {
    return this.coursesService.getCourseDetail(courseId);
  }
}
