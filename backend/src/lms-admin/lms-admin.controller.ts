import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LmsAdminService } from './lms-admin.service';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class LmsAdminController {
  constructor(private readonly service: LmsAdminService) {}

  @Get()
  list() {
    return this.service.listCourses();
  }

  @Post()
  createCourse(@Body() dto: CreateCourseDto) {
    return this.service.createCourse(dto);
  }

  @Get(':courseId')
  getCourse(@Param('courseId') courseId: string) {
    return this.service.getCourseOrThrow(courseId);
  }

  @Patch(':courseId')
  updateCourse(
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.service.updateCourse(courseId, dto);
  }

  @Delete(':courseId')
  deleteCourse(@Param('courseId') courseId: string) {
    return this.service.deleteCourse(courseId);
  }

  @Post(':courseId/sections')
  createSection(
    @Param('courseId') courseId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.service.createSection(courseId, dto);
  }

  @Patch(':courseId/sections/:sectionId')
  updateSection(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.service.updateSection(courseId, sectionId, dto);
  }

  @Patch(':courseId/sections')
  reorderSections(
    @Param('courseId') courseId: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    return this.service.reorderSections(courseId, dto);
  }

  @Delete(':courseId/sections/:sectionId')
  deleteSection(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.service.deleteSection(courseId, sectionId);
  }

  @Post(':courseId/sections/:sectionId/lessons')
  createLesson(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.service.createLesson(courseId, sectionId, dto);
  }

  @Patch(':courseId/sections/:sectionId/lessons/:lessonId')
  updateLesson(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.service.updateLesson(courseId, sectionId, lessonId, dto);
  }

  @Patch(':courseId/sections/:sectionId/lessons')
  reorderLessons(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderLessonsDto,
  ) {
    return this.service.reorderLessons(courseId, sectionId, dto);
  }

  @Delete(':courseId/sections/:sectionId/lessons/:lessonId')
  deleteLesson(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.service.deleteLesson(courseId, sectionId, lessonId);
  }
}
