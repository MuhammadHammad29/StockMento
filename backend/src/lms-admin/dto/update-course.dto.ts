import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { IsBoolean, IsOptional } from 'class-validator';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
