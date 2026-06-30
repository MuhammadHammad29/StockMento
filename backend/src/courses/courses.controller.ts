import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
// Controller for handling course-related requests
@Controller('courses')
export class CoursesController { 
  constructor(private readonly coursesService: CoursesService) {} // Injecting the CoursesService to handle business logic related to courses

  @Get() // Endpoint to list all published courses
  list() { 
    return this.coursesService.listPublishedCourses();
  }
// courses the current user is enrolled in
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student') // Only students can access this endpoint
  @Get('me/enrollments') // Endpoint to list the courses the current user is enrolled in
  listMyEnrollments(@CurrentUser() user: JwtPayload) { // Get the current user's information from the JWT payload
    return this.coursesService.listUserEnrollments(user.sub); // Call the service method to get the list of enrollments for the current user
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get('me/streak')
  getLearningStreak(@CurrentUser() user: JwtPayload) {
    return this.coursesService.getLearningStreak(user.sub);
  }
// Endpoint to get the recent activity of the current user
  @UseGuards(JwtAuthGuard, RolesGuard) // Only authenticated users can access this endpoint
  @Roles('student') // Only students can access this endpoint
  @Get('me/activity') // Endpoint to get the recent activity of the current user  
  getRecentActivity(@CurrentUser() user: JwtPayload) { // Get the current user's information from the JWT payload
    return this.coursesService.getRecentActivity(user.sub); // Call the service method to get the recent activity for the current user
  }
// Get the enrollment details of the current user for a specific course
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get(':courseId/enrollment')
  getMyEnrollment(
    @Param('courseId') courseId: string, // Get the course ID from the request parameters
    @CurrentUser() user: JwtPayload, // Get the current user's information from the JWT payload
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get(':courseId/progress')
  getProgress(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coursesService.getCourseProgress(courseId, user.sub);
  }

  @Get(':courseId/lessons/:lessonId')
  getLessonDetail(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.coursesService.getLessonDetail(courseId, lessonId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Put(':courseId/lessons/:lessonId/progress')
  updateLessonProgress(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coursesService.updateLessonProgress(
      courseId,
      lessonId,
      user.sub,
      dto.status,
    );
  }

  @Get(':courseId')
  getCourse(@Param('courseId') courseId: string) {
    return this.coursesService.getCourseDetail(courseId);
  }
}
