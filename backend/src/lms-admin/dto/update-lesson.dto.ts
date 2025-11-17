import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {
  @IsOptional()
  @IsString()
  labId?: string;

  @IsOptional()
  @IsString()
  quizId?: string;
}
