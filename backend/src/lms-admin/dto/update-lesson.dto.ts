import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto';
import { IsOptional, IsString } from 'class-validator';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class UpdateLessonDto extends PartialType(CreateLessonDto) {
  @IsOptional()
  @IsString()
  labId?: string;

  @IsOptional()
  @IsString()
  quizId?: string;
}
